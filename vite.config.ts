import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  if (command === 'build') {
    return {
      plugins: [react()],
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: 'index.html',
        },
      },
      resolve: {
        alias: { '@': '/src' },
      },
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': '/src' },
    },
  }
})
