import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  plugins: ["@tailwindcss/postcss"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
};

export default nextConfig;
