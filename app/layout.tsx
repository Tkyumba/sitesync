import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sitesync-green.vercel.app";
const description = "Job site tracking for home builders: every phase, every sub, and completion photos in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "SiteSync", template: "%s · SiteSync" },
  description,
  applicationName: "SiteSync",
  appleWebApp: { capable: true, title: "SiteSync", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "SiteSync",
    title: "SiteSync: Built for home builders",
    description,
  },
  twitter: { card: "summary_large_image", title: "SiteSync: Built for home builders", description },
  // Job links and the app itself are private, so keep them out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0F1117",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
