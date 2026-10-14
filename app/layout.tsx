import type { Metadata, Viewport } from "next";
import { clientConfig } from "@/client.config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${clientConfig.botName} | ${clientConfig.companyName}`,
  description: `AI asistent – ${clientConfig.companyName}`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: clientConfig.theme.primary,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={clientConfig.locales[0]} className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
