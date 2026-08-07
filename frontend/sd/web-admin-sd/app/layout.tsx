import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SD Islam Al-Fakhir · Dashboard Admin SD",
  description: "Dashboard Admin SD - SD Islam Al-Fakhir, Sawangan Depok",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body className={`${inter.className} min-h-full bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
