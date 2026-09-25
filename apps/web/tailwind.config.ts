import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Placeholder brand tokens — refine in the design system (Phase 0).
        brand: {
          DEFAULT: "#2563eb",
          fg: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
