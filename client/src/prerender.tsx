import React from 'react'
import { renderToString } from 'react-dom/server'
import MarketingLanding from './components/MarketingLanding'
import SearchToolPage, { searchPages, type SearchPageId } from './components/SearchToolPage'
import { BlogIndexPage, BlogArticlePage, BlogPreviewSection, blogPageMeta, type BlogArticleId } from './components/BlogPages'

const noop = () => {}
const homeMeta = {
  title: 'Zenflow | Meditation Timer, Daily Planner & Focus Tools',
  description: 'A free online meditation timer, daily planner, and Pomodoro focus timer. Plan your day, work on one task, and make time for a quiet break with Zenflow.',
}
export function renderPublicPages() {
  const result: Record<string, { title: string; description: string; markup: string }> = {}
  const wrap = (content: React.ReactNode) => renderToString(<div className="app-root public-root"><header className="search-static-header"><a href="/">Zenflow</a><a href="/meditation-timer">Meditation</a><a href="/daily-planner">Daily planner</a><a href="/pomodoro-timer">Focus timer</a><a href="/blog">Articles</a></header><main>{content}</main><footer className="search-static-footer"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a></footer></div>)
  result['/'] = { ...homeMeta, markup: wrap(<><MarketingLanding onOpenAuth={noop} onOpenTool={noop} /><BlogPreviewSection onOpenIndex={noop} onOpenArticle={noop} /></>) }
  for (const [id, page] of Object.entries(searchPages)) {
    result[`/${id}`] = { title: `${page.title} — Zenflow`, description: page.description, markup: wrap(<SearchToolPage id={id as SearchPageId} />) }
  }
  result['/blog'] = { title: `${blogPageMeta.blog.title} — Zenflow`, description: blogPageMeta.blog.description, markup: wrap(<BlogIndexPage onOpenArticle={noop} onOpenAuth={noop} />) }
  for (const id of Object.keys(blogPageMeta).filter(id => id !== 'blog') as BlogArticleId[]) {
    result[`/${id}`] = { title: `${blogPageMeta[id].title} — Zenflow`, description: blogPageMeta[id].description, markup: wrap(<BlogArticlePage articleId={id} onOpenIndex={noop} onOpenArticle={noop} onOpenAuth={noop} />) }
  }
  return result
}
