"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
type Theme = "light" | "dark";
const ThemeContext = createContext({ theme: "light" as Theme, toggle: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "staywired-theme") {
        const next = event.newValue === "dark" ? "dark" : "light";
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.style.colorScheme = next;
        setTheme(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    setTheme(next);
    try { localStorage.setItem("staywired-theme", next); } catch { /* Session-only theme when storage is blocked. */ }
  }
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  return <button type="button" onClick={toggle} className="theme-toggle" aria-label="Dark theme" aria-pressed={theme === "dark"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
  </button>;
}
