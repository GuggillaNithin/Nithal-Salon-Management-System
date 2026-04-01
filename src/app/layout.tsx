import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { AuthSessionProvider } from "@/components/session-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-headline",
});

export const metadata: Metadata = {
  title: "Salon SaaS - Nithal",
  description: "Tenant-aware salon booking dashboard",
};

import { ToastProvider } from "@/components/ui/toast-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${manrope.variable}`}>
      <body className="min-h-full flex flex-col font-body">
        <AuthSessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
