const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const path = require('node:path')
const { once } = require('node:events')

test('production pages expose content, metadata, canonical URLs, and honest status codes', async () => {
  // Isolated loopback database target: never connects to a real database or starts email schedulers.
  const port = 4198
  const child = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), MONGODB_URI: 'mongodb://127.0.0.1:1/zenflow?serverSelectionTimeoutMS=60000', PUBLIC_APP_URL: 'https://zenflow.bio', KEEP_ALIVE_ENABLED: 'false', WEEKLY_WELLNESS_EMAILS_ENABLED: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        child.stdout.on('data', data => { if (data.toString().includes('Zenflow server running')) resolve() })
        child.once('error', reject)
        child.once('exit', code => reject(new Error(`Server exited early: ${code}`)))
      }),
      new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 45000); timeout.unref() }),
    ])
    const request = route => fetch(`http://127.0.0.1:${port}${route}`, { headers: { 'x-forwarded-host': 'zenflow.bio', 'x-forwarded-proto': 'https' }, redirect: 'manual' })
    for (const [route, phrase] of Object.entries({ '/': 'A slower start.', '/meditation-timer': 'Free Online Meditation Timer', '/daily-planner': 'Online Daily Planner for Tasks and Notes', '/pomodoro-timer': 'Free Online Pomodoro Focus Timer', '/blog': 'Practical articles for a less distracted day.', '/deep-work-system': 'A Deep Work System' })) {
      const response = await request(route)
      assert.equal(response.status, 200, route)
      assert.equal(response.headers.get('x-robots-tag'), 'index,follow', route)
      const html = await response.text()
      assert.ok(html.includes(phrase), `Visible HTML content missing: ${route}`)
      assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `One main heading: ${route}`)
      assert.ok(html.includes(`<link rel="canonical" href="https://zenflow.bio${route}"`), route)
      const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
      assert.equal(jsonLd.url, `https://zenflow.bio${route}`)
    }
    const notFound = await request('/does-not-exist-seo-test')
    assert.equal(notFound.status, 404)
    assert.equal(notFound.headers.get('x-robots-tag'), 'noindex,follow')
    const normalized = await request('/Meditation-Timer/')
    assert.equal(normalized.status, 308)
    assert.equal(normalized.headers.get('location'), 'https://zenflow.bio/meditation-timer')
    assert.equal((await request('/?tool=meditation')).headers.get('x-robots-tag'), 'noindex,follow')
    assert.equal((await request('/prerender/meditation-timer.html')).status, 404)
    const sitemap = await (await request('/sitemap.xml')).text()
    for (const slug of ['meditation-timer', 'daily-planner', 'pomodoro-timer']) assert.ok(sitemap.includes(`https://zenflow.bio/${slug}`))
  } finally {
    if (child.exitCode === null) { child.kill(); await once(child, 'exit') }
  }
})
