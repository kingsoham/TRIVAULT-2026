/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          950: '#060911',
          900: '#0A0F1D',
          850: '#0E162B',
          800: '#131F3A',
          700: '#1D2E54',
          cyan: '#06B6D4',
          cyanGlow: '#22D3EE',
          blue: '#3B82F6',
          emerald: '#10B981',
          danger: '#EF4444',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
