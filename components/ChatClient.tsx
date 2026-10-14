"use client";

import dynamic from "next/dynamic";

/** Chat běží jen v prohlížeči (iframe widgetu) – bez prerenderu. */
export const ChatClient = dynamic(() => import("./Chat").then((m) => m.Chat), {
  ssr: false,
  loading: () => <div style={{ height: "100dvh", background: "#fff" }} />,
});
