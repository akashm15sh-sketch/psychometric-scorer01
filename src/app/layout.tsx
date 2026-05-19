import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PsychScore — Psychometric Assessment Scorer",
  description:
    "Automated scoring engine for self-reported psychometric questionnaires. Upload responses, define Likert scales, and download scored results instantly.",
  keywords: [
    "psychometric",
    "scoring",
    "questionnaire",
    "likert scale",
    "assessment",
    "psychology",
    "research tool",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
