/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        signal: '#00FF9C',
        danger: '#FF3B5C',
        amber: '#FFB020',
        violet: '#8B7FFF',
      },
    },
  },
  plugins: [],
};
