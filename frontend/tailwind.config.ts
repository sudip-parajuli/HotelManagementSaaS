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
        emerald: { 300: "var(--status-success)", 400: "var(--status-success)" },
        amber: { 300: "var(--status-warning)", 400: "var(--status-warning)" },
        rose: { 300: "var(--status-danger)", 400: "var(--status-danger)" },
        orange: { 300: "var(--status-warning)", 400: "var(--status-warning)" },
        workspace: Object.fromEntries([50,100,200,300,400,500,600,700,800,850,900,950].map(n => [n, `rgb(var(--workspace-${n}) / <alpha-value>)`])),
        brand: Object.fromEntries([50,100,200,300,400,500,600,700,800,850,900,950].map(n => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])),
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
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
