import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outFile = fileURLToPath(new URL('docs/index.html', import.meta.url));

// GitHub Pages serves this fine over https, but Vite's default `crossorigin` attribute on
// the module script/stylesheet makes Chrome refuse to load them when the page is opened
// directly as a file:// URL (origin "null" can't satisfy a CORS-mode fetch) — which breaks
// local testing and anyone who downloads the repo and double-clicks docs/index.html. There's
// no subresource-integrity check relying on it here, so it's safe to drop post-build.
function stripCrossorigin() {
  return {
    name: 'strip-crossorigin',
    closeBundle() {
      const html = readFileSync(outFile, 'utf8').replace(/\s+crossorigin(="[^"]*")?/g, '');
      writeFileSync(outFile, html);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [stripCrossorigin()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
