const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig(({ mode }) => ({
  plugins: [react()],

  define: {
    // Inject build-time constants readable via import.meta.env
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },

  build: {
    // Increase chunk size warning limit — React + Chart.js legitimately exceed 500kb
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))

