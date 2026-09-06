import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "RepTrack", description: "Fast private gym workout tracking", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#0b0c0d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
