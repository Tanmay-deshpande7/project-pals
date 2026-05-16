/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./public/**/*.{html,js,jsx}", "./admin/**/*.{html,js,jsx}", "./events/**/*.{html,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        primary: '#8B5CF6',
        secondary: '#3B82F6',
        accent: '#F472B6',
        main: 'rgb(var(--color-text-main) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        glass: 'var(--glass-bg)',
      },
      backgroundImage: {
        'nebula-gradient': 'linear-gradient(to right, #4c1d95, #2563eb)',
      },
      borderColor: {
        'divider': 'var(--border-divider)',
        'divider-strong': 'var(--border-divider-strong)',
      }
    }
  },
  plugins: [],
}
