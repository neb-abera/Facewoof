/** @type {import('tailwindcss').Config} */
module.exports = {
  // The original glob was "./src/**/*.{html,js, jsx}". The space made the third
  // extension " jsx", which matches nothing, so tailwind never scanned a single
  // component. It went unnoticed because index.html pulled the tailwind CDN in,
  // which generates classes in the browser instead.
  content: ['./index.html', './src/**/*.{html,js,jsx}'],
  theme: {
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['garden'],
    logs: false
  }
};
