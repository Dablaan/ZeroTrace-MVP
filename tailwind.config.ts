import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#14b8a6",
        "background-light": "#f8f6f6",
        "background-dark": "#0f172a",
      },
      fontFamily: {
        display: ["var(--font-public-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
