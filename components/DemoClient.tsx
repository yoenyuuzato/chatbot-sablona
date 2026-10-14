"use client";

import dynamic from "next/dynamic";

/** Demo běží jen v prohlížeči (čte #profile z URL a vkládá widget). */
export const DemoClient = dynamic(() => import("./Demo").then((m) => m.Demo), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100dvh" }} />,
});
