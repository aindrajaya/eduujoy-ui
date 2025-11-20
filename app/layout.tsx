import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduJoy - Personalized Learning Platform",
  description: "AI-powered learning platform with personalized paths and smart summarization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
