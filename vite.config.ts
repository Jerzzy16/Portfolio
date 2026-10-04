import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Inlines the emitted stylesheet into index.html and preloads the webfonts.
 *
 * The stylesheet was the only render-blocking request, costing 551ms of FCP and
 * LCP on a throttled Slow 4G load -- all of it round-trip latency, since the
 * sheet itself is 7KB gzipped. At that size inlining is strictly cheaper than
 * a second request, and it also puts the @font-face URLs in front of the parser
 * a few hundred milliseconds earlier than a linked sheet allowed.
 *
 * The fonts are the tail of the critical path (2.8s of a 2.8s chain), so they
 * are preloaded explicitly rather than left for the parser to discover.
 */
function inlineCssAndPreloadFonts(): Plugin {
  // `base` lives on the resolved config, not on generateBundle's options.
  let base = '/';

  return {
    name: 'portfolio-inline-css',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    generateBundle(_options, bundle) {
      const entries = Object.values(bundle).filter(
        (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.html'),
      );
      const cssAssets = Object.values(bundle).filter(
        (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'),
      );
      if (entries.length === 0 || cssAssets.length === 0) return;

      for (const entry of entries) {
        let html = String((entry as { source: string }).source);

        for (const asset of cssAssets) {
          const cssFile = asset.fileName;
          const escaped = cssFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // Every woff2 the stylesheet references, for the preload hints below.
          const fontFiles = [
            ...new Set(
              [...String((asset as { source: string }).source).matchAll(/assets\/[\w.-]+\.woff2/g)].map(
                (match) => match[0],
              ),
            ),
          ];

          const linkTag = new RegExp(`[ \t\r\n]*<link[^>]*href="[^"]*${escaped}"[^>]*>`, 'g');
          if (!linkTag.test(html)) continue;
          html = html.replace(linkTag, '');

          const preloads = fontFiles
            .map((file) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}${file}" />`)
            .join('');

          /*
            Both go directly after the charset declaration. Two constraints
            pull in opposite directions here: the charset meta has to stay
            inside the first 1024 bytes or the browser guesses the encoding,
            and an early <style> is the entire point of inlining. Anchoring to
            the charset tag satisfies both. Preloads lead, so the fonts are
            already in flight before a byte of CSS is parsed.
          */
          const injected = `${preloads}<style>${String((asset as { source: string }).source)}</style>`;
          const charsetTag = /<meta\s+charset=["'][^"']*["']\s*\/?>/i;

          html = charsetTag.test(html)
            ? html.replace(charsetTag, (match) => `${match}${injected}`)
            : html.replace(/(<head[^>]*>)/i, `$1${injected}`);

          delete bundle[cssFile];
        }

        (entry as { source: string }).source = html;
      }
    },
  };
}

export default defineConfig({
  // GitHub Pages serves this repo at jerzzy16.github.io/Portfolio/, so the
  // deploy workflow builds with VITE_BASE=/Portfolio/. Unset locally, which
  // keeps `vite dev` and `vite preview` on the root path.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), inlineCssAndPreloadFonts()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});