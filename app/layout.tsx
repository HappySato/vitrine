import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Vitrine — Northline Goods",
  description:
    "Taste-aware floor agent for an independent retailer. Recommendations from a Qloo-style taste graph, sandbox checkout, and shopkeeper replies served on AMD Instinct MI300X via vLLM and ROCm.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-foreground">{children}</body>
    </html>
  );
}
