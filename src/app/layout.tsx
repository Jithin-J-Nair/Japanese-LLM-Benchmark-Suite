import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LanguageProvider } from "@/context/LanguageContext";
import { getServerLang } from "@/lib/server/i18n";

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans-jp",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-mono-jb",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return lang === "en"
    ? {
        title: "LLM-JP-Bench — Japanese LLM Benchmark Suite",
        description:
          "Quantitative evaluation harness comparing Japanese-capable LLMs across keigo rewriting, business email correction, summarization, translation, and OCR cleanup.",
      }
    : {
        title: "LLM-JP-Bench — 日本語LLMベンチマークスイート",
        description:
          "敬語・ビジネスメール・要約・翻訳・OCRクリーンアップの5タスクで日本語LLMを定量比較する評価ハーネス。",
      };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getServerLang();
  return (
    <html lang={lang} className={`${noto.variable} ${mono.variable}`}>
      <body className="antialiased">
        <LanguageProvider initialLanguage={lang}>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
