import { build } from 'esbuild'
import { writeFileSync } from 'fs'

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outfile: 'dist/_worker.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: false,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  conditions: ['worker', 'browser'],
  mainFields: ['browser', 'module', 'main'],
})

// Write _routes.json to tell Cloudflare Pages:
// - /api/* routes go to the worker
// - everything else is served as static assets (SPA)
const routes = {
  version: 1,
  include: ['/api/*'],
  exclude: [],
}
writeFileSync('dist/_routes.json', JSON.stringify(routes, null, 2))

// Write _redirects for SPA fallback (wrangler pages dev + Cloudflare Pages)
writeFileSync('dist/_redirects', '/* /index.html 200\n')

console.log('✅ Worker built successfully!')
console.log('✅ _routes.json written!')
console.log('✅ _redirects written!')
