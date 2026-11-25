import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { stripPrivate } from './src/data/private.ts'

// Private pay is cut in Node, so the Private pay section never reaches the bundle.
const stripPrivatePay: Plugin = {
  name: 'strip-private-pay',
  enforce: 'pre',
  load(id) {
    const file = id.split('?')[0]
    // Outreach reads one number from inputs.toml, so no other value in that file reaches the bundle.
    if (/\/my-profile\/inputs\.toml$/u.test(file)) return `export default ${JSON.stringify(/^\s*invites_per_week\s*=\s*\d+/mu.exec(readFileSync(file, 'utf8'))?.[0] ?? '')}`
    return /\/my-profile\/(?:profile|work-portfolio|faq)\.md$/u.test(file) ? `export default ${JSON.stringify(stripPrivate(readFileSync(file, 'utf8')))}` : undefined
  },
}

// The learn app brings its own global CSS (html, body, :root, *, bare class names). This PostCSS step runs on
// files under src/learn/ only and scopes every selector under .learn, so none of it can restyle the other tabs.
// The theme tokens still follow JobHunt's <html data-theme>, because the root selector moves in front of .learn.
const SCOPE = '.learn'
const ROOT_SCOPE = /^(?::root|html|body)$/u
function scopeSelector(sel: string): string {
  const s = sel.trim()
  if (s.startsWith(SCOPE)) return s
  if (ROOT_SCOPE.test(s)) return SCOPE
  if (s === '*' || s === '*, *::before, *::after') return `${SCOPE}, ${SCOPE} *`
  if (s === '*::before' || s === '*::after') return `${SCOPE} ${s}`
  const themed = /^((?::root|html)(?::not\([^)]*\)|\[[^\]]*\])+)\s*(.*)$/u.exec(s)
  if (themed) return themed[2] ? `${themed[1]} ${SCOPE} ${themed[2]}` : `${themed[1]} ${SCOPE}`
  const body = /^(?:html|body)\s+(.+)$/u.exec(s)
  return `${SCOPE} ${body ? body[1] : s}`
}
export const scopeLearnCss: NonNullable<NonNullable<import('vite').UserConfig['css']>['postcss']> = {
  plugins: [{
    postcssPlugin: 'scope-learn-css',
    Once(root: any) {
      const file: string = root.source?.input?.file ?? ''
      if (!file.includes('/src/learn/')) return
      root.walkRules((rule: any) => {
        let p = rule.parent
        while (p && p.type !== 'root') {
          if (p.type === 'atrule' && /keyframes|font-face/u.test(p.name)) return
          p = p.parent
        }
        rule.selectors = rule.selectors.map(scopeSelector)
      })
    },
  }],
}

export default defineConfig({
  plugins: [stripPrivatePay, react()],
  css: { postcss: scopeLearnCss },
  // Scan only the app; .claude/worktrees holds a stale copy of the repo.
  optimizeDeps: { entries: ['index.html'] },
  // my-sessions/, my-applications/ and my-profile/ sit inside the project root, so Vite's fs.allow already covers them.
  // localhost only: with --host, every file under the repo root would be served to the network.
  // /api goes to the notebook server (server/index.ts). changeOrigin stays false, so the server sees Host localhost:7002.
  // my-notebook/ is ignored, so audio cache and bookmark writes never reload the page.
  server: {
    host: 'localhost',
    strictPort: true,
    port: Number(process.env.HUNT_DASH_PORT) || 7002, // env ports only for a second verification preview
    proxy: { '/api': { target: `http://127.0.0.1:${Number(process.env.HUNT_SERVER_PORT) || 7003}`, changeOrigin: false } },
    watch: { ignored: ['**/.claude/**', '**/.git/**', '**/my-notebook/**', '**/my-learn/**'] },
  },
})
