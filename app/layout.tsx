import type { Metadata } from "next";
import { Instrument_Serif, Inter, Lekton } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bodyFont = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const headingFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const accentFont = Lekton({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lekton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ALDEA Client Statements",
  description: "Client statement access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${accentFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
