import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { IntroScreen } from "@/components/IntroScreen";

/*
  Two families, each with a job. Inter carries every word a reviewer reads.
  JetBrains Mono carries only what they audit: scores, line references, cap
  thresholds. A display serif was here before; it was decoration on a work
  surface and it went.
*/

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "QC Evaluator",
  description:
    "Score a kick-off or coaching call against the rubric it was written for, with every dimension carrying the transcript lines its score rests on.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full`}
      // A browser extension can inject attributes onto <html> before React
      // hydrates. This covers only this element's own attributes; a real
      // mismatch inside <body> is still reported.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {children}
        <IntroScreen />
      </body>
    </html>
  );
}
