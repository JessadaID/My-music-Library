import type { Metadata } from "next";
import {  Pixelify_Sans} from "next/font/google";
import "./globals.css";
import Navbar from "./navbar";
import { Providers } from "./providers";
import NextFallimgStars from "./component/NextFallingStars"


const pixelify_Sans = Pixelify_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MineTube",
  description: "Music player without AD",
  icons:{
    icon:"./main_icon.ico"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={pixelify_Sans.className}
      >
        <Providers>
          <Navbar />
          <NextFallimgStars />
          <main className="p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
