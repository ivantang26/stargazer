import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070B1A",
          900: "#0B1130",
          800: "#121A44",
          700: "#1B2559",
        },
        accent: {
          400: "#d9b36a",
          500: "#c99b3f",
          600: "#b98a2e",
        },
        paper: "#F7F4EC",
        ink: {
          900: "#1C2436",
          700: "#3A4258",
          500: "#5B6478",
          300: "#9BA3B8",
        },
        line: "#E4DED0",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "PingFang TC",
          "Microsoft JhengHei",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "72rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 25, 39, 0.05), 0 8px 24px rgba(11, 17, 48, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
