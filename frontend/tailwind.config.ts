import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        emerald: { 300: "rgb(var(--status-success-rgb) / <alpha-value>)", 400: "rgb(var(--status-success-rgb) / <alpha-value>)" },
        amber: { 300: "rgb(var(--status-warning-rgb) / <alpha-value>)", 400: "rgb(var(--status-warning-rgb) / <alpha-value>)" },
        rose: { 300: "rgb(var(--status-danger-rgb) / <alpha-value>)", 400: "rgb(var(--status-danger-rgb) / <alpha-value>)" },
        orange: { 300: "rgb(var(--status-warning-rgb) / <alpha-value>)", 400: "rgb(var(--status-warning-rgb) / <alpha-value>)" },
        workspace: Object.fromEntries([50,100,200,300,400,500,600,700,800,850,900,950].map(n => [n, `rgb(var(--workspace-${n}) / <alpha-value>)`])),
        brand: Object.fromEntries([50,100,200,300,400,500,600,700,800,850,900,950].map(n => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])),
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card-rgb) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground-rgb) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover-rgb) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground-rgb) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground-rgb) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground-rgb) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted-rgb) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground-rgb) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive-rgb) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground-rgb) / <alpha-value>)",
        },
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        input: "rgb(var(--input-rgb) / <alpha-value>)",
        ring: "rgb(var(--ring-rgb) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
