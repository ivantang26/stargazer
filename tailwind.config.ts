import type { Config } from "tailwindcss";

// Neutral zinc scale + one green accent. The legacy names (navy, paper, ink,
// line) are kept so workspace components pick up the palette unchanged.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0c0c0e",
          900: "#18181b",
          800: "#27272a",
          700: "#3f3f46",
        },
        accent: {
          400: "#3f9d73",
          500: "#1f7a55",
          600: "#18654a",
        },
        paper: "#fafaf9",
        ink: {
          900: "#18181b",
          700: "#3f3f46",
          500: "#5f5f68",
          300: "#a1a1aa",
        },
        line: "#e4e4e7",
        // Public-site semantic tokens; values (and dark mode) live in globals.css.
        ps: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          sunk: "var(--surface-2)",
          ink: "var(--ink)",
          muted: "var(--muted)",
          line: "var(--line)",
          accent: "var(--accent)",
          "accent-ink": "var(--accent-ink)",
          "accent-soft": "var(--accent-soft)",
          warn: "var(--warn)",
          "warn-soft": "var(--warn-soft)",
          danger: "var(--danger)",
          "danger-soft": "var(--danger-soft)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "PingFang TC",
          "Microsoft JhengHei",
          "Noto Sans TC",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: {
        content: "72rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(24, 24, 27, 0.04), 0 4px 16px rgba(24, 24, 27, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
