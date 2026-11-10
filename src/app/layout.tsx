import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "ReflectCal — Can AI recognize when it is wrong?", template: "%s — ReflectCal" },
  description: "A reproducible research interface for studying AI self-reflection and self-reported confidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <SiteHeader />
        <main>{children}</main>
        <footer className="mx-auto mt-24 max-w-6xl border-t border-rule/70 px-5 py-8 text-xs leading-6 text-muted sm:px-8">
          ReflectCal M0 · A research demonstration. Anonymous visitor runs are not treated as study participation.
        </footer>
      </body>
    </html>
  );
}
