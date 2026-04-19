/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "lab-dark": "#1a1a2e",
        "lab-orange": "#FF8C00",
        "lab-cyan": "#00D4FF",
        "lab-bench": "#E8E8E8",
      },
      fontFamily: {
        mono: ["'Share Tech Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
