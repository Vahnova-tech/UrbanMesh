/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        civic: {
          ink: "var(--civic-ink)",
          slate: "var(--civic-slate)",
          muted: "var(--civic-muted)",
          paper: "var(--civic-paper)",
          surface: "var(--civic-surface)",
          mist: "var(--civic-mist)",
          line: "var(--civic-line)",
          accent: "var(--civic-accent)",
          accentDark: "var(--civic-accent-dark)",
          pending: "var(--civic-pending)",
          pendingBg: "var(--civic-pending-bg)",
          verified: "var(--civic-verified)",
          verifiedBg: "var(--civic-verified-bg)",
          critical: "var(--civic-critical)",
          criticalBg: "var(--civic-critical-bg)",
        },
      },
      boxShadow: {
        card: "var(--civic-shadow)",
      },
      borderRadius: {
        card: "var(--radius-md)",
      },
    },
  },
  plugins: [],
};
