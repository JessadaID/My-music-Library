"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { FaSun } from "react-icons/fa";
import { FaMoon } from "react-icons/fa";

const SwitchTheme = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true));

  if (!mounted) {
    return null;
  }

  const handleSwitchTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <button onClick={handleSwitchTheme}>
      {theme === "dark" ? <FaMoon /> : <FaSun />}
    </button>
  );
};

export function Navbar() {
  return (
    <nav className="shadow-md p-4">
      <ul className="flex items-center space-x-4">
        <li>
          <a href="/">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-music"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
              <path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
              <path d="M9 17v-13h10v13" />
              <path d="M9 8h10" />
            </svg>
          </a>
        </li>
        <li>
          <a href="/Library">เพลงทั้งหมด </a>
        </li>
        <li>
          <a href="/Playlists">เพลย์ลิสต์ </a>
        </li>
        <li>
          <a href="/Favorites">เพลงโปรด </a>
        </li>
        <li>
          <a href="/Upload">เพิ่มเพลง </a>
        </li>
        <li>
          <a href="/register">ค้นหาเพลง </a>
        </li>
        <div className="ml-auto">
          <SwitchTheme />
        </div>
      </ul>
    </nav>
  );
}

export default Navbar;
