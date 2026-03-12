import React from 'react'
import type { GoalIntent } from '../types/experience'

export type BlogArticleId =
  | 'beat-phone-addiction'
  | 'dopamine-detox-guide'
  | 'deep-work-system'
  | 'focus-tracking'

type BlogSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

type BlogArticle = {
  slug: BlogArticleId
  title: string
  description: string
  excerpt: string
  readTime: string
  category: string
  goal: GoalIntent
  imageSrc: string
  imageAlt: string
  imageCaption: string
  kicker: string
  heroStats: Array<{ value: string; label: string }>
  takeaways: string[]
  ctaTitle: string
  ctaBody: string
  ctaPoints: string[]
  sections: BlogSection[]
}

type BlogPageMeta = {
  title: string
  description: string
}

type AuthHandler = (mode: 'login' | 'register', goal?: GoalIntent) => void

const articles: BlogArticle[] = [
  {
    slug: 'beat-phone-addiction',
    title: 'Beat Phone Addiction Without Trying to Become a Monk',
    description: 'A practical reset for breaking compulsive phone habits and replacing them with a calmer daily workflow.',
    excerpt:
      'You do not need perfect discipline. You need friction around the bad habit and a better system for what to do next.',
    readTime: '7 min read',
    category: 'Attention',
    goal: 'focus',
    imageSrc: '/blog-media/beat-phone-addiction.svg',
    imageAlt: 'Illustration of a phone on a desk beside a notebook and tea.',
    imageCaption: 'Reduce the number of times your phone interrupts your attention before you ask yourself to be more disciplined.',
    kicker: 'Phone habits',
    heroStats: [
      { value: '3', label: 'friction rules to add today' },
      { value: '25m', label: 'first focus block to protect' },
      { value: '1', label: 'fallback ritual instead of scrolling' },
    ],
    takeaways: [
      'Move your highest-risk apps out of your thumb path.',
      'Give yourself scheduled check windows instead of constant checking.',
      'Replace the urge loop with a tiny ritual: note, timer, task.',
    ],
    ctaTitle: 'Turn reduced screen time into real work time',
    ctaBody:
      'Zenflow gives you a daily note, a focus timer, and a visible progress loop so the time you win back from your phone does not disappear into vague intention.',
    ctaPoints: [
      'Pin one task before you start',
      'Run a distraction-free focus timer',
      'Track sessions so progress feels real',
    ],
    sections: [
      {
        heading: 'Why the phone keeps winning',
        paragraphs: [
          'Most people are not dealing with a motivation problem. They are dealing with a default environment that makes the phone easier than every meaningful task. Notifications, muscle memory, and quick novelty win because they ask almost nothing from you.',
          'Trying to solve that with pure willpower usually fails by the second or third hard moment of the day. A better fix is to make the bad loop slower and the good loop easier.',
        ],
      },
      {
        heading: 'Add friction before you ask for discipline',
        paragraphs: [
          'Put the most addictive apps on the second or third screen, remove badges, and keep the phone physically out of reach during work blocks. These are small changes, but they interrupt automatic behavior.',
          'Pick two or three check windows during the day. When you know you are allowed to check later, the urge feels less urgent in the moment.',
        ],
        bullets: [
          'Use grayscale during work hours if colorful apps hook you quickly.',
          'Charge the phone away from the bed so mornings start slower.',
          'Keep one low-stimulation replacement nearby, like water, a notebook, or a printed checklist.',
        ],
      },
      {
        heading: 'Replace scrolling with a concrete fallback',
        paragraphs: [
          'The best replacement is not another self-improvement trick. It is a ritual so simple that you can do it half distracted: write the next task, start a short timer, and begin badly if needed.',
          'That is where a tool matters. When the next action is already visible, the brain does not have to negotiate from scratch every time you resist the phone.',
        ],
      },
      {
        heading: 'A realistic starter plan',
        paragraphs: [
          'For the next three days, try this sequence: put the phone away, write one task, run a 25-minute session, then take a deliberate break. Do not optimize beyond that yet.',
          'If you slip, return to the ritual instead of turning it into a moral failure. The point is not to become unreachable. The point is to stop giving your best attention away by default.',
        ],
      },
    ],
  },
  {
    slug: 'dopamine-detox-guide',
    title: 'A Dopamine Detox Guide That Is Actually Usable',
    description: 'A practical guide to lowering overstimulation, calming your routine, and getting back to deliberate attention.',
    excerpt:
      'A useful dopamine detox is not punishment. It is a short reset that lowers noise so normal work and rest feel available again.',
    readTime: '8 min read',
    category: 'Reset',
    goal: 'calm',
    imageSrc: '/blog-media/dopamine-detox-guide.svg',
    imageAlt: 'Illustration of a calm desk with notifications turned off and a plant nearby.',
    imageCaption: 'The goal is not zero pleasure. The goal is less chaos, fewer compulsive cues, and more control over where your attention goes.',
    kicker: 'Reset routine',
    heroStats: [
      { value: '24h', label: 'enough for a useful reset' },
      { value: '4', label: 'inputs to cut first' },
      { value: '1', label: 'quiet review at the end' },
    ],
    takeaways: [
      'Reduce stimulation instead of trying to eliminate all pleasure.',
      'Plan what you will do during the reset before it starts.',
      'Use the calmer state to rebuild a simpler daily rhythm.',
    ],
    ctaTitle: 'Make the reset stick after the detox ends',
    ctaBody:
      'Zenflow helps you turn one reset day into a repeatable rhythm with a daily note, short meditation, clear task list, and progress tracking that does not feel noisy.',
    ctaPoints: [
      'Write your detox rules before you begin',
      'Use guided timers for quiet blocks',
      'Review what actually improved afterward',
    ],
    sections: [
      {
        heading: 'What a dopamine detox should really mean',
        paragraphs: [
          'A lot of detox advice is too dramatic to survive contact with normal life. You do not need to pretend the internet does not exist. You need a reset that removes the highest-noise inputs long enough for your baseline attention to come back online.',
          'That usually means fewer notifications, fewer algorithmic feeds, less random snacking, and less switching. The real target is overstimulation, not enjoyment itself.',
        ],
      },
      {
        heading: 'Set the rules before the day begins',
        paragraphs: [
          'Pick a clear start and end time. Decide in advance what you will avoid, what you will still allow for practical reasons, and what low-stimulation alternatives you will use instead.',
          'If you leave the day undefined, your brain will negotiate every decision as it comes up. That turns the reset into constant friction. Structure removes that pressure.',
        ],
        bullets: [
          'Cut short-form feeds and nonessential notifications.',
          'Keep music, reading, walking, journaling, and simple meals available.',
          'Prepare one intentional work block and one intentional rest block.',
        ],
      },
      {
        heading: 'Use the reset to notice your real defaults',
        paragraphs: [
          'The most useful part of a detox is the observation. When the noise drops, you quickly see what you reach for when you are bored, anxious, or avoiding effort.',
          'Write those moments down. They tell you where your daily system needs support. If the same urge appears five times, you do not need more guilt. You need a replacement path.',
        ],
      },
      {
        heading: 'Build a softer daily routine afterward',
        paragraphs: [
          'When the reset ends, do not snap back to the old environment. Keep one or two restrictions and add one stabilizing habit, like a daily note in the morning or a short meditation before opening social apps.',
          'That is how a detox becomes useful: not as a purity test, but as a cleaner default rhythm you can actually keep.',
        ],
      },
    ],
  },
  {
    slug: 'deep-work-system',
    title: 'Build a Deep Work System You Can Repeat Every Week',
    description: 'A practical deep work system for reducing context switching and getting meaningful work done consistently.',
    excerpt:
      'Deep work is rarely blocked by lack of ambition. It is blocked by unclear priorities, open loops, and no repeatable start ritual.',
    readTime: '9 min read',
    category: 'Productivity',
    goal: 'consistency',
    imageSrc: '/blog-media/deep-work-system.svg',
    imageAlt: 'Illustration of a desk with a timer, notebook, and structured work blocks.',
    imageCaption: 'Deep work becomes repeatable when the setup is predictable: one task, one block, one review, then reset.',
    kicker: 'Deep work',
    heroStats: [
      { value: '1', label: 'priority for each session' },
      { value: '50m', label: 'strong first block target' },
      { value: '5m', label: 'review to close the loop' },
    ],
    takeaways: [
      'Choose the outcome before the timer starts.',
      'Protect fewer, longer blocks instead of many tiny attempts.',
      'End each block with a short review so restarting is easier.',
    ],
    ctaTitle: 'Put your deep work blocks on rails',
    ctaBody:
      'Zenflow combines a planner, focus timer, daily note, and progress view so your deep work sessions stop living in scattered tabs and good intentions.',
    ctaPoints: [
      'Plan the block from the dashboard',
      'Run the session with a built-in focus timer',
      'Review progress without leaving the workflow',
    ],
    sections: [
      {
        heading: 'Deep work needs a system, not a mood',
        paragraphs: [
          'Waiting to feel ready is one of the easiest ways to never start. Deep work is easier when the conditions are already decided: what matters, how long you will work, and what counts as success for this block.',
          'That is why people with demanding schedules still get serious work done. They remove choices at the start of the session instead of relying on inspiration.',
        ],
      },
      {
        heading: 'Choose the task and define the finish line',
        paragraphs: [
          'A vague session creates vague effort. Before each block, define the exact output you want: draft three sections, review twenty pages, design one screen, clean one report.',
          'This matters because the brain handles concrete completion far better than abstract pressure. The work feels finite, which makes starting less painful.',
        ],
        bullets: [
          'Write the task in one line.',
          'Set a realistic block length.',
          'Remove open tabs and unrelated inputs before the timer starts.',
        ],
      },
      {
        heading: 'Protect the block and respect the break',
        paragraphs: [
          'Once the session begins, your only job is to stay with the chosen task. If a new idea appears, capture it quickly and return. If you need a break, take a real one rather than slipping into a half-work, half-scroll state.',
          'A good break is deliberate and short. That keeps the next block possible instead of draining the day into vague recovery.',
        ],
      },
      {
        heading: 'Close the loop so restarting is easier tomorrow',
        paragraphs: [
          'The five-minute review at the end is what turns a one-off session into a system. Note what moved forward, what is blocked, and the next visible step.',
          'That next-step note is powerful because tomorrow you are not starting from uncertainty. You are restarting from a breadcrumb you left for yourself.',
        ],
      },
    ],
  },
  {
    slug: 'focus-tracking',
    title: 'Focus Tracking: What to Measure If You Want Better Attention',
    description: 'A guide to tracking focus in a way that supports better habits instead of creating more pressure.',
    excerpt:
      'The right focus metrics show patterns, not just effort. You want enough data to see what helps, without turning productivity into a spreadsheet obsession.',
    readTime: '6 min read',
    category: 'Measurement',
    goal: 'focus',
    imageSrc: '/blog-media/focus-tracking.svg',
    imageAlt: 'Illustration of charts, a notebook, and a focus timer on a desk.',
    imageCaption: 'Tracking works best when it stays light: enough signal to guide decisions, not so much that it becomes another avoidance habit.',
    kicker: 'Progress tracking',
    heroStats: [
      { value: '4', label: 'metrics worth keeping' },
      { value: '1x', label: 'weekly review that matters' },
      { value: '0', label: 'need for complex dashboards' },
    ],
    takeaways: [
      'Track sessions, not fantasies about working all day.',
      'Look for triggers and recovery patterns, not just total hours.',
      'Use a weekly review to decide one change for the next week.',
    ],
    ctaTitle: 'Track focus without creating more noise',
    ctaBody:
      'Zenflow keeps your session history, notes, planner, and quick recovery tools together so focus tracking supports action instead of becoming another disconnected habit.',
    ctaPoints: [
      'See completed sessions in one place',
      'Pair tracking with planner and daily notes',
      'Use light games or meditation for better breaks',
    ],
    sections: [
      {
        heading: 'Why focus tracking helps',
        paragraphs: [
          'Most people misremember how they work. A day can feel unproductive even when you finished two strong sessions, or feel busy when it was mostly switching and reacting. Tracking gives you evidence instead of mood.',
          'The goal is not to measure everything. The goal is to notice patterns that help you protect attention more consistently.',
        ],
      },
      {
        heading: 'Four metrics that are actually useful',
        paragraphs: [
          'Start with a small set: number of focus sessions, total focused minutes, what task each block was for, and what usually broke the block. That alone tells you far more than raw screen-time numbers.',
          'If you want one more layer, add your recovery pattern. Did a walk, note, breathing break, or quick game help you return faster than scrolling did?',
        ],
        bullets: [
          'Sessions completed',
          'Minutes of deliberate focus',
          'Task linked to the session',
          'Most common interruption or derail point',
        ],
      },
      {
        heading: 'Use weekly review instead of daily judgment',
        paragraphs: [
          'Daily tracking is useful, but daily judgment is exhausting. The right move is a short weekly review where you ask what improved, what repeatedly broke, and what single rule would make next week easier.',
          'That might be moving one meeting, planning tomorrow before logging off, or starting the day with a timer before checking messages.',
        ],
      },
      {
        heading: 'Keep the system light enough to survive',
        paragraphs: [
          'If tracking takes too much energy, it becomes another form of procrastination. Use a tool that records the basics while you work so the feedback loop stays small and usable.',
          'When tracking is light, it becomes reassuring. You can see that progress is happening, even on imperfect days.',
        ],
      },
    ],
  },
]

export const blogArticleIds = articles.map((article) => article.slug) as BlogArticleId[]

export const blogPageMeta: Record<'blog' | BlogArticleId, BlogPageMeta> = {
  blog: {
    title: 'Blog',
    description: 'Read Zenflow guides on focus, phone habits, deep work, dopamine detox, and practical attention management.',
  },
  'beat-phone-addiction': {
    title: articles[0].title,
    description: articles[0].description,
  },
  'dopamine-detox-guide': {
    title: articles[1].title,
    description: articles[1].description,
  },
  'deep-work-system': {
    title: articles[2].title,
    description: articles[2].description,
  },
  'focus-tracking': {
    title: articles[3].title,
    description: articles[3].description,
  },
}

export function isBlogArticleId(value: string): value is BlogArticleId {
  return blogArticleIds.includes(value as BlogArticleId)
}

export function getBlogArticle(slug: BlogArticleId) {
  return articles.find((article) => article.slug === slug) || articles[0]
}

function BlogCard({
  article,
  onOpenArticle,
}: {
  article: BlogArticle
  onOpenArticle: (slug: BlogArticleId) => void
}) {
  return (
    <article className="blog-card card">
      <div className="blog-card-media">
        <img src={article.imageSrc} alt={article.imageAlt} loading="lazy" />
      </div>
      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span>{article.category}</span>
          <span>{article.readTime}</span>
        </div>
        <h3>{article.title}</h3>
        <p>{article.excerpt}</p>
        <div className="plan-tags blog-card-tags">
          {article.takeaways.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <button type="button" className="primary-cta" onClick={() => onOpenArticle(article.slug)}>
          Read article
        </button>
      </div>
    </article>
  )
}

export function BlogPreviewSection({
  onOpenIndex,
  onOpenArticle,
}: {
  onOpenIndex: () => void
  onOpenArticle: (slug: BlogArticleId) => void
}) {
  return (
    <section id="blog-preview" className="blog-preview-shell fade-rise">
      <div className="section-heading-block">
        <div className="section-kicker">Blog</div>
        <h2>Free focus guides people can read before they ever create an account.</h2>
        <p className="lead">
          These articles are built to help first and sell second. Each one gives a practical framework, then shows how Zenflow can make the habit easier to keep.
        </p>
      </div>
      <div className="blog-preview-grid">
        {articles.map((article) => (
          <BlogCard key={article.slug} article={article} onOpenArticle={onOpenArticle} />
        ))}
      </div>
      <div className="blog-preview-actions">
        <button type="button" className="primary-cta" onClick={onOpenIndex}>
          Browse all articles
        </button>
      </div>
    </section>
  )
}

export function BlogIndexPage({
  onOpenArticle,
  onOpenAuth,
}: {
  onOpenArticle: (slug: BlogArticleId) => void
  onOpenAuth: AuthHandler
}) {
  return (
    <section className="blog-shell">
      <article className="blog-hero-card legal-card">
        <div className="section-kicker">Zenflow Blog</div>
        <h2>Practical attention advice for people trying to work better without making life more rigid.</h2>
        <p>
          Read the guides, try the ideas, and use Zenflow when you want the note, timer, planner, and progress loop in one place instead of spread across tabs.
        </p>
        <div className="blog-index-actions">
          <button type="button" className="primary-cta" onClick={() => onOpenAuth('register', 'focus')}>
            Create free account
          </button>
          <button type="button" className="ghost-btn" onClick={() => onOpenAuth('login', 'focus')}>
            Login
          </button>
        </div>
      </article>
      <div className="blog-index-grid">
        {articles.map((article) => (
          <BlogCard key={article.slug} article={article} onOpenArticle={onOpenArticle} />
        ))}
      </div>
    </section>
  )
}

export function BlogArticlePage({
  articleId,
  onOpenIndex,
  onOpenArticle,
  onOpenAuth,
}: {
  articleId: BlogArticleId
  onOpenIndex: () => void
  onOpenArticle: (slug: BlogArticleId) => void
  onOpenAuth: AuthHandler
}) {
  const article = getBlogArticle(articleId)
  const related = articles.filter((entry) => entry.slug !== articleId).slice(0, 3)

  return (
    <section className="blog-shell">
      <article className="blog-article-hero legal-card">
        <div className="blog-article-copy">
          <div className="section-kicker">{article.kicker}</div>
          <h2>{article.title}</h2>
          <p className="blog-article-description">{article.description}</p>
          <div className="blog-hero-meta">
            <span>{article.category}</span>
            <span>{article.readTime}</span>
          </div>
          <div className="blog-stat-grid">
            {article.heroStats.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <figure className="blog-article-figure">
          <img src={article.imageSrc} alt={article.imageAlt} />
          <figcaption>{article.imageCaption}</figcaption>
        </figure>
      </article>

      <div className="blog-content-grid">
        <article className="legal-card blog-story-card">
          <div className="blog-takeaway-card">
            <strong>Key takeaways</strong>
            <ul>
              {article.takeaways.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {article.sections.map((section) => (
            <section key={section.heading} className="blog-story-section">
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <aside className="blog-sidebar">
          <div className="legal-card blog-sidebar-card">
            <div className="section-kicker">Use Zenflow</div>
            <h3>{article.ctaTitle}</h3>
            <p>{article.ctaBody}</p>
            <ul>
              {article.ctaPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="blog-sidebar-actions">
              <button type="button" className="primary-cta" onClick={() => onOpenAuth('register', article.goal)}>
                Start free
              </button>
              <button type="button" className="ghost-btn" onClick={() => onOpenAuth('login', article.goal)}>
                I already have an account
              </button>
            </div>
          </div>

          <div className="legal-card blog-sidebar-card">
            <div className="section-kicker">More reading</div>
            <h3>Keep going</h3>
            <div className="blog-related-list">
              {related.map((entry) => (
                <button key={entry.slug} type="button" className="blog-related-link" onClick={() => onOpenArticle(entry.slug)}>
                  <strong>{entry.title}</strong>
                  <span>{entry.readTime}</span>
                </button>
              ))}
            </div>
            <button type="button" className="ghost-btn" onClick={onOpenIndex}>
              All articles
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
