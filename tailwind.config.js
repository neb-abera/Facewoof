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
    // The palette is abera.tech's, taken from its themePrimitives.ts: blue at
    // hue 210, near-black greys at hue 220. Written as hsl() rather than
    // converted to hex so the two stay legibly the same colours.
    themes: [
      {
        facewoof: {
          primary: 'hsl(210, 98%, 48%)',
          'primary-content': 'hsl(0, 0%, 100%)',

          secondary: 'hsl(220, 20%, 25%)',
          'secondary-content': 'hsl(220, 20%, 92%)',

          accent: 'hsl(210, 100%, 65%)',
          'accent-content': 'hsl(220, 35%, 6%)',

          neutral: 'hsl(220, 20%, 18%)',
          'neutral-content': 'hsl(220, 20%, 88%)',

          // Page, raised surface, and borders.
          'base-100': 'hsl(220, 35%, 4%)',
          'base-200': 'hsl(220, 30%, 7%)',
          'base-300': 'hsl(220, 20%, 14%)',
          'base-content': 'hsl(220, 20%, 88%)',

          info: 'hsl(210, 100%, 65%)',
          success: 'hsl(120, 44%, 53%)',
          warning: 'hsl(38, 92%, 50%)',
          error: 'hsl(0, 72%, 58%)',

          '--rounded-box': '0.75rem',
          '--rounded-btn': '0.5rem',
          '--border-btn': '1px'
        }
      }
    ],
    logs: false
  }
};
