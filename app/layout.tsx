import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import ClientShell from "./ClientShell";

export const metadata: Metadata = {
  title: "JETSTREAM",
  description: "A private jet lifestyle simulator — fly the world, land somewhere better.",
  applicationName: "JETSTREAM",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "JETSTREAM" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
