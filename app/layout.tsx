import type { Metadata, Viewport } from "next";
import { clientConfig, getProfile } from "@/client.config";

const profile = getProfile(clientConfig.defaultProfile);
import "./globals.css";

export const metadata: Metadata = {
  title: `${profile.botName} | ${profile.companyName}`,
  description: `AI asistent – ${profile.companyName}`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: profile.theme.primary,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={clientConfig.locales[0]} className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
