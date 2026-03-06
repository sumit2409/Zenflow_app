import React, { useState, type FormEvent } from 'react'
import { apiUrl } from '../utils/api'

export type StaticPageId = 'privacy' | 'terms' | 'cookie' | 'about' | 'contact' | 'faq'

export type StaticPageMeta = {
  title: string
  description: string
}

export const staticPageMeta: Record<StaticPageId, StaticPageMeta> = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How Zenflow collects, stores, and protects user data and what rights are available to users. ',
  },
  terms: {
    title: 'Terms of Service',
    description: 'Acceptable use, account responsibilities, and service rules for using Zenflow.',
  },
  cookie: {
    title: 'Cookie Policy',
    description: 'What cookies and local storage are used on Zenflow and how to manage them.',
  },
  about: {
    title: 'About Us',
    description: 'Mission, vision, team introduction, and Zenflow community focus on better work habits.',
  },
  contact: {
    title: 'Contact',
    description: 'Contact Zenflow support, share feedback, and get help with access or account issues.',
  },
  faq: {
    title: 'FAQ',
    description: 'Common questions for Zenflow users covering login, planner, focus timer, and app setup.',
  },
}

export function SiteFooterLinks({ onNavigate }: { onNavigate: (page: StaticPageId) => void }) {
  const links: Array<{ key: StaticPageId; label: string }> = [
    { key: 'privacy', label: 'Privacy Policy' },
    { key: 'terms', label: 'Terms of Service' },
    { key: 'cookie', label: 'Cookie Policy' },
    { key: 'about', label: 'About' },
    { key: 'faq', label: 'FAQ' },
    { key: 'contact', label: 'Contact' },
  ]

  return (
    <div className="footer-links legal-links" aria-label="Legal links">
      {links.map((link) => (
        <button key={link.key} type="button" className="ghost-btn" onClick={() => onNavigate(link.key)}>
          {link.label}
        </button>
      ))}
    </div>
  )
}

function Breadcrumbs({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <nav className="page-breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ol>
    </nav>
  )
}

export function PrivacyPolicyPage() {
  return (
    <section className="legal-shell">
      <div className="legal-card">
        <div className="section-kicker">Legal</div>
        <h2>Privacy Policy</h2>
        <p className="muted">Last updated: March 6, 2026</p>

        <article className="legal-block">
          <h3>Data we collect</h3>
          <ul>
            <li>Account details you provide (username, optional full name, email).</li>
            <li>Session and usage activity required to sync progress and show metrics.</li>
            <li>Planner and notes data you create to persist your workflow across sessions.</li>
            <li>Device/browser technical data needed for secure delivery and diagnostics.</li>
          </ul>
        </article>

        <article className="legal-block">
          <h3>Cookie and storage usage</h3>
          <p>
            We use local browser storage for session persistence and preference retention, along with cookies/local storage equivalents
            used by authentication and analytics integrations already configured in your existing app stack.
          </p>
        </article>

        <article className="legal-block">
          <h3>User rights</h3>
          <ul>
            <li>Access: request a copy of data linked to your account.</li>
            <li>Rectification: update profile fields from your Account page.</li>
            <li>Deletion: request deletion from support.</li>
            <li>Restriction/withdrawal: pause analytics usage where provided by your browser settings.</li>
          </ul>
          <p>
            For GDPR/CCPA requests, contact <a href="mailto:zenflow.bio@zohomail.eu">zenflow.bio@zohomail.eu</a>.
          </p>
        </article>

        <article className="legal-block">
          <h3>Security</h3>
          <p>
            Passwords are never stored in clear text. We apply industry best practices for access control, HTTPS transport, and session token
            verification on each request.
          </p>
        </article>
      </div>
    </section>
  )
}

export function TermsOfServicePage() {
  return (
    <section className="legal-shell">
      <div className="legal-card">
        <div className="section-kicker">Legal</div>
        <h2>Terms of Service</h2>
        <p className="muted">By using Zenflow, you agree to the following terms.</p>

        <article className="legal-block">
          <h3>User agreement</h3>
          <p>
            Zenflow provides personal productivity and wellness tools. You are responsible for any content you add to your account and for
            keeping your credentials private.
          </p>
        </article>

        <article className="legal-block">
          <h3>Acceptable use</h3>
          <ul>
            <li>Use the service lawfully and without disrupting other users.</li>
            <li>Do not attempt to brute-force, bypass or automate protected auth endpoints.</li>
            <li>Do not upload malicious links or abusive content in notes and journals.</li>
          </ul>
        </article>

        <article className="legal-block">
          <h3>Liability and support</h3>
          <p>
            Zenflow is provided as-is for productivity support. Results vary by person and workflow. We do not guarantee any specific outcome.
            You remain responsible for real-world actions and safety while using focus breaks or workouts.
          </p>
        </article>

        <article className="legal-block">
          <h3>Termination</h3>
          <p>
            Accounts may be paused or terminated for repeated abuse, repeated policy violation, or legal requests.
            You can close your account by contacting support at any time.
          </p>
        </article>
      </div>
    </section>
  )
}

export function CookiePolicyPage() {
  return (
    <section className="legal-shell">
      <div className="legal-card">
        <div className="section-kicker">Policy</div>
        <h2>Cookie Policy</h2>

        <article className="legal-block">
          <h3>What this page covers</h3>
          <p>
            This page explains local browser storage and lightweight cookie usage currently required by the application for secure sessions,
            saved preferences, and user interface state.
          </p>
        </article>

        <article className="legal-block">
          <h3>Types in use</h3>
          <ul>
            <li>Session storage for temporary login state when "Keep me signed in" is disabled.</li>
            <li>Secure cookie/session token used by the existing auth backend integration.</li>
            <li>Analytics tracking calls already configured in your deployment environment.</li>
          </ul>
        </article>

        <article className="legal-block">
          <h3>Manage cookies</h3>
          <p>
            You can clear local cookies and site storage in browser settings. If you are signed out after clearing, sign in again
            using your normal account credentials.
          </p>
        </article>
      </div>
    </section>
  )
}

export function AboutPage() {
  return (
    <section className="legal-shell">
      <div className="legal-card">
        <div className="section-kicker">Company</div>
        <h2>About Zenflow</h2>
        <p>
          Zenflow is a productivity and focus platform built to reduce digital friction and replace procrastination loops with
          small, reliable daily habits.
        </p>

        <article className="legal-block">
          <h3>Mission</h3>
          <p>
            We help users build a healthier focus rhythm through timers, journaling, planning, and lightweight game breaks.
          </p>
        </article>

        <article className="legal-block">
          <h3>Vision</h3>
          <p>
            A world where short, structured sessions outperform endless scrolling and anxiety-driven multitasking.
          </p>
        </article>

        <article className="legal-block">
          <h3>Team</h3>
          <p>
            Independent founder-led team focused on practical growth tools. Community feedback is core to every update cycle.
          </p>
        </article>
      </div>

      <div className="legal-card">
        <div className="section-kicker">Trust & Recognition</div>
        <h3>Why teams use Zenflow</h3>
        <div className="trust-badges" aria-label="Trust badges">
          <span className="trust-badge">SSL enabled</span>
          <span className="trust-badge">Trusted by verified accounts</span>
          <span className="trust-badge">Session-safe token flow</span>
        </div>
        <p className="muted">Security and privacy details are documented in the Privacy and Cookie pages.</p>
      </div>
    </section>
  )
}

export function FAQPage() {
  const faqs = [
    {
      question: 'Can I use Zenflow without an account?',
      answer: 'Yes, for browsing and learning you can use the landing flow. Syncing sessions, notes, and progress requires an account.',
    },
    {
      question: 'Can I link planner tasks to the focus timer?',
      answer: 'Yes. Planner and account tasks can be linked to a focus session directly from their task cards.',
    },
    {
      question: 'Why do I have to verify my email after registration?',
      answer: 'Email verification protects accounts from incorrect addresses and enables password recovery for real users only.',
    },
    {
      question: 'How do I get support?',
      answer: 'Use the Contact page to send a request. We also monitor support email and in-app forms.',
    },
  ]

  return (
    <section className="legal-shell">
      <div className="legal-card">
        <div className="section-kicker">Help</div>
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((item) => (
            <article key={item.question} className="faq-card">
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

type ContactForm = {
  fullName: string
  email: string
  message: string
}

export function ContactPage({ onNotify }: { onNotify?: (msg: string) => void }) {
  const [form, setForm] = useState<ContactForm>({ fullName: '', email: '', message: '' })
  const [status, setStatus] = useState<string>('We usually respond within one business day.')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const fallbackEmail = 'zenflow.bio@zohomail.eu'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!form.fullName.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please complete name, email, and message before sending.')
      return
    }

    setIsSubmitting(true)
    setStatus('Sending your message...')

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    }

    try {
      const response = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setStatus('Message sent successfully. Thanks for reaching out.')
        onNotify?.('Thanks — your message has been sent.')
        setForm({ fullName: '', email: '', message: '' })
        return
      }

      throw new Error(`Server responded with ${response.status}`)
    } catch {
      setStatus('Email client could not be reached automatically. Opening your email app now so you can send directly.')
      const subject = encodeURIComponent('Zenflow contact request')
      const body = encodeURIComponent(
        `Hello Zenflow team,\n\nName: ${payload.fullName}\nEmail: ${payload.email}\n\nMessage:\n${payload.message}`,
      )
      window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${body}`
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="legal-shell">
      <div className="legal-card">
        <div className="section-kicker">Support</div>
        <h2>Contact Zenflow</h2>
        <p>Need help with verification, login, Android download, or feature behavior? Send a note and we will reply with practical steps.</p>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <label>
            Full name
            <input
              required
              aria-required
              type="text"
              value={form.fullName}
              onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))}
              placeholder="Your name"
            />
          </label>
          <label>
            Email
            <input
              required
              aria-required
              type="email"
              value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Message
            <textarea
              required
              aria-required
              value={form.message}
              onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))}
              placeholder="Tell us how we can help"
              rows={5}
            />
          </label>

          {error && <p className="form-feedback error" role="alert">{error}</p>}
          <div className="form-feedback" role="status" aria-live="polite">
            {status}
          </div>

          <div className="controls">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send message'}
            </button>
            <a className="public-link" href={`mailto:${fallbackEmail}`}>
              Write via email
            </a>
          </div>
        </form>
      </div>

      <div className="legal-card">
        <div className="section-kicker">Business details</div>
        <p><strong>Support:</strong> zenflow.bio@zohomail.eu</p>
        <p><strong>Hours:</strong> Monday to Saturday, 10:00–19:00 UTC+1 (informal response windows)</p>
      </div>
    </section>
  )
}

export function InfoPageBreadcrumb({ label }: { label: string }) {
  return (
    <Breadcrumbs items={['Home', label]} />
  )
}
