import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TutorCrew — AI Exam Tutor",
  description: "AI-powered exam tutor with knowledge gap detection and spaced repetition",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
