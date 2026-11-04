import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 주소가 https://ilbtsjun.github.io/barbell-note/ 이므로 base를 저장소 이름으로 맞춘다.
export default defineConfig({
  base: '/barbell-note/',
  plugins: [
    react(),
    // 홈 화면에 설치하고 인터넷 없이도 열리게 한다. 새 버전은 사용자가 눌러야 적용된다.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '바벨노트',
        short_name: '바벨노트',
        description: '광고 없는 개인 운동 기록',
        lang: 'ko',
        start_url: '/barbell-note/',
        scope: '/barbell-note/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#FFD43B',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 글꼴은 한 번 받으면 기기에 보관해서 오프라인에서도 같은 모양으로 보인다
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
