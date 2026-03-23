/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Fire palette
        flame:   '#FF4500',  // red-orange — Gas button, primary CTA
        ember:   '#FF6B00',  // mid orange — gradients, highlights
        spark:   '#FFB800',  // yellow-gold — achievements, streaks

        // Backgrounds (Twitter dark mode style)
        background: '#000000',
        surface:    '#0F0F0F',
        card:       '#1A1A1A',
        border:     '#2F2F2F',

        // Text
        'text-primary':   '#FFFFFF',
        'text-secondary': '#71767B',
        'text-tertiary':  '#3E4144',

        // Semantic
        gas:     '#FF4500',
        pass:    '#71767B',
        error:   '#F4212E',
        success: '#00BA7C',
      },
    },
  },
  plugins: [],
};
