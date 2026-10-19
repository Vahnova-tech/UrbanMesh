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
      fontFamily: {
        sans: ['Inter', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--civic-shadow)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        card: "var(--radius-md)",
      },
      spacing: {
        um1: "var(--space-1)",
        um2: "var(--space-2)",
        um3: "var(--space-3)",
        um4: "var(--space-4)",
        um5: "var(--space-5)",
        um6: "var(--space-6)",
      },
    },
  },
  plugins: [],
};
