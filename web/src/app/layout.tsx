import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://space-clone.up.railway.app"),
  title: "Space Clone — 3D Space Cloning",
  description: "Clone any space into a navigable 3D world in minutes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Space Clone",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Space Clone — 3D Space Cloning",
    description: "Clone any space into a navigable 3D world in minutes",
    type: "website",
    siteName: "Space Clone",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Space Clone" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Space Clone — 3D Space Cloning",
    description: "Clone any space into a navigable 3D world in minutes",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
