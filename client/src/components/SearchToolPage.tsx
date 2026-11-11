import React from 'react'
import pages from '../content/search-pages.json'
import '../styles/search.css'

export type SearchPageId = keyof typeof pages
export const searchPages = pages
export function isSearchPageId(value: string): value is SearchPageId {
  return Object.prototype.hasOwnProperty.call(pages, value)
}

export default function SearchToolPage({ id, onOpenTool }: { id: SearchPageId; onOpenTool?: (tool: 'meditation' | 'planner' | 'pomodoro') => void }) {
  const page = pages[id]
  return <article className="search-tool-page">
    <header><p className="section-kicker">{page.eyebrow}</p><h1>{page.title}</h1><p className="search-intro">{page.intro}</p>
      <a className="primary-cta search-tool-action" href={`/?tool=${page.tool}`} onClick={onOpenTool ? event => { event.preventDefault(); onOpenTool(page.tool as 'meditation' | 'planner' | 'pomodoro') } : undefined}>{page.action} <span aria-hidden="true">↗</span></a>
    </header>
    <ul className="search-features">{page.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
    {page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
    <section><h2>Common questions</h2>{page.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
    <nav aria-label="More Zenflow tools"><h2>Find your next step</h2>{Object.entries(pages).filter(([slug]) => slug !== id).map(([slug, other]) => <a key={slug} href={`/${slug}`}>{other.title} <span aria-hidden="true">↗</span></a>)}<a href="/blog">Read the focus and planning guides ↗</a></nav>
  </article>
}
