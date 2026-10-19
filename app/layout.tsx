import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Jukebox",
  description: "Generate original songs and cover art, then play them with an AI DJ.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
