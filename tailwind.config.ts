import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#08090D",
          surface: "#12141B",
          raised: "#181B24",
        },
        line: "#23262F",
        signal: {
          DEFAULT: "#6E5BFF",
          dim: "#443A99",
          glow: "#8B7BFF",
        },
        amber: {
          DEFAULT: "#FFB020",
          dim: "#8A6118",
        },
        up: "#22C55E",
        down: "#EF4444",
        ink: {
          DEFAULT: "#E6E8EE",
          muted: "#8A8F98",
          faint: "#565A64",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        ticker: "ticker 38s linear infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
