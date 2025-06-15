import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWAを無効化してブラウザネイティブPWAを使用
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: false,
    //   devOptions: {
    //     enabled: false
    //   }
    // })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // パフォーマンス最適化
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.logを本番から削除
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // チャンク分割でロード時間を改善
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector']
        }
      }
    },
    // ファイルサイズ警告の閾値を調整
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true,
    host: 'localhost'
  },
  publicDir: 'public'
});
