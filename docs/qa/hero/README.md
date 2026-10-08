# Hero QA evidence

`scripts/qa/record-hero.mjs` overwrites the desktop, mobile and reduced-motion WebM recordings, mobile screenshot and `browser-evidence.json` on each run. Desktop scene screenshots are omitted to avoid duplicating the recordings. Temporary Playwright recordings are saved outside the repository and deleted after export. Legacy `raw/` output is ignored by Git.

The login desktop/mobile screenshots document the restored login layout. `joy-motion-study.jpg` is a reference study, not a runtime asset.

Keep one current named export per scenario. Avoid committing raw recordings, duplicate MP4 conversions or screenshots from superseded asset experiments. These files are QA evidence and are not served by the application.
