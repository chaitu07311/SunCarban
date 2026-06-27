import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f2",
          500: "#2a7b52",
          700: "#1f5c3e"
        }
      }
    }
  },
  plugins: []
};

export default config;
