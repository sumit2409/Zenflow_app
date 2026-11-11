# Search setup

## November 11, 2026

- Verified the `https://zenflow.bio/` Search Console property using its existing domain-provider record.
- URL Inspection confirms the homepage is already indexed. Requested a recrawl; Google confirmed **Indexing requested**.
- Submitted `https://zenflow.bio/sitemap.xml`. Its initial **Couldn't fetch** status resolved to **Success**, with **Sitemap processed successfully** and 12 pages discovered. The deployed sitemap now also contains the three new tool URLs.
- Added dedicated public pages for `/meditation-timer`, `/daily-planner`, and `/pomodoro-timer`, linked from the homepage and each other.
- The production build pre-renders nine public pages: the homepage, three tool introductions, blog index, and four articles. The initial HTML includes the same React-authored content shown to visitors, without requiring JavaScript to discover it.
- Added route-specific titles, descriptions, canonical URLs, WebPage data, crawlable article links, and sitemap entries. Private tool states are noindex. Unknown URLs return 404 rather than a successful homepage response.
- Pushed implementation commit `479d790` to main and verified the live deployment: all three new URLs return 200, `index,follow`, a unique title, one main heading, and the correct canonical URL.
- Google accepted indexing requests for `/meditation-timer`, `/daily-planner`, and `/pomodoro-timer`, in addition to the homepage recrawl. Submission is a crawl-queue request, not confirmation that a page is indexed or ranking.
- Resubmitted the sitemap after the new deployment so Google can discover the added URLs. Google confirmed **Sitemap submitted successfully**.

## Validate after deployment

1. Check each new URL returns 200, `X-Robots-Tag: index,follow`, a unique title, and a matching canonical URL.
2. In Search Console, inspect the three new URLs, run the live test, and request indexing once they are available. Do not submit a URL while it still returns the old noindex fallback.
3. Recheck the sitemap fetch result. If a fetch error persists, inspect the live test, host/CDN access logs, DNS, and uptime. Do not remove working robots directives or fabricate a successful indexing result.
4. Allow Search Console to gather performance and indexing data. Its newly verified property initially showed **Processing data**.

## What to measure

Start with relevant searches such as *online meditation timer*, *daily planner online*, and *Pomodoro focus timer*. These match the actual tools more precisely than the very broad searches *meditation* or *planning*.

Use Search Console queries, impressions, clicks, and average position to identify pages people discover. Improve instructions based on real questions and actual product behavior. Add original, useful articles that support the tools; avoid repetitive keyword pages or unsupported health claims. Earn relevant mentions through genuine product usefulness and outreach rather than purchased links.

Indexing and ranking are separate. A sitemap and indexing request help discovery; neither guarantees indexing, a particular position, or revenue. Google chooses whether and when to index and rank pages.

References: [Google indexing FAQ](https://developers.google.com/search/help/crawling-index-faq), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Request a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Local verification

```text
npm run build
node --test server/seo.test.cjs
```

The HTTP test uses an isolated loopback database address and terminates its test server, without connecting to production data or starting email delivery.
