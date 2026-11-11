import { build } from 'esbuild'
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const client = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(client, 'dist')
const temporary = await mkdtemp(path.join(tmpdir(), 'zenflow-prerender-'))
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
try {
  const bundle = path.join(temporary, 'render.cjs')
  await build({ entryPoints: [path.join(client, 'src/prerender.tsx')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, loader: { '.css': 'empty' } })
  const { renderPublicPages } = createRequire(import.meta.url)(bundle)
  const template = await readFile(path.join(output, 'index.html'), 'utf8')
  await writeFile(path.join(output, 'shell.html'), template)
  const pages = renderPublicPages()
  await mkdir(path.join(output, 'prerender'), { recursive: true })
  for (const [route, page] of Object.entries(pages)) {
    const url = `https://zenflow.bio${route === '/' ? '/' : route}`
    const schema = { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, description: page.description, url, isPartOf: { '@type': 'WebSite', name: 'Zenflow', url: 'https://zenflow.bio/' } }
    let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
      .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(page.description)}" />`)
      .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${url}" />`)
      .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
      .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
      .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
      .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`)
      .replace('<div id="root"></div>', `<div id="root">${page.markup}</div>`)
    if (route === '/') await writeFile(path.join(output, 'index.html'), html)
    else await writeFile(path.join(output, 'prerender', `${route.slice(1)}.html`), html)
  }
  console.log(`Pre-rendered ${Object.keys(pages).length} public pages with indexable HTML.`)
} finally {
  await rm(path.join(temporary, 'render.cjs'), { force: true })
  await rmdir(temporary)
}
