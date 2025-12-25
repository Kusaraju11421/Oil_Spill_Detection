
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to use process.env.API_KEY as provided by the platform/Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
