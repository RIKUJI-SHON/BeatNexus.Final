import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'bn_icon_192.png', 
        'icon-battles.svg',
        'icon-post.svg',
        'icon-ranking.svg',
        'icon-my-battles.svg',
        'images/VS.png'
      ],
      manifest: {
        name: 'BeatNexus - Beatbox Battle Community',
        short_name: 'BeatNexus',
        description: 'ビートボクシング愛好者向けの競技プラットフォーム',
        theme_color: '#06b6d4',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/bn_icon_192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/bn_icon_192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/bn_icon_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/bn_icon_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        // 大きなファイルのサイズ制限を5MBに増加
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 大きな画像ファイルを除外
        globIgnores: [
          '**/BEATNEXUS-WORDMARK*.png',
          '**/hero-background*.png',
          '**/bn_icon_512.png'
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 12 // 12時間
              }
            }
          },
          {
            // 小さな画像ファイルのみキャッシュ（VS.png、アイコン等）
            urlPattern: /\.(?:svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'small-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30日間
              }
            }
          },
          {
            // 大きな画像ファイルはNetworkFirstで処理
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'large-images-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7日間
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/]
      },
      devOptions: {
        enabled: false // 開発時は無効
      }
    })
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
  }
});
