import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/users': 'http://localhost:3000',
      '/equipments': 'http://localhost:3000',
      '/bookings': 'http://localhost:3000'
    }
  }
});