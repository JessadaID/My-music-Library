import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./navbar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MineTube",
  description: "Music player without AD",
  icons: {
    icon: "./main_icon.ico"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white/80 text-primary dark:bg-primary dark:text-white antialiased">
        <Providers>
          <Navbar />
          <main className="p-4 bg-white/80 dark:bg-primary max-w-7xl mx-auto">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

