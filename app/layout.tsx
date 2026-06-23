import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Referral Receipt — Healthcare Intake Automation",
  description:
    "Agentic referral-to-visit pipeline. Extracts structured fields, checks payer eligibility, and drafts patient outreach — with a full audit trace for every step. PHI-safe by design.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-canvas text-ink antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}