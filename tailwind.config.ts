import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        neon: "#00f2fe",
        violeta: "#4facfe",
        fondo: "#050713"
      },
      boxShadow: {
        neon: "0 0 24px rgba(0, 242, 254, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
