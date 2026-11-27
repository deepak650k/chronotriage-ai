import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { ToastProvider } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Suspense } from "react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChronoTriage AI — Calm deadline & priority calendar for students",
  description:
    "Turn overlapping deadlines into a calm, prioritised plan: Must Do, Schedule Later, or Safe to Skip, with a clear reason for every call.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const botpressInject = process.env.NEXT_PUBLIC_BOTPRESS_INJECT_URL?.trim();
  const botpressConfig = process.env.NEXT_PUBLIC_BOTPRESS_CONFIG_URL?.trim();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <AppProvider>
          <ToastProvider>
            <Suspense fallback={<div className="h-14 border-b border-[var(--border)] bg-[var(--surface)]" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </AppProvider>

        {botpressInject && botpressConfig ? (
          <>
            <Script src={botpressInject} strategy="afterInteractive" />
            <Script src={botpressConfig} strategy="afterInteractive" />
          </>
        ) : null}
      </body>
    </html>
  );
}
