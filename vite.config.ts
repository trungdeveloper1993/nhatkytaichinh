import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// Liệt kê file trong thư mục public (đường dẫn tương đối, dùng "/")
function listFiles(dir: string, prefix = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), rel) : [rel];
  });
}

// Sinh dist/sw.js từ src/pwa/service-worker.js: danh sách file cần lưu sẵn + mã phiên bản build.
// Mã phiên bản đổi mỗi khi nội dung bản build đổi -> trình duyệt nhận ra có bản cập nhật.
function serviceWorker(): Plugin {
  return {
    name: 'nktc-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const publicDir = path.resolve(__dirname, 'public');
      const publicFiles = listFiles(publicDir).filter((f) => !f.startsWith('.'));
      const bundleFiles = Object.keys(bundle).filter((f) => !f.endsWith('.map'));

      const hash = createHash('sha256');
      for (const file of [...bundleFiles].sort()) {
        const item = bundle[file];
        hash.update(file);
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const file of publicFiles.sort()) {
        hash.update(file);
        hash.update(fs.readFileSync(path.join(publicDir, file)));
      }

      // Icon 512px chỉ dùng khi cài app -> không cần tải sẵn
      const precache = [...new Set([...bundleFiles, ...publicFiles])].filter((f) => !/-512\.png$/.test(f)).sort();
      const template = fs.readFileSync(path.resolve(__dirname, 'src/pwa/service-worker.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace("'__BUILD_ID__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
          .replace('self.__PRECACHE__', JSON.stringify(precache)),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    // Base path for GitHub Pages project site: https://<user>.github.io/nhatkytaichinh/
    base: process.env.GITHUB_PAGES === 'true' ? '/nhatkytaichinh/' : '/',
    plugins: [react(), tailwindcss(), serviceWorker()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
