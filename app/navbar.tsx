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
    <button
      onClick={handleSwitchTheme}
      className="p-2 hover:bg-primary hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary cursor-pointer"
    >
      {theme === "dark" ? <FaMoon /> : <FaSun />}
    </button>
  );
};

export function Navbar() {
  return (
    <nav className="p-4 border-b border-primary dark:border-white">
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
          <a href="/">All Music </a>
        </li>
        <div className="ml-auto">
          <SwitchTheme />
        </div>
      </ul>
    </nav>
  );
}

export default Navbar;
