import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { CurrentUserProvider } from "@/features/people/current-user";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "해석의뢰",
  description: "기구설계 엔지니어의 CFD 해석 의뢰를 접수하는 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <CurrentUserProvider>
          <AppShell>{children}</AppShell>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
