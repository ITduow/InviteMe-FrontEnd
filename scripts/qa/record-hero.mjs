import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

const toolDir = process.env.HERO_QA_TOOLS || path.join(os.tmpdir(), "inviteme-hero-qa");
const require = createRequire(path.join(toolDir, "package.json"));
const { chromium } = require("playwright");
const url = process.env.HERO_QA_URL || "http://localhost:3100/";
const out = path.resolve("docs/qa/hero");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const config of [
  { name: "desktop", width: 1440, height: 900, reducedMotion: "no-preference", animated: true },
  { name: "mobile", width: 390, height: 844, reducedMotion: "no-preference", animated: false },
  { name: "reduced-motion", width: 1440, height: 900, reducedMotion: "reduce", animated: true },
]) {
  const viewport = { width: config.width, height: config.height };
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: config.reducedMotion,
    isMobile: config.name === "mobile",
    hasTouch: config.name === "mobile",
    recordVideo: { dir: path.join(out, "raw"), size: viewport },
  });
  await context.addInitScript(() => {
    const seen = new WeakSet();
    const evidence = { added: 0, removed: 0, samples: [] };
    window.__heroEvidence = evidence;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          for (const video of [
            ...(node.matches("video") ? [node] : []),
            ...node.querySelectorAll("video"),
          ]) {
            if (!seen.has(video)) {
              seen.add(video);
              evidence.added++;
            }
          }
        }
        for (const node of record.removedNodes) {
          if (node.nodeType !== 1) continue;
          evidence.removed +=
            (node.matches("video") ? 1 : 0) + node.querySelectorAll("video").length;
        }
      }
    }).observe(document, { childList: true, subtree: true });
    const timer = setInterval(() => {
      const hero = document.querySelector(".wedding-hero");
      const video = document.querySelector("video");
      const frame = document.querySelector(".wedding-hero__film")?.getBoundingClientRect();
      if (hero)
        evidence.samples.push({
          ms: Math.round(performance.now()),
          scene: hero.dataset.scene,
          videoCount: document.querySelectorAll("video").length,
          time: video?.currentTime,
          paused: video?.paused,
          frame: frame?.toJSON(),
          overflow: document.documentElement.scrollWidth > innerWidth,
        });
      if (performance.now() > 7500) clearInterval(timer);
    }, 80);
  });
  const page = await context.newPage();
  const videoRequests = [];
  const errors = [];
  page.on("request", (request) => {
    if (/\.mp4(?:\?|$)/.test(request.url())) videoRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const recording = page.video();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (config.animated) {
    for (const [target, name] of [
      [350, "scene-1"],
      [3000, "scene-2"],
      [4700, "transition"],
      [8000, "scene-3"],
    ]) {
      const now = await page.evaluate(() => performance.now());
      await page.waitForTimeout(Math.max(0, target - now));
      await page.screenshot({ path: path.join(out, `${config.name}-${name}.png`) });
    }
  } else {
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(out, `${config.name}.png`), fullPage: true });
  }
  await page.waitForTimeout(1500);
  const evidence = await page.evaluate(() => ({
    ...window.__heroEvidence,
    mediaPreference: matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewport: { width: innerWidth, height: innerHeight },
    scene: document.querySelector(".wedding-hero").dataset.scene,
    videoCount: document.querySelectorAll("video").length,
    heading: document.querySelector("h1").textContent,
    headingFont: getComputedStyle(document.querySelector("h1")).fontFamily,
    bodyFont: getComputedStyle(document.body).fontFamily,
    fontsLoaded: document.fonts.status,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  results.push({ ...config, ...evidence, videoRequests, errors });
  await context.close();
  await recording.saveAs(path.join(out, `${config.name}.webm`));
}
await browser.close();
await writeFile(
  path.join(out, "browser-evidence.json"),
  JSON.stringify(
    { url, browser: "Playwright Chromium", recordedAt: new Date().toISOString(), results },
    null,
    2,
  ),
);
for (const result of results) {
  assert.equal(result.errors.length, 0, `${result.name}: browser errors`);
  assert.equal(result.overflow, false, `${result.name}: horizontal overflow`);
  if (result.animated) {
    assert.equal(result.added, 1, "Exactly one video node is created");
    assert.equal(result.removed, 0, "Video node is never remounted during the sequence");
    assert.equal(result.scene, "settled");
    assert(
      result.samples.some(
        (s) =>
          s.scene === "intro" &&
          Math.abs(s.frame.width - result.width) < 3 &&
          Math.abs(s.frame.height - result.height) < 3,
      ),
      "Scene 1 fills viewport",
    );
    assert(
      result.samples.some((s) => s.scene === "leaves"),
      "Watercolor entrance captured",
    );
    assert(
      result.samples.some((s) => s.scene === "shrinking"),
      "Shrink captured",
    );
    assert(result.samples.at(-1).time > 3, "Video actually played");
    assert.equal(result.samples.at(-1).paused, true, "Video pauses once the shrink completes");
  } else {
    assert.equal(result.videoCount, 0, "Static mode has no video node");
    assert.equal(result.videoRequests.length, 0, "Static mode makes no MP4 requests");
    assert.equal(result.scene, "static");
  }
}
console.log(
  JSON.stringify(
    results.map(({ name, scene, added, removed, videoCount, overflow, errors }) => ({
      name,
      scene,
      added,
      removed,
      videoCount,
      overflow,
      errors,
    })),
    null,
    2,
  ),
);
