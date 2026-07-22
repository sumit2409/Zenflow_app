import React, { useEffect, useMemo, useState } from 'react'

const LANGUAGE_STORAGE_KEY = 'zenflow_language'
const TRANSLATE_ELEMENT_ID = 'google_translate_element'
const TRANSLATE_SCRIPT_ID = 'zenflow-google-translate-script'

const europeanLanguages = [
  { code: 'en', label: 'English' },
  { code: 'sq', label: 'Albanian' },
  { code: 'eu', label: 'Basque' },
  { code: 'be', label: 'Belarusian' },
  { code: 'bs', label: 'Bosnian' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'ca', label: 'Catalan' },
  { code: 'hr', label: 'Croatian' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'et', label: 'Estonian' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'gl', label: 'Galician' },
  { code: 'de', label: 'German' },
  { code: 'el', label: 'Greek' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'is', label: 'Icelandic' },
  { code: 'ga', label: 'Irish' },
  { code: 'it', label: 'Italian' },
  { code: 'lv', label: 'Latvian' },
  { code: 'lt', label: 'Lithuanian' },
  { code: 'lb', label: 'Luxembourgish' },
  { code: 'mk', label: 'Macedonian' },
  { code: 'mt', label: 'Maltese' },
  { code: 'no', label: 'Norwegian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'gd', label: 'Scottish Gaelic' },
  { code: 'sr', label: 'Serbian' },
  { code: 'sk', label: 'Slovak' },
  { code: 'sl', label: 'Slovenian' },
  { code: 'es', label: 'Spanish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'cy', label: 'Welsh' },
] as const

type EuropeanLanguageCode = (typeof europeanLanguages)[number]['code']

type GoogleTranslateWindow = Window & {
  google?: {
    translate?: {
      TranslateElement?: {
        new (options: Record<string, unknown>, elementId: string): unknown
        InlineLayout?: { SIMPLE?: string }
      }
    }
  }
  googleTranslateElementInit?: () => void
}

const supportedCodes = new Set<string>(europeanLanguages.map((language) => language.code))

function normalizeLanguageCode(value: string | null | undefined): EuropeanLanguageCode {
  const normalized = (value || 'en').toLowerCase().replace('_', '-').split('-')[0]
  if (normalized === 'nb' || normalized === 'nn') return 'no'
  if (supportedCodes.has(normalized)) return normalized as EuropeanLanguageCode
  return 'en'
}

function readInitialLanguage(): EuropeanLanguageCode {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored) return normalizeLanguageCode(stored)
  } catch {
    // Ignore storage failures and fall back to the browser language.
  }

  return normalizeLanguageCode(navigator.language)
}

function persistTranslateCookie(languageCode: EuropeanLanguageCode) {
  const target = languageCode === 'en' ? '/en/en' : `/en/${languageCode}`
  const cookie = `googtrans=${target}; path=/; max-age=31536000; SameSite=Lax`
  document.cookie = cookie

  const hostname = window.location.hostname
  const looksLikeIp = /^[0-9.]+$/.test(hostname)
  if (hostname && hostname !== 'localhost' && !looksLikeIp) {
    const rootDomain = hostname.split('.').slice(-2).join('.')
    document.cookie = `${cookie}; domain=.${rootDomain}`
  }
}

function syncGoogleTranslateCombo(languageCode: EuropeanLanguageCode) {
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo')
  if (!select) return false

  select.value = languageCode === 'en' ? '' : languageCode
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

export default function LanguageSelector() {
  const [language, setLanguage] = useState<EuropeanLanguageCode>(() => readInitialLanguage())
  const [translatorReady, setTranslatorReady] = useState(false)
  const includedLanguages = useMemo(
    () => europeanLanguages.filter((item) => item.code !== 'en').map((item) => item.code).join(','),
    [],
  )

  useEffect(() => {
    const win = window as GoogleTranslateWindow
    win.googleTranslateElementInit = () => {
      const TranslateElement = win.google?.translate?.TranslateElement
      if (!TranslateElement) return

      const mount = document.getElementById(TRANSLATE_ELEMENT_ID)
      if (mount && mount.childElementCount === 0) {
        new TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages,
            autoDisplay: false,
            layout: TranslateElement.InlineLayout?.SIMPLE,
          },
          TRANSLATE_ELEMENT_ID,
        )
      }
      setTranslatorReady(true)
    }

    if (document.getElementById(TRANSLATE_SCRIPT_ID)) {
      win.googleTranslateElementInit()
      return
    }

    const script = document.createElement('script')
    script.id = TRANSLATE_SCRIPT_ID
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.head.appendChild(script)
  }, [includedLanguages])

  useEffect(() => {
    document.documentElement.lang = language
    persistTranslateCookie(language)

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The selected language still applies for this session.
    }

    if (syncGoogleTranslateCombo(language)) return

    if (!translatorReady && language === 'en') return
    const retry = window.setTimeout(() => {
      syncGoogleTranslateCombo(language)
    }, 700)

    return () => window.clearTimeout(retry)
  }, [language, translatorReady])

  return (
    <label className="language-selector notranslate" aria-label="Website language">
      <span className="sr-only">Website language</span>
      <select value={language} onChange={(event) => setLanguage(normalizeLanguageCode(event.target.value))}>
        {europeanLanguages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
      <div id={TRANSLATE_ELEMENT_ID} className="google-translate-mount" aria-hidden="true" />
    </label>
  )
}
