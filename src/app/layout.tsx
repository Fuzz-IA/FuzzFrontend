import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyClientProvider from "@/providers/privy-provider";
import QueryProvider from "@/providers/query-provider";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster";
import localFont from 'next/font/local';

const minecraft = localFont({
  src: 'Minecraft.ttf',
  variable: '--font-minecraft',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fuzzai",
  description: "fuzzai",
  icons: {
    icon: "/logoo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          defer
          data-domain="fuzzai.fun"
          src="https://plausible.io/js/script.js"
          
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${minecraft.variable} antialiased bg-black`}
      >
        <Toaster />
        <ThemeProvider defaultTheme="dark">
          <QueryProvider>
            <PrivyClientProvider>{children}</PrivyClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}