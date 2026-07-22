import React, { useMemo, useState } from 'react'

type SectionKey =
  | 'profile'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'publications'
  | 'certifications'
  | 'languages'
  | 'references'

type PersonalInfo = {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  summary: string
  photoDataUrl: string
}

type ExperienceItem = {
  id: string
  role: string
  company: string
  location: string
  start: string
  end: string
  current: boolean
  bullets: string
}

type EducationItem = {
  id: string
  degree: string
  school: string
  location: string
  start: string
  end: string
  details: string
}

type ProjectItem = {
  id: string
  name: string
  link: string
  details: string
}

type SimpleItem = {
  id: string
  title: string
  detail: string
}

type PublicationItem = {
  id: string
  title: string
  venue: string
  year: string
  link: string
  details: string
}

type ReferenceItem = {
  id: string
  name: string
  role: string
  company: string
  email: string
  phone: string
  note: string
}

type LanguageItem = {
  id: string
  name: string
  level: string
}

type CVData = {
  personal: PersonalInfo
  skills: string
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  publications: PublicationItem[]
  certifications: SimpleItem[]
  languages: LanguageItem[]
  references: ReferenceItem[]
  sectionOrder: SectionKey[]
  visibleSections: Record<SectionKey, boolean>
}

type CVTemplate = 'modern' | 'classic' | 'compact'
type AccentColor = 'red' | 'black' | 'blue' | 'green'
type EditorSection = 'profile' | 'experience' | 'education' | 'projects' | 'publications' | 'references' | 'extras' | 'sections'
type EditableListKey = 'experience' | 'education' | 'projects' | 'publications' | 'certifications' | 'languages' | 'references'

const sectionLabels: Record<SectionKey, string> = {
  profile: 'Profile',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  publications: 'Publications',
  certifications: 'Certifications',
  languages: 'Languages',
  references: 'References',
}

const sectionDescriptions: Record<SectionKey, string> = {
  profile: 'Professional summary',
  skills: 'Keywords and strengths',
  experience: 'Roles and achievements',
  education: 'Degrees and courses',
  projects: 'Selected work',
  publications: 'Articles, papers, talks, or research',
  certifications: 'Certificates and awards',
  languages: 'Spoken or written languages',
  references: 'People who can recommend you',
}

const defaultSectionOrder: SectionKey[] = [
  'profile',
  'skills',
  'experience',
  'education',
  'projects',
  'publications',
  'certifications',
  'languages',
  'references',
]

const defaultVisibleSections = defaultSectionOrder.reduce(
  (sections, section) => ({ ...sections, [section]: true }),
  {} as Record<SectionKey, boolean>,
)

const accentColors: Record<AccentColor, string> = {
  red: '#e11931',
  black: '#191919',
  blue: '#1167d8',
  green: '#087f6f',
}

const defaultCV: CVData = {
  personal: {
    fullName: 'Avery Martin',
    headline: 'Product-focused Frontend Developer',
    email: 'avery@example.com',
    phone: '+33 6 12 34 56 78',
    location: 'Paris, France',
    website: 'avery.dev',
    linkedin: 'linkedin.com/in/averymartin',
    summary:
      'Frontend developer with 4+ years building responsive web apps, design systems, and dashboards. Strong at turning ambiguous product ideas into polished user experiences.',
    photoDataUrl: '',
  },
  skills: 'React, TypeScript, JavaScript, CSS, Design systems, Accessibility, REST APIs, Product thinking, Analytics',
  experience: [
    {
      id: 'exp-1',
      role: 'Frontend Developer',
      company: 'Northstar Studio',
      location: 'Remote',
      start: '2022',
      end: '',
      current: true,
      bullets:
        'Built reusable React components used across three product teams.\nImproved dashboard load performance by 34% through bundle splitting and data-loading cleanup.\nPartnered with design to ship accessible forms, tables, and onboarding flows.',
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'BSc Computer Science',
      school: 'University of Lyon',
      location: 'Lyon, France',
      start: '2018',
      end: '2021',
      details: 'Coursework in web engineering, databases, algorithms, and human-computer interaction.',
    },
  ],
  projects: [
    {
      id: 'project-1',
      name: 'Focus Analytics Dashboard',
      link: 'github.com/avery/focus-dashboard',
      details:
        'Created a personal analytics dashboard with charts, session tagging, CSV export, and responsive layouts.',
    },
  ],
  publications: [
    {
      id: 'pub-1',
      title: 'Designing Calm Dashboards for Busy Teams',
      venue: 'Frontend Notes',
      year: '2024',
      link: 'frontendnotes.example/calm-dashboards',
      details: 'Short article about reducing cognitive load in operational interfaces.',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      title: 'Google UX Design Certificate',
      detail: 'Completed 2023',
    },
  ],
  languages: [
    { id: 'lang-1', name: 'English', level: 'Fluent' },
    { id: 'lang-2', name: 'French', level: 'Professional' },
  ],
  references: [
    {
      id: 'ref-1',
      name: 'Maya Chen',
      role: 'Product Lead',
      company: 'Northstar Studio',
      email: 'maya@example.com',
      phone: '',
      note: 'Managed cross-functional dashboard work from 2022 to 2024.',
    },
  ],
  sectionOrder: defaultSectionOrder,
  visibleSections: defaultVisibleSections,
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatRange(start: string, end: string, current?: boolean) {
  if (!start && !end && !current) return ''
  const finish = current ? 'Present' : end
  if (!start) return finish
  if (!finish) return start
  return `${start} - ${finish}`
}

function escapePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const int = Number.parseInt(normalized, 16)
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255]
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const normalized = text.trim()
  if (!normalized) return []

  const words = normalized.split(/\s+/)
  const lines: string[] = []
  let current = ''
  const maxChars = Math.max(18, Math.floor(maxWidth / (fontSize * 0.52)))

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      return
    }
    if (current) lines.push(current)
    current = word
  })

  if (current) lines.push(current)
  return lines
}

function imageDataUrlToHex(dataUrl: string) {
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) return null

  try {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const chunks: string[] = []
    for (let index = 0; index < binary.length; index += 1) {
      chunks.push(binary.charCodeAt(index).toString(16).padStart(2, '0'))
    }
    return chunks.join('')
  } catch {
    return null
  }
}

function resizePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The photo could not be read.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('The photo could not be loaded.'))
      image.onload = () => {
        const size = 420
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('The photo could not be processed.'))
          return
        }

        const scale = Math.max(size / image.width, size / image.height)
        const sourceWidth = size / scale
        const sourceHeight = size / scale
        const sourceX = (image.width - sourceWidth) / 2
        const sourceY = (image.height - sourceHeight) / 2
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, size, size)
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function hasSectionContent(data: CVData, section: SectionKey) {
  switch (section) {
    case 'profile':
      return Boolean(data.personal.summary.trim())
    case 'skills':
      return splitCsv(data.skills).length > 0
    case 'experience':
      return data.experience.some((item) => item.role.trim() || item.company.trim() || item.bullets.trim())
    case 'education':
      return data.education.some((item) => item.degree.trim() || item.school.trim() || item.details.trim())
    case 'projects':
      return data.projects.some((item) => item.name.trim() || item.details.trim())
    case 'publications':
      return data.publications.some((item) => item.title.trim() || item.venue.trim() || item.details.trim())
    case 'certifications':
      return data.certifications.some((item) => item.title.trim() || item.detail.trim())
    case 'languages':
      return data.languages.some((item) => item.name.trim() || item.level.trim())
    case 'references':
      return data.references.some((item) => item.name.trim() || item.role.trim() || item.company.trim() || item.email.trim() || item.note.trim())
    default:
      return false
  }
}

function buildPdf(data: CVData, template: CVTemplate, accent: AccentColor) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = template === 'compact' ? 36 : 44
  const contentWidth = pageWidth - margin * 2
  const photoHex = imageDataUrlToHex(data.personal.photoDataUrl)
  const photoSize = photoHex ? (template === 'compact' ? 62 : 78) : 0
  const headerTextWidth = photoHex ? contentWidth - photoSize - 18 : contentWidth
  const accentRgb = hexToRgb(accentColors[accent])
  const black: [number, number, number] = [0.1, 0.1, 0.1]
  const muted: [number, number, number] = [0.36, 0.36, 0.36]
  const pages: string[] = ['']
  let y = pageHeight - margin

  function append(value: string) {
    pages[pages.length - 1] += value
  }

  function newPage() {
    pages.push('')
    y = pageHeight - margin
  }

  function ensure(space: number) {
    if (y - space < margin) newPage()
  }

  function textLine(
    value: string,
    x: number,
    size: number,
    font: 'F1' | 'F2' = 'F1',
    color: [number, number, number] = black,
    lineHeight = size + 4,
  ) {
    ensure(lineHeight + 2)
    append(
      `BT /${font} ${size} Tf ${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`,
    )
    y -= lineHeight
  }

  function wrapped(value: string, x: number, width: number, size: number, font: 'F1' | 'F2' = 'F1', color: [number, number, number] = black) {
    wrapText(value, width, size).forEach((line) => textLine(line, x, size, font, color, size + 4))
  }

  function rule() {
    ensure(14)
    append(`${accentRgb[0].toFixed(3)} ${accentRgb[1].toFixed(3)} ${accentRgb[2].toFixed(3)} rg ${margin.toFixed(2)} ${(y - 3).toFixed(2)} ${contentWidth.toFixed(2)} 1.4 re f\n`)
    y -= 14
  }

  function section(title: string) {
    y -= 6
    textLine(title.toUpperCase(), margin, 10, 'F2', accentRgb, 14)
    rule()
  }

  function itemHeading(title: string, meta: string) {
    textLine(title, margin, 11, 'F2', black, 15)
    if (meta) textLine(meta, margin, 9, 'F1', muted, 13)
  }

  function renderHeader() {
    if (photoHex) {
      const imageX = pageWidth - margin - photoSize
      const imageY = y - photoSize + 2
      append(`q ${photoSize} 0 0 ${photoSize} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm /Im1 Do Q\n`)
    }

    textLine(data.personal.fullName || 'Your Name', margin, template === 'compact' ? 22 : 28, 'F2', accentRgb, template === 'compact' ? 28 : 34)
    if (data.personal.headline) textLine(data.personal.headline, margin, 12, 'F2', black, 18)
    const contact = [
      data.personal.email,
      data.personal.phone,
      data.personal.location,
      data.personal.website,
      data.personal.linkedin,
    ].filter(Boolean)
    if (contact.length > 0) wrapped(contact.join('  |  '), margin, headerTextWidth, 9, 'F1', muted)
    if (photoHex) y = Math.min(y, pageHeight - margin - photoSize - 16)
    y -= 6
  }

  function renderProfile() {
    section('Profile')
    wrapped(data.personal.summary, margin, contentWidth, 10, 'F1', black)
  }

  function renderSkills() {
    section('Skills')
    wrapped(splitCsv(data.skills).join('  |  '), margin, contentWidth, 10, 'F1', black)
  }

  function renderExperience() {
    section('Experience')
    data.experience.forEach((item) => {
      if (!item.role && !item.company && !item.bullets) return
      const title = [item.role, item.company].filter(Boolean).join(' - ')
      const meta = [formatRange(item.start, item.end, item.current), item.location].filter(Boolean).join(' | ')
      itemHeading(title || 'Experience', meta)
      splitLines(item.bullets).forEach((line) => wrapped(`- ${line}`, margin + 10, contentWidth - 10, 9.5, 'F1', black))
      y -= 4
    })
  }

  function renderEducation() {
    section('Education')
    data.education.forEach((item) => {
      if (!item.degree && !item.school && !item.details) return
      const title = [item.degree, item.school].filter(Boolean).join(' - ')
      const meta = [formatRange(item.start, item.end), item.location].filter(Boolean).join(' | ')
      itemHeading(title || 'Education', meta)
      if (item.details) wrapped(item.details, margin, contentWidth, 9.5, 'F1', black)
      y -= 4
    })
  }

  function renderProjects() {
    section('Projects')
    data.projects.forEach((item) => {
      if (!item.name && !item.details) return
      itemHeading(item.name || 'Project', item.link)
      splitLines(item.details).forEach((line) => wrapped(`- ${line}`, margin + 10, contentWidth - 10, 9.5, 'F1', black))
      y -= 4
    })
  }

  function renderPublications() {
    section('Publications')
    data.publications.forEach((item) => {
      if (!item.title && !item.venue && !item.details) return
      const meta = [item.venue, item.year, item.link].filter(Boolean).join(' | ')
      itemHeading(item.title || 'Publication', meta)
      if (item.details) wrapped(item.details, margin, contentWidth, 9.5, 'F1', black)
      y -= 4
    })
  }

  function renderCertifications() {
    section('Certifications')
    data.certifications
      .filter((item) => item.title || item.detail)
      .forEach((item) => wrapped(`- ${item.title}${item.detail ? ` - ${item.detail}` : ''}`, margin + 10, contentWidth - 10, 9.5, 'F1', black))
  }

  function renderLanguages() {
    section('Languages')
    data.languages
      .filter((item) => item.name || item.level)
      .forEach((item) => wrapped(`- ${item.name}${item.level ? ` - ${item.level}` : ''}`, margin + 10, contentWidth - 10, 9.5, 'F1', black))
  }

  function renderReferences() {
    section('References')
    data.references.forEach((item) => {
      if (!item.name && !item.role && !item.company && !item.email && !item.note) return
      const title = [item.name, item.role].filter(Boolean).join(' - ')
      const meta = [item.company, item.email, item.phone].filter(Boolean).join(' | ')
      itemHeading(title || 'Reference', meta)
      if (item.note) wrapped(item.note, margin, contentWidth, 9.5, 'F1', black)
      y -= 4
    })
  }

  const renderers: Record<SectionKey, () => void> = {
    profile: renderProfile,
    skills: renderSkills,
    experience: renderExperience,
    education: renderEducation,
    projects: renderProjects,
    publications: renderPublications,
    certifications: renderCertifications,
    languages: renderLanguages,
    references: renderReferences,
  }

  renderHeader()
  data.sectionOrder.forEach((sectionKey) => {
    if (!data.visibleSections[sectionKey] || !hasSectionContent(data, sectionKey)) return
    renderers[sectionKey]()
  })

  const objects: string[] = []
  const setObject = (id: number, body: string) => {
    objects[id - 1] = body
  }
  setObject(1, '<< /Type /Catalog /Pages 2 0 R >>')
  setObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  setObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let nextId = 5
  const photoObjectId = photoHex ? nextId : null
  if (photoHex && photoObjectId) {
    nextId += 1
    setObject(
      photoObjectId,
      `<< /Type /XObject /Subtype /Image /Width 420 /Height 420 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${photoHex.length + 2} >>\nstream\n${photoHex}>\nendstream`,
    )
  }

  const pageIds: number[] = []
  pages.forEach((content) => {
    const contentId = nextId
    const pageId = nextId + 1
    nextId += 2
    pageIds.push(pageId)
    setObject(contentId, `<< /Length ${content.length} >>\nstream\n${content}endstream`)
    const xObjectResource = photoObjectId ? ` /XObject << /Im1 ${photoObjectId} 0 R >>` : ''
    setObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xObjectResource} >> /Contents ${contentId} 0 R >>`,
    )
  })
  setObject(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefAt = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return pdf
}

function downloadPdf(data: CVData, template: CVTemplate, accent: AccentColor) {
  const pdf = buildPdf(data, template, accent)
  const blob = new Blob([pdf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const fileName = (data.personal.fullName || 'zenflow-cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url
  link.download = `${fileName || 'zenflow-cv'}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label>
      {label}
      <textarea value={value} placeholder={placeholder} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default function CVMaker() {
  const [cv, setCv] = useState<CVData>(defaultCV)
  const [template, setTemplate] = useState<CVTemplate>('modern')
  const [accent, setAccent] = useState<AccentColor>('red')
  const [activeSection, setActiveSection] = useState<EditorSection>('profile')
  const [photoError, setPhotoError] = useState<string | null>(null)

  const completion = useMemo(() => {
    const checks = [
      Boolean(cv.personal.fullName.trim()),
      Boolean(cv.personal.email.trim() || cv.personal.phone.trim()),
      Boolean(cv.personal.summary.trim()),
      splitCsv(cv.skills).length >= 4,
      cv.experience.some((item) => item.role.trim() || item.company.trim()),
      cv.education.some((item) => item.degree.trim() || item.school.trim()),
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [cv])

  const updatePersonal = (key: keyof PersonalInfo, value: string) => {
    setCv((current) => ({
      ...current,
      personal: { ...current.personal, [key]: value },
    }))
  }

  const updateListItem = <T extends { id: string }>(key: EditableListKey, itemId: string, patch: Partial<T>) => {
    setCv((current) => ({
      ...current,
      [key]: (current[key] as T[]).map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }))
  }

  const removeListItem = (key: EditableListKey, itemId: string) => {
    setCv((current) => ({
      ...current,
      [key]: (current[key] as Array<{ id: string }>).filter((item) => item.id !== itemId),
    }))
  }

  const addExperience = () => {
    setCv((current) => ({
      ...current,
      experience: [
        ...current.experience,
        { id: createId('exp'), role: '', company: '', location: '', start: '', end: '', current: false, bullets: '' },
      ],
    }))
  }

  const addEducation = () => {
    setCv((current) => ({
      ...current,
      education: [...current.education, { id: createId('edu'), degree: '', school: '', location: '', start: '', end: '', details: '' }],
    }))
  }

  const addProject = () => {
    setCv((current) => ({
      ...current,
      projects: [...current.projects, { id: createId('project'), name: '', link: '', details: '' }],
    }))
  }

  const addPublication = () => {
    setCv((current) => ({
      ...current,
      publications: [...current.publications, { id: createId('pub'), title: '', venue: '', year: '', link: '', details: '' }],
      visibleSections: { ...current.visibleSections, publications: true },
    }))
  }

  const addReference = () => {
    setCv((current) => ({
      ...current,
      references: [...current.references, { id: createId('ref'), name: '', role: '', company: '', email: '', phone: '', note: '' }],
      visibleSections: { ...current.visibleSections, references: true },
    }))
  }

  const addCertification = () => {
    setCv((current) => ({
      ...current,
      certifications: [...current.certifications, { id: createId('cert'), title: '', detail: '' }],
      visibleSections: { ...current.visibleSections, certifications: true },
    }))
  }

  const addLanguage = () => {
    setCv((current) => ({
      ...current,
      languages: [...current.languages, { id: createId('lang'), name: '', level: '' }],
      visibleSections: { ...current.visibleSections, languages: true },
    }))
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPhotoError(null)
    resizePhoto(file)
      .then((photoDataUrl) => updatePersonal('photoDataUrl', photoDataUrl))
      .catch((error: Error) => setPhotoError(error.message))
  }

  const setSectionVisibility = (sectionKey: SectionKey, visible: boolean) => {
    setCv((current) => ({
      ...current,
      visibleSections: { ...current.visibleSections, [sectionKey]: visible },
    }))
  }

  const moveSection = (sectionKey: SectionKey, direction: -1 | 1) => {
    setCv((current) => {
      const from = current.sectionOrder.indexOf(sectionKey)
      const to = from + direction
      if (from < 0 || to < 0 || to >= current.sectionOrder.length) return current
      const nextOrder = [...current.sectionOrder]
      const moving = nextOrder[from]
      nextOrder[from] = nextOrder[to]
      nextOrder[to] = moving
      return { ...current, sectionOrder: nextOrder }
    })
  }

  const renderPreviewSection = (sectionKey: SectionKey) => {
    if (!cv.visibleSections[sectionKey] || !hasSectionContent(cv, sectionKey)) return null

    if (sectionKey === 'profile') {
      return (
        <section key={sectionKey}>
          <h3>Profile</h3>
          <p>{cv.personal.summary}</p>
        </section>
      )
    }

    if (sectionKey === 'skills') {
      return (
        <section key={sectionKey}>
          <h3>Skills</h3>
          <div className="cv-skill-list">
            {splitCsv(cv.skills).map((skill) => <span key={skill}>{skill}</span>)}
          </div>
        </section>
      )
    }

    if (sectionKey === 'experience') {
      return (
        <section key={sectionKey}>
          <h3>Experience</h3>
          {cv.experience
            .filter((item) => item.role || item.company || item.bullets)
            .map((item) => (
              <article key={item.id} className="cv-preview-item">
                <strong>{[item.role, item.company].filter(Boolean).join(' - ') || 'Experience'}</strong>
                <small>{[formatRange(item.start, item.end, item.current), item.location].filter(Boolean).join(' | ')}</small>
                <ul>
                  {splitLines(item.bullets).map((line, index) => <li key={`${item.id}-${index}`}>{line}</li>)}
                </ul>
              </article>
            ))}
        </section>
      )
    }

    if (sectionKey === 'education') {
      return (
        <section key={sectionKey}>
          <h3>Education</h3>
          {cv.education
            .filter((item) => item.degree || item.school || item.details)
            .map((item) => (
              <article key={item.id} className="cv-preview-item">
                <strong>{[item.degree, item.school].filter(Boolean).join(' - ') || 'Education'}</strong>
                <small>{[formatRange(item.start, item.end), item.location].filter(Boolean).join(' | ')}</small>
                {item.details && <p>{item.details}</p>}
              </article>
            ))}
        </section>
      )
    }

    if (sectionKey === 'projects') {
      return (
        <section key={sectionKey}>
          <h3>Projects</h3>
          {cv.projects
            .filter((item) => item.name || item.details)
            .map((item) => (
              <article key={item.id} className="cv-preview-item">
                <strong>{item.name || 'Project'}</strong>
                {item.link && <small>{item.link}</small>}
                <ul>{splitLines(item.details).map((line, index) => <li key={`${item.id}-${index}`}>{line}</li>)}</ul>
              </article>
            ))}
        </section>
      )
    }

    if (sectionKey === 'publications') {
      return (
        <section key={sectionKey}>
          <h3>Publications</h3>
          {cv.publications
            .filter((item) => item.title || item.venue || item.details)
            .map((item) => (
              <article key={item.id} className="cv-preview-item">
                <strong>{item.title || 'Publication'}</strong>
                <small>{[item.venue, item.year, item.link].filter(Boolean).join(' | ')}</small>
                {item.details && <p>{item.details}</p>}
              </article>
            ))}
        </section>
      )
    }

    if (sectionKey === 'certifications') {
      return (
        <section key={sectionKey}>
          <h3>Certifications</h3>
          <div className="cv-two-column-list">
            {cv.certifications.filter((item) => item.title || item.detail).map((item) => (
              <span key={item.id}>{item.title}{item.detail ? ` - ${item.detail}` : ''}</span>
            ))}
          </div>
        </section>
      )
    }

    if (sectionKey === 'languages') {
      return (
        <section key={sectionKey}>
          <h3>Languages</h3>
          <div className="cv-two-column-list">
            {cv.languages.filter((item) => item.name || item.level).map((item) => (
              <span key={item.id}>{item.name}{item.level ? ` - ${item.level}` : ''}</span>
            ))}
          </div>
        </section>
      )
    }

    return (
      <section key={sectionKey}>
        <h3>References</h3>
        {cv.references
          .filter((item) => item.name || item.role || item.company || item.email || item.note)
          .map((item) => (
            <article key={item.id} className="cv-preview-item">
              <strong>{[item.name, item.role].filter(Boolean).join(' - ') || 'Reference'}</strong>
              <small>{[item.company, item.email, item.phone].filter(Boolean).join(' | ')}</small>
              {item.note && <p>{item.note}</p>}
            </article>
          ))}
      </section>
    )
  }

  return (
    <div className="cv-maker">
      <div className="module-meta">
        <h2>CV Maker</h2>
        <p>Build a polished CV in your browser and download it as a PDF. Your data is not stored or uploaded after you make the CV.</p>
        <div className="session-reward">Calm down, it is still free. You only need to login before using the CV maker.</div>
      </div>

      <div className="cv-layout">
        <section className="cv-editor card inset-card">
          <div className="cv-toolbar">
            <div>
              <div className="section-kicker">Builder</div>
              <h3>CV details</h3>
            </div>
            <button type="button" className="primary-cta" onClick={() => downloadPdf(cv, template, accent)}>
              Download PDF
            </button>
          </div>

          <div className="cv-privacy-note">
            We do not store this CV data. It stays in browser memory and disappears when you refresh or close the tab unless you download the PDF.
          </div>

          <div className="cv-tabs" role="tablist" aria-label="CV sections">
            {[
              ['profile', 'Profile'],
              ['experience', 'Experience'],
              ['education', 'Education'],
              ['projects', 'Projects'],
              ['publications', 'Publications'],
              ['references', 'References'],
              ['extras', 'Extras'],
              ['sections', 'Sections'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`cv-tab ${activeSection === id ? 'active' : ''}`}
                onClick={() => setActiveSection(id as EditorSection)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeSection === 'profile' && (
            <div className="cv-section-form">
              <div className="cv-photo-editor">
                <div className="cv-photo-preview">
                  {cv.personal.photoDataUrl ? <img src={cv.personal.photoDataUrl} alt="" /> : <span>Photo</span>}
                </div>
                <div className="cv-photo-actions">
                  <label className="cv-upload-btn">
                    Add photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                  {cv.personal.photoDataUrl && (
                    <button type="button" className="ghost-btn" onClick={() => updatePersonal('photoDataUrl', '')}>
                      Remove photo
                    </button>
                  )}
                  <small>Optional. The image is resized in this tab and not stored by Zenflow.</small>
                  {photoError && <small className="cv-error">{photoError}</small>}
                </div>
              </div>

              <div className="cv-field-grid">
                <Field label="Full name" value={cv.personal.fullName} onChange={(value) => updatePersonal('fullName', value)} />
                <Field label="Headline" value={cv.personal.headline} onChange={(value) => updatePersonal('headline', value)} />
                <Field label="Email" value={cv.personal.email} onChange={(value) => updatePersonal('email', value)} type="email" />
                <Field label="Phone" value={cv.personal.phone} onChange={(value) => updatePersonal('phone', value)} />
                <Field label="Location" value={cv.personal.location} onChange={(value) => updatePersonal('location', value)} />
                <Field label="Website" value={cv.personal.website} onChange={(value) => updatePersonal('website', value)} />
                <Field label="LinkedIn" value={cv.personal.linkedin} onChange={(value) => updatePersonal('linkedin', value)} />
              </div>
              <TextArea label="Professional summary" value={cv.personal.summary} onChange={(value) => updatePersonal('summary', value)} rows={5} />
              <TextArea label="Skills, separated by commas" value={cv.skills} onChange={(value) => setCv((current) => ({ ...current, skills: value }))} rows={3} />
            </div>
          )}

          {activeSection === 'experience' && (
            <div className="cv-section-form">
              {cv.experience.map((item, index) => (
                <article key={item.id} className="cv-edit-card">
                  <div className="cv-edit-card-head">
                    <strong>Experience {index + 1}</strong>
                    <button type="button" className="ghost-btn" onClick={() => removeListItem('experience', item.id)}>Remove</button>
                  </div>
                  <div className="cv-field-grid">
                    <Field label="Role" value={item.role} onChange={(value) => updateListItem<ExperienceItem>('experience', item.id, { role: value })} />
                    <Field label="Company" value={item.company} onChange={(value) => updateListItem<ExperienceItem>('experience', item.id, { company: value })} />
                    <Field label="Location" value={item.location} onChange={(value) => updateListItem<ExperienceItem>('experience', item.id, { location: value })} />
                    <Field label="Start" value={item.start} onChange={(value) => updateListItem<ExperienceItem>('experience', item.id, { start: value })} />
                    <Field label="End" value={item.end} onChange={(value) => updateListItem<ExperienceItem>('experience', item.id, { end: value })} />
                    <label className="cv-check-row">
                      <input
                        type="checkbox"
                        checked={item.current}
                        onChange={(event) => updateListItem<ExperienceItem>('experience', item.id, { current: event.target.checked })}
                      />
                      <span>Current role</span>
                    </label>
                  </div>
                  <TextArea label="Achievements, one per line" value={item.bullets} onChange={(value) => updateListItem<ExperienceItem>('experience', item.id, { bullets: value })} rows={5} />
                </article>
              ))}
              <button type="button" className="ghost-btn" onClick={addExperience}>Add experience</button>
            </div>
          )}

          {activeSection === 'education' && (
            <div className="cv-section-form">
              {cv.education.map((item, index) => (
                <article key={item.id} className="cv-edit-card">
                  <div className="cv-edit-card-head">
                    <strong>Education {index + 1}</strong>
                    <button type="button" className="ghost-btn" onClick={() => removeListItem('education', item.id)}>Remove</button>
                  </div>
                  <div className="cv-field-grid">
                    <Field label="Degree" value={item.degree} onChange={(value) => updateListItem<EducationItem>('education', item.id, { degree: value })} />
                    <Field label="School" value={item.school} onChange={(value) => updateListItem<EducationItem>('education', item.id, { school: value })} />
                    <Field label="Location" value={item.location} onChange={(value) => updateListItem<EducationItem>('education', item.id, { location: value })} />
                    <Field label="Start" value={item.start} onChange={(value) => updateListItem<EducationItem>('education', item.id, { start: value })} />
                    <Field label="End" value={item.end} onChange={(value) => updateListItem<EducationItem>('education', item.id, { end: value })} />
                  </div>
                  <TextArea label="Details" value={item.details} onChange={(value) => updateListItem<EducationItem>('education', item.id, { details: value })} rows={3} />
                </article>
              ))}
              <button type="button" className="ghost-btn" onClick={addEducation}>Add education</button>
            </div>
          )}

          {activeSection === 'projects' && (
            <div className="cv-section-form">
              {cv.projects.map((item, index) => (
                <article key={item.id} className="cv-edit-card">
                  <div className="cv-edit-card-head">
                    <strong>Project {index + 1}</strong>
                    <button type="button" className="ghost-btn" onClick={() => removeListItem('projects', item.id)}>Remove</button>
                  </div>
                  <div className="cv-field-grid">
                    <Field label="Project name" value={item.name} onChange={(value) => updateListItem<ProjectItem>('projects', item.id, { name: value })} />
                    <Field label="Link" value={item.link} onChange={(value) => updateListItem<ProjectItem>('projects', item.id, { link: value })} />
                  </div>
                  <TextArea label="Project details, one point per line" value={item.details} onChange={(value) => updateListItem<ProjectItem>('projects', item.id, { details: value })} rows={4} />
                </article>
              ))}
              <button type="button" className="ghost-btn" onClick={addProject}>Add project</button>
            </div>
          )}

          {activeSection === 'publications' && (
            <div className="cv-section-form">
              {cv.publications.map((item, index) => (
                <article key={item.id} className="cv-edit-card">
                  <div className="cv-edit-card-head">
                    <strong>Publication {index + 1}</strong>
                    <button type="button" className="ghost-btn" onClick={() => removeListItem('publications', item.id)}>Remove</button>
                  </div>
                  <div className="cv-field-grid">
                    <Field label="Title" value={item.title} onChange={(value) => updateListItem<PublicationItem>('publications', item.id, { title: value })} />
                    <Field label="Venue" value={item.venue} onChange={(value) => updateListItem<PublicationItem>('publications', item.id, { venue: value })} />
                    <Field label="Year" value={item.year} onChange={(value) => updateListItem<PublicationItem>('publications', item.id, { year: value })} />
                    <Field label="Link" value={item.link} onChange={(value) => updateListItem<PublicationItem>('publications', item.id, { link: value })} />
                  </div>
                  <TextArea label="Notes" value={item.details} onChange={(value) => updateListItem<PublicationItem>('publications', item.id, { details: value })} rows={3} />
                </article>
              ))}
              <button type="button" className="ghost-btn" onClick={addPublication}>Add publication</button>
            </div>
          )}

          {activeSection === 'references' && (
            <div className="cv-section-form">
              {cv.references.map((item, index) => (
                <article key={item.id} className="cv-edit-card">
                  <div className="cv-edit-card-head">
                    <strong>Reference {index + 1}</strong>
                    <button type="button" className="ghost-btn" onClick={() => removeListItem('references', item.id)}>Remove</button>
                  </div>
                  <div className="cv-field-grid">
                    <Field label="Name" value={item.name} onChange={(value) => updateListItem<ReferenceItem>('references', item.id, { name: value })} />
                    <Field label="Role" value={item.role} onChange={(value) => updateListItem<ReferenceItem>('references', item.id, { role: value })} />
                    <Field label="Company" value={item.company} onChange={(value) => updateListItem<ReferenceItem>('references', item.id, { company: value })} />
                    <Field label="Email" value={item.email} onChange={(value) => updateListItem<ReferenceItem>('references', item.id, { email: value })} type="email" />
                    <Field label="Phone" value={item.phone} onChange={(value) => updateListItem<ReferenceItem>('references', item.id, { phone: value })} />
                  </div>
                  <TextArea label="Reference note" value={item.note} onChange={(value) => updateListItem<ReferenceItem>('references', item.id, { note: value })} rows={3} />
                </article>
              ))}
              <button type="button" className="ghost-btn" onClick={addReference}>Add reference</button>
            </div>
          )}

          {activeSection === 'extras' && (
            <div className="cv-section-form">
              <div className="cv-subsection-head">
                <h4>Certifications</h4>
                <button type="button" className="ghost-btn" onClick={addCertification}>Add certification</button>
              </div>
              {cv.certifications.map((item) => (
                <div key={item.id} className="cv-inline-row">
                  <Field label="Title" value={item.title} onChange={(value) => updateListItem<SimpleItem>('certifications', item.id, { title: value })} />
                  <Field label="Detail" value={item.detail} onChange={(value) => updateListItem<SimpleItem>('certifications', item.id, { detail: value })} />
                  <button type="button" className="ghost-btn" onClick={() => removeListItem('certifications', item.id)}>Remove</button>
                </div>
              ))}

              <div className="cv-subsection-head">
                <h4>Languages</h4>
                <button type="button" className="ghost-btn" onClick={addLanguage}>Add language</button>
              </div>
              {cv.languages.map((item) => (
                <div key={item.id} className="cv-inline-row">
                  <Field label="Language" value={item.name} onChange={(value) => updateListItem<LanguageItem>('languages', item.id, { name: value })} />
                  <Field label="Level" value={item.level} onChange={(value) => updateListItem<LanguageItem>('languages', item.id, { level: value })} />
                  <button type="button" className="ghost-btn" onClick={() => removeListItem('languages', item.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'sections' && (
            <div className="cv-section-form">
              <div className="cv-privacy-note">
                Add a section by turning it on, remove one by turning it off, and use Up or Down to change the order in the CV and PDF.
              </div>
              <div className="cv-section-order-list">
                {cv.sectionOrder.map((sectionKey, index) => {
                  const visible = cv.visibleSections[sectionKey]
                  return (
                    <div key={sectionKey} className={`cv-section-row ${visible ? 'active' : ''}`}>
                      <div>
                        <strong>{sectionLabels[sectionKey]}</strong>
                        <small>{sectionDescriptions[sectionKey]}</small>
                      </div>
                      <div className="cv-section-actions">
                        <button type="button" className="ghost-btn" onClick={() => setSectionVisibility(sectionKey, !visible)}>
                          {visible ? 'Remove' : 'Add'}
                        </button>
                        <button type="button" className="ghost-btn" disabled={index === 0} onClick={() => moveSection(sectionKey, -1)}>
                          Up
                        </button>
                        <button type="button" className="ghost-btn" disabled={index === cv.sectionOrder.length - 1} onClick={() => moveSection(sectionKey, 1)}>
                          Down
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="cv-preview-panel">
          <div className="cv-preview-controls card">
            <div>
              <div className="section-kicker">Preview</div>
              <h3>Live CV</h3>
            </div>
            <div className="cv-select-grid">
              <label>
                Template
                <select value={template} onChange={(event) => setTemplate(event.target.value as CVTemplate)}>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label>
                Accent
                <select value={accent} onChange={(event) => setAccent(event.target.value as AccentColor)}>
                  <option value="red">Red</option>
                  <option value="black">Black</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                </select>
              </label>
            </div>
            <div className="cv-score">
              <strong>{completion}%</strong>
              <span>CV completeness</span>
            </div>
          </div>

          <div className={`cv-paper cv-template-${template}`} style={{ '--cv-accent': accentColors[accent] } as React.CSSProperties}>
            <header className={`cv-paper-head ${cv.personal.photoDataUrl ? 'has-photo' : ''}`}>
              <div className="cv-paper-title">
                <h2>{cv.personal.fullName || 'Your Name'}</h2>
                <p>{cv.personal.headline || 'Professional headline'}</p>
                <div className="cv-contact-line">
                  {[cv.personal.email, cv.personal.phone, cv.personal.location, cv.personal.website, cv.personal.linkedin].filter(Boolean).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
              {cv.personal.photoDataUrl && <img className="cv-photo" src={cv.personal.photoDataUrl} alt="" />}
            </header>

            {cv.sectionOrder.map(renderPreviewSection)}
          </div>
        </aside>
      </div>
    </div>
  )
}
