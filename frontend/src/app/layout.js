import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "NVIDIA VSS + Twelve Labs Manufacturing Automation",
  description: "AI-powered video surveillance and analytics for manufacturing automation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <NavBar />
        {children}
      </body>
      <Script src="https://cdn.jsdelivr.net/npm/hls.js@latest" />
    </html>
  );
}
