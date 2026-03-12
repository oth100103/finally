import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinAlly - AI Trading Workstation",
<<<<<<< HEAD
  description: "AI-powered trading workstation with live market data",
=======
  description: "AI-powered trading workstation with live market data and portfolio management",
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
