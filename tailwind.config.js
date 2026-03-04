/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FAF3EB",
          100: "#F5EDE0",
          200: "#F0E6D6",
          300: "#E8DCC8",
          400: "#D4C4B0",
          500: "#B0A090",
          600: "#8B7355",
          700: "#6B5D4D",
          800: "#5A4A3A",
          900: "#3A2E22",
        },
      },
    },
  },
  plugins: [],
};
