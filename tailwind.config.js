/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Coolors "Sky Blue Freshness": 05668D 427AA1 EBF2FA 679436 A5BE00 (+ derived tokens, see DESIGN.md)
        mist: '#EBF2FA', sheet: '#F7FAFD', rule: '#C9D8E6', 'rule-2': '#AFC4D6', tint: '#DCE8F4',
        ink: '#0B2A3C', 'ink-2': '#2C4859', muted: '#4F6B7D',
        baltic: { DEFAULT: '#05668D', deep: '#044E6C', soft: '#D3E6EF' },
        steel: { DEFAULT: '#427AA1', soft: '#DCE6F0' },
        sage: { DEFAULT: '#679436', deep: '#4E7329', soft: '#E1EBD3' },
        lime: { DEFAULT: '#A5BE00', soft: '#EEF3C4' },
        overdue: { DEFAULT: '#A63D2A', soft: '#F6E2DC' },
        partial: { DEFAULT: '#8A6100', soft: '#F4EAD0' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Devanagari"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        deva: ['"IBM Plex Sans Devanagari"', '"IBM Plex Sans"', 'sans-serif'],
      },
      borderRadius: { ctl: '10px', card: '14px' },
      boxShadow: { card: '0 1px 0 #C9D8E6, 0 8px 24px -16px rgba(11,42,60,.25)', pop: '0 18px 40px -20px rgba(11,42,60,.45)' },
      transitionTimingFunction: { snap: 'cubic-bezier(.2,.9,.25,1)' },
    },
  },
  plugins: [],
};
