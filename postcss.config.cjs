// postcss.config.cjs (CORREGIDO PARA TAILWIND V3)
module.exports = {
  plugins: {
    tailwindcss: {}, // Ya no es '@tailwindcss/postcss'
    autoprefixer: {},
  },
}