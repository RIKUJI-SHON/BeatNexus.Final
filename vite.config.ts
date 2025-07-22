import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // カスタムプラグインでvoid-elementsの問題を解決
    {
      name: 'void-elements-fix',
      load(id) {
        if (id.includes('void-elements')) {
          return `
            const voidElements = {
              "area": true,
              "base": true,
              "br": true,
              "col": true,
              "embed": true,
              "hr": true,
              "img": true,
              "input": true,
              "link": true,
              "meta": true,
              "param": true,
              "source": true,
              "track": true,
              "wbr": true
            };
            export default voidElements;
            export { voidElements };
          `;
        }
      }
    }
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
    exclude: ['lucide-react', '@ffmpeg/ffmpeg', '@ffmpeg/util'],
    include: ['void-elements', 'html-parse-stringify'],
    esbuildOptions: {
      // CommonJSパッケージのサポート強化
      target: 'esnext',
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.logを本番から削除
        drop_debugger: true
      }
    },
    rollupOptions: {
      external: [],
      output: {
        // チャンク分割を最適化してエラーを回避
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
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      // CommonJSパッケージの変換設定
      include: [/void-elements/, /html-parse-stringify/, /node_modules/],
      transformMixedEsModules: true,
      defaultIsModuleExports: 'auto'
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: 'localhost',
    // Supabase Storage画像の読み込みを可能にするため、COEPヘッダーは設定しない
    headers: {
      // PWA機能に必要な場合のみコメントアウトを解除
      // 'Cross-Origin-Opener-Policy': 'same-origin',
      // 'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  publicDir: 'public'
});
