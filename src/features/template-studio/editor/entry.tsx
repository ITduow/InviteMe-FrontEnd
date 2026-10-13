"use client";

import dynamic from "next/dynamic";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";

// Craft creates random node IDs on initialization; the editor is a browser-only workspace.
export const TemplateStudio = dynamic(
  () => import("./studio").then((module) => module.TemplateStudio),
  {
    ssr: false,
    loading: () => <main id="main-content">Đang mở template studio…</main>,
  },
);
