"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

const POSTER = "/images/hero/wedding-poster.webp";
const VIDEO = "/videos/wedding-hero.mp4";

const MOTION_QUERY = "(min-width: 1024px)";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

export function PublicLandingHero() {
  const animated = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!animated) {
      root.dataset.scene = "static";
      root.dataset.theme = "dark";
      return;
    }
    const frame = root.querySelector<HTMLElement>(".wedding-hero__film");
    const media = root.querySelector<HTMLElement>(".wedding-hero__media");
    const introLeaves = Array.from(root.querySelectorAll<HTMLElement>(".botanical--intro"));
    const cardLeaves = Array.from(root.querySelectorAll<HTMLElement>(".botanical--card"));
    const nav = document.querySelector<HTMLElement>(".public-nav");
    if (!frame || !media) return;
    let timeline: gsap.core.Timeline;
    let resizeFrame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let frameWidth = frame.offsetWidth;
    let frameHeight = frame.offsetHeight;

    // Counter-scale the media within the transforming mask: a continuous cover
    // crop without stretching, replacing, or restarting the video element.
    const fitMedia = () => {
      const sx = Number(gsap.getProperty(frame, "scaleX")) || 1;
      const sy = Number(gsap.getProperty(frame, "scaleY")) || 1;
      const cover = Math.max((frameWidth * sx) / width, (frameHeight * sy) / height);
      const mx = cover / sx;
      const my = cover / sy;
      const x = (frameWidth - width * mx) / 2;
      const y = (frameHeight - height * my) / 2;
      media.style.transform = `translate3d(${x}px,${y}px,0) scale(${mx},${my})`;
    };
    const setMediaSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      frameWidth = frame.offsetWidth;
      frameHeight = frame.offsetHeight;
      media.style.width = `${width}px`;
      media.style.height = `${height}px`;
    };

    const context = gsap.context(() => {
      const bounds = frame.getBoundingClientRect();
      const heroBounds = root.getBoundingClientRect();
      setMediaSize();
      root.dataset.scene = "intro";
      root.dataset.theme = "light";
      gsap.set(frame, {
        // Align with the hero, regardless of the browser's restored scroll position.
        x: heroBounds.left - bounds.left,
        y: heroBounds.top - bounds.top,
        scaleX: width / frameWidth,
        scaleY: height / frameHeight,
        transformOrigin: "0 0",
      });
      fitMedia();
      gsap.set(".wedding-hero__copy--dark", { opacity: 0 });
      gsap.set(".wedding-hero__copy--light", { opacity: 1 });
      gsap.set(".wedding-hero__shade", { opacity: 1 });
      gsap.set(
        [".wedding-hero__invitation", ".wedding-hero__card-edge", ".wedding-hero__playback"],
        { opacity: 0 },
      );
      gsap.set(introLeaves, { y: -45, opacity: 0 });
      gsap.set(".botanical__bud", { scale: 0.15, opacity: 0 });
      gsap.set(".botanical__stem", { opacity: 0 });
      gsap.set(cardLeaves, { opacity: 0 });
      gsap.set(".reference-botanical__slice", { opacity: 0, y: 8 });
      gsap.set(".reference-botanical--occlusion", { opacity: 1 });
      gsap.set(".wedding-hero__gold-transition", { opacity: 0, zIndex: 35, scale: 0.65 });
      gsap.set(".wedding-hero__front-leaf", { opacity: 0, scale: 0.2 });
      timeline = gsap.timeline({
        onComplete: () => {
          root.dataset.scene = "settled";
          root.dataset.theme = "dark";
        },
      });
      timeline.call(
        () => {
          root.dataset.scene = "leaves";
        },
        [],
        1.0,
      );
      timeline.to(
        introLeaves,
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: "sine.inOut",
        },
        1.0,
      );
      timeline.to(
        ".botanical--intro .botanical__stem",
        { opacity: 0.5, duration: 0.8, stagger: 0.08 },
        1.0,
      );
      introLeaves.forEach((branch, index) => {
        const buds = Array.from(branch.querySelectorAll<HTMLElement>(".botanical__bud"));
        buds.forEach((bud, leafIndex) => {
          const angle = (leafIndex % 2 ? -1 : 1) * (9 + index * 2);
          const retained = index % 2 === 1;
          // Last leaf finishes exactly as the video reaches its card bounds.
          const startsAt = retained
            ? 1.95 +
              index * 0.02 +
              leafIndex * ((5.15 - 0.66 - 1.95 - index * 0.02) / Math.max(1, buds.length - 1))
            : 1.15 + index * 0.06 + leafIndex * 0.12;
          gsap.set(bud, { rotation: angle, scaleX: 0.3, scaleY: 0.12 });
          timeline.to(
            bud,
            {
              scaleX: 0.85 + (leafIndex % 3) * 0.08,
              scaleY: 1,
              rotation: 0,
              opacity: 0.64 + (leafIndex % 3) * 0.1,
              duration: retained ? 0.66 : 0.78,
              ease: "sine.inOut",
            },
            startsAt,
          );
          if (!retained)
            timeline.to(
              bud,
              {
                rotation: -angle * 0.35,
                x: (leafIndex % 2 ? -1 : 1) * 5,
                duration: 0.9,
                repeat: 1,
                yoyo: true,
                ease: "sine.inOut",
              },
              startsAt + 0.9,
            );
        });
        timeline.to(
          branch,
          {
            rotation: index % 2 ? 0 : 4,
            x: index % 2 ? -12 : 14,
            duration: 1.8,
            ease: "sine.inOut",
          },
          1.3 + index * 0.08,
        );
      });
      const retainedSlots = new Set([1, 3, 4]);
      introLeaves.forEach((branch, i) => {
        if (i % 2 === 1) {
          // Keep these exact elements alive: they travel into the invitation.
          const slot = i === 1 ? 1 : i === 3 ? 3 : 4;
          const destination = cardLeaves[slot];
          if (!destination) return;
          const target = destination.getBoundingClientRect();
          const scale = Math.min(
            target.width / branch.offsetWidth,
            target.height / branch.offsetHeight,
          );
          const card = root
            .querySelector<HTMLElement>(".wedding-hero__visual")!
            .getBoundingClientRect();
          const growth = branch.querySelector<HTMLElement>(".botanical__growth")!;
          const matrix = new DOMMatrixReadOnly(getComputedStyle(growth).transform);
          // Transform the stem base about the artwork center, then tuck that
          // exact point inside the card so the frame naturally hides the root.
          const localX = branch.offsetWidth * -0.44;
          const localY = branch.offsetHeight * 0.44;
          const baseX = branch.offsetWidth * 0.5 + matrix.a * localX + matrix.c * localY;
          const baseY = branch.offsetHeight * 0.5 + matrix.b * localX + matrix.d * localY;
          const anchorX = card.right - (slot === 4 ? 100 : 24);
          const anchorY = slot === 1 ? card.top + 45 : card.bottom - 28;
          gsap.set(branch, { transformOrigin: "0 0" });
          timeline.to(
            branch,
            {
              x: anchorX - root.getBoundingClientRect().left - branch.offsetLeft - baseX * scale,
              y: anchorY - root.getBoundingClientRect().top - branch.offsetTop - baseY * scale,
              scale,
              duration: 1.85,
              ease: "power3.inOut",
            },
            3.5,
          );
        } else {
          // A sideways gust carries the remaining foliage out of the viewport.
          timeline.to(
            branch,
            {
              x: i === 4 ? -window.innerWidth * 0.65 : -window.innerWidth * 0.5,
              y: i === 2 ? 75 : -65,
              rotation: i === 2 ? -38 : -28,
              duration: 1.8,
              ease: "sine.inOut",
            },
            3.5 + i * 0.035,
          );
          timeline.to(branch, { opacity: 0, duration: 0.45 }, 4.9);
        }
      });
      timeline.set(".botanical-layer--intro", { zIndex: 5 }, 5.35);
      timeline.call(
        () => {
          videoRef.current?.pause();
        },
        [],
        5.35,
      );
      timeline.to(
        ".reference-botanical--occlusion",
        { opacity: 0, duration: 0.85, ease: "sine.inOut" },
        4.8,
      );
      timeline.set(".reference-botanical--occlusion", { zIndex: 5 }, 5.65);
      timeline.to(
        introLeaves.filter((_, index) => index % 2 === 1),
        { opacity: 0, duration: 0.7 },
        4.65,
      );
      timeline.to(
        ".reference-botanical__slice",
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.03, ease: "sine.inOut" },
        3.8,
      );
      timeline.to(
        ".wedding-hero__gold-transition",
        { opacity: 0.85, scale: 1, duration: 1.7, ease: "sine.inOut" },
        3.65,
      );
      timeline.set(".wedding-hero__gold-transition", { zIndex: 5 }, 5.35);
      timeline.to(
        ".wedding-hero__front-leaf",
        { opacity: 0.86, scale: 1, duration: 0.8, stagger: 0.18, ease: "sine.inOut" },
        4.15,
      );
      const newCardLeaves = cardLeaves.filter((_, index) => !retainedSlots.has(index));
      timeline.call(
        () => {
          root.dataset.scene = "card-growing";
        },
        [],
        5.35,
      );
      timeline.to(
        newCardLeaves,
        {
          opacity: 1,
          stagger: 0.08,
          duration: 0.45,
          ease: "sine.inOut",
        },
        4.35,
      );
      timeline.to(
        newCardLeaves.map((branch) => branch.querySelector(".botanical__stem")),
        { opacity: 1, duration: 0.75, stagger: 0.07 },
        4.35,
      );
      newCardLeaves.forEach((branch, index) => {
        timeline.to(
          branch.querySelectorAll(".botanical__bud"),
          {
            scale: 1,
            opacity: 1,
            duration: 0.75,
            stagger: 0.12,
            ease: "sine.inOut",
          },
          4.6 + index * 0.1,
        );
      });
      timeline
        .call(
          () => {
            root.dataset.scene = "shrinking";
          },
          [],
          3.5,
        )
        .to(
          frame,
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 1.85,
            ease: "power3.inOut",
            onUpdate: fitMedia,
          },
          3.5,
        )
        .to(".wedding-hero__shade", { opacity: 0, duration: 0.9 }, 3.65)
        .to(".wedding-hero__copy--light", { opacity: 0, duration: 0.5 }, 3.9)
        .to(".wedding-hero__copy--dark", { opacity: 1, duration: 0.5 }, 3.9)
        .to(".wedding-hero__invitation", { opacity: 1, duration: 0.65 }, 4.4)
        .to(".wedding-hero__card-edge", { opacity: 1, duration: 0.45 }, 4.9)
        .to(".wedding-hero__playback", { opacity: 1, duration: 0.2 }, 5.15);
      if (nav) {
        timeline
          .to(nav, { opacity: 0, duration: 0.12 }, 3.85)
          .call(
            () => {
              root.dataset.theme = "dark";
            },
            [],
            3.97,
          )
          .to(nav, { opacity: 1, duration: 0.2 }, 3.97);
      }
    }, root);
    void videoRef.current?.play().catch(() => {
      /* Poster remains if autoplay is blocked. */
    });
    const resize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        timeline.progress(1);
        setMediaSize();
        fitMedia();
      });
    };
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", resize);
      context.revert();
      media.style.removeProperty("width");
      media.style.removeProperty("height");
      media.style.removeProperty("transform");
    };
  }, [animated]);

  return (
    <section
      ref={rootRef}
      className="wedding-hero"
      data-scene="initial"
      data-theme="dark"
      aria-labelledby="hero-heading"
    >
      <div className="wedding-hero__first-paint" aria-hidden="true">
        <Image src={POSTER} alt="" fill priority unoptimized sizes="100vw" />
        <div className="wedding-hero__shade" />
      </div>
      <BotanicalLayer intro />
      <div className="wedding-hero__copy-stack">
        <HeroCopy />
        <HeroCopy light />
      </div>
      <div className="wedding-hero__visual wedding-hero__visual--reference">
        <div className="wedding-hero__film">
          <div className="wedding-hero__media">
            {animated ? (
              <video
                ref={videoRef}
                src={VIDEO}
                poster={POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="wedding-hero__video"
                aria-hidden="true"
              />
            ) : (
              <Image
                src={POSTER}
                alt="Cô dâu và chú rể bên nhau trong ngày cưới"
                fill
                priority
                unoptimized
                sizes="(max-width: 1023px) 60vw, 30vw"
              />
            )}
            <div className="wedding-hero__shade" aria-hidden="true" />
          </div>
        </div>
        <div className="wedding-hero__invitation" aria-hidden="true">
          <span className="wedding-hero__invite-kicker">CHÚNG MÌNH SẮP CƯỚI</span>
          <span className="wedding-hero__couple">Minh &amp; Lan</span>
          <span className="wedding-hero__invite-rule" />
          <span className="wedding-hero__invite-date">18 · 10 · 2026</span>
          <p>
            Hẹn gặp bạn trong
            <br />
            ngày vui của chúng mình.
          </p>
          <span className="wedding-hero__invite-signature">Cùng viết tiếp câu chuyện yêu</span>
        </div>
        <div className="wedding-hero__card-edge" aria-hidden="true" />
        <BotanicalLayer />
        <ReferenceBotanicals />
        <div className="wedding-hero__gold-transition" aria-hidden="true">
          <Image src="/images/hero/botanical-gold.webp" alt="" fill unoptimized sizes="240px" />
        </div>
        <div className="wedding-hero__front-foliage" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className={`wedding-hero__front-leaf wedding-hero__front-leaf--${index}`}
            >
              <Image src="/images/hero/botanical-leaf.webp" alt="" fill unoptimized sizes="90px" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroCopy({ light = false }: { light?: boolean }) {
  const title = (
    <>
      Ngày vui của mình <span>gần nhau hơn.</span>
    </>
  );
  return (
    <div
      className={`wedding-hero__copy wedding-hero__copy--${light ? "light" : "dark"}`}
      aria-hidden={light || undefined}
    >
      <p className="wedding-hero__eyebrow">
        <span />
        Lời mời cho ngày mình thương
      </p>
      {light ? (
        <div className="wedding-hero__title">{title}</div>
      ) : (
        <h1 id="hero-heading" className="wedding-hero__title">
          {title}
        </h1>
      )}
      <p className="wedding-hero__description">
        Một lời mời thật riêng, để câu chuyện của hai bạn và những người thân yêu cùng gặp nhau.
      </p>
      <div className="wedding-hero__actions">
        {light ? (
          <>
            <span className="wedding-hero__primary-cta">
              Bắt đầu cùng InviteMe <ArrowRight size={16} />
            </span>
            <span className="wedding-hero__secondary-cta">Khám phá InviteMe</span>
          </>
        ) : (
          <>
            <Link href="/register" className="wedding-hero__primary-cta">
              Bắt đầu cùng InviteMe <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a href="#features" className="wedding-hero__secondary-cta">
              Khám phá InviteMe
            </a>
          </>
        )}
      </div>
      <p className="wedding-hero__note">Lưu giữ câu chuyện. Gửi trao lời mời. Cùng đón ngày vui.</p>
    </div>
  );
}

// The intro foliage belongs to the hero, never to the transforming video mask.
// Each branch is assembled from separate leaves; card growth overlaps the shrink.
function BotanicalLayer({ intro = false }: { intro?: boolean }) {
  return (
    <div
      className={`botanical-layer botanical-layer--${intro ? "intro" : "card"}`}
      aria-hidden="true"
    >
      {Array.from({ length: intro ? 4 : 6 }, (_, index) => (
        <div
          key={index}
          className={`botanical botanical--${intro ? "intro" : "card"} botanical--piece-${index}${intro && index === 1 ? " botanical--gold" : ""}${intro && index === 2 ? " botanical--flowers" : ""}`}
        >
          <div className="botanical__growth">
            <Image
              className="botanical__stem"
              src={
                (intro && index === 1) || (!intro && index >= 4)
                  ? "/images/hero/botanical-gold.webp"
                  : "/images/hero/botanical-stem-v2.webp"
              }
              alt=""
              fill
              unoptimized
              sizes={intro ? "40vw" : "220px"}
            />
            {Array.from(
              { length: intro ? ([5, 2, 4, 5][index] ?? 5) : index >= 4 ? 3 : 7 },
              (_, bud) => (
                <div key={bud} className={`botanical__bud botanical__bud--${bud}`}>
                  <Image
                    src={
                      (intro &&
                        (index === 1 ||
                          (index === 2 && bud !== 0) ||
                          (index === 0 && bud === 2) ||
                          (index === 3 && bud === 4))) ||
                      (!intro && (bud === 5 || index >= 4))
                        ? "/images/hero/botanical-flower.webp"
                        : "/images/hero/botanical-leaf.webp"
                    }
                    alt=""
                    fill
                    unoptimized
                    sizes={intro ? "140px" : "65px"}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReferenceBotanicals() {
  return (
    <>
      {["left", "back", "front", "occlusion"].map((layer) => (
        <div
          key={layer}
          className={`reference-botanical reference-botanical--${layer}`}
          aria-hidden="true"
        >
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              className="reference-botanical__slice"
              style={{
                clipPath: `inset(${(index * 100) / 12}% 0 ${100 - ((index + 1) * 100) / 12}% 0)`,
              }}
            >
              <Image
                src="/images/hero/reference-botanical-v1.webp"
                alt=""
                fill
                unoptimized
                sizes="900px"
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
