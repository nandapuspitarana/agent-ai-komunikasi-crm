const siteConfig = require('./src/config/site.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: siteConfig.theme.primary,
          hover: siteConfig.theme.primaryHover,
          light: siteConfig.theme.primaryLight,
          bg: siteConfig.theme.primaryBg,
        }
      }
    },
  },
  plugins: [],
};
