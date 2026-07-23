import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MobileNav } from "@/components/ui/MobileNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Messyman",
  description: "Understand your life through stories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased relative">
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 pb-16 md:pb-6">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
