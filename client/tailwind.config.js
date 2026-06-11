/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#1a3a2a',
        gold: '#c9a227',
        silver: '#a8a9ad',
        bronze: '#cd7f32',
      },
    },
  },
  plugins: [],
};
