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
        rugpull: {
          DEFAULT: "#A855F7",
          dim: "#5B2E8A",
          glow: "#C084FC",
        },
        smartmoney: {
          DEFAULT: "#3B82F6",
          dim: "#1E4A8A",
          glow: "#60A5FA",
        },
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
      boxShadow: {
        "glow-signal": "0 0 0 1px rgba(110,91,255,0.35), 0 0 24px rgba(139,123,255,0.20)",
        "glow-up": "0 0 0 1px rgba(34,197,94,0.35), 0 0 20px rgba(34,197,94,0.18)",
        "glow-down": "0 0 0 1px rgba(239,68,68,0.35), 0 0 20px rgba(239,68,68,0.18)",
        "glow-rugpull": "0 0 0 1px rgba(168,85,247,0.4), 0 0 20px rgba(168,85,247,0.22)",
        "glow-smartmoney": "0 0 0 1px rgba(59,130,246,0.4), 0 0 20px rgba(59,130,246,0.22)",
        "card": "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
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
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        dashFlow: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        ticker: "ticker 38s linear infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        fadeUp: "fadeUp 0.35s ease-out both",
        blink: "blink 1.4s ease-in-out infinite",
        dashFlow: "dashFlow 0.7s linear infinite",
        dashFlowSlow: "dashFlow 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
