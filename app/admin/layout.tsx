import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Chatbot · administrace", template: "%s · Chatbot admin" },
  robots: { index: false, follow: false },
};

// Admin čte data za běhu (DB, cookie) – navigace smí čekat na server, nemusí být „instant“.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin">{children}</div>;
}
