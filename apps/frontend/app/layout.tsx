import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI SDK v6 Example",
  description: "Example using @assistant-ui/react with AI SDK v6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-dvh`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
