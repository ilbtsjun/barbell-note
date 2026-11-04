import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소가 https://ilbtsjun.github.io/barbell-note/ 이므로 base를 저장소 이름으로 맞춘다.
export default defineConfig({
  base: '/barbell-note/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
