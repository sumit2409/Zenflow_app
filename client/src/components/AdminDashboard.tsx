import React, { useEffect, useMemo, useState } from 'react'
import type { AuthAccount } from '../types/auth'
import { apiUrl } from '../utils/api'

type Props = {
  account: AuthAccount | null
  token?: string | null
  onClose?: () => void
  onNotify?: (message: string) => void
}

type AdminTab = 'overview' | 'users' | 'messages' | 'campaigns' | 'templates' | 'queue' | 'audit'
type UserFilter = 'all' | 'verified' | 'unverified' | 'active' | 'inactive'
type UserSort = 'created_desc' | 'created_asc' | 'login_desc' | 'points_desc' | 'email_asc' | 'username_asc'
type CampaignKind = 'one_off' | 'daily' | 'thank_you'
type TargetMode = 'selected' | 'one' | 'all'

type AdminOverview = {
  counts: {
    totalUsers: number
    verifiedUsers: number
    contactMessages: number
    activeDailyCampaigns: number
    drafts: number
    queuePending: number
    queueFailed: number
  }
  recentRuns: CampaignRun[]
  recentMessages: ContactMessage[]
}

type UserSummary = {
  username: string
  fullName: string
  email: string
  created: number | null
  lastLoginAt: number | null
  loginCount: number
  emailVerified: boolean
  authProvider: string
  isAdmin: boolean
  totalPoints: number
  recentActiveDays: number
  recentFocusMinutes: number
  lastActivityDate: string | null
  noteDates: number
  todoDates: number
}

type UserDirectoryResponse = {
  items: UserSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type ContactMessage = {
  id?: string
  _id?: string
  fullName: string
  email: string
  message: string
  status: 'new' | 'replied' | 'archived'
  source?: string
  createdAt?: number
  repliedAt?: number | null
}

type ContactMessageResponse = {
  items: ContactMessage[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type EmailTemplate = {
  id?: string
  _id?: string
  name: string
  kind: string
  subject: string
  body: string
  createdBy?: string
  updatedBy?: string
  createdAt?: number
  updatedAt?: number
}

type EmailCampaign = {
  id?: string
  _id?: string
  name: string
  kind: CampaignKind
  targetMode: TargetMode
  selectedRecipients?: string[]
  subject: string
  body: string
  templateId?: string
  status?: string
  preferredProvider?: string
  scheduleEnabled?: boolean
  scheduleHourUtc?: number
  scheduleMinuteUtc?: number
  lastScheduledDateKey?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: number
  updatedAt?: number
}

type CampaignRun = {
  id?: string
  _id?: string
  campaignId?: string
  campaignName: string
  campaignKind: string
  targetMode: string
  recipientCount: number
  sentCount: number
  failedCount: number
  pendingCount: number
  status: string
  createdBy?: string
  createdAt?: number
  completedAt?: number | null
}

type QueueJob = {
  id?: string
  _id?: string
  runId?: string
  campaignId?: string
  username?: string
  toEmail: string
  toName?: string
  subject: string
  status: string
  attemptCount: number
  nextAttemptAt?: number
  lastError?: string
  sentAt?: number | null
  createdAt?: number
}

type QueueResponse = {
  items: QueueJob[]
  counts: {
    pending: number
    sent: number
    failed: number
  }
  config: {
    batchSize: number
    intervalMs: number
    maxAttempts: number
  }
}

type AuditLog = {
  id?: string
  _id?: string
  actorUsername?: string
  actorEmail?: string
  action: string
  targetType?: string
  targetId?: string
  summary?: string
  createdAt?: number
}

type UserDetail = {
  user: UserSummary
  rawProfile: {
    heightCm?: string
    weightKg?: string
    dateOfBirth?: string
  }
  planner: Record<string, unknown>
  recentLogs: Array<{ date: string; type: string; value: number }>
  journals: Record<string, Array<{ id?: string; text?: string; createdAt?: number }> | string>
  todosByDate: Record<string, Array<{ id?: string; text?: string; done?: boolean }>>
}

type CampaignEditorState = {
  id: string
  name: string
  kind: CampaignKind
  targetMode: TargetMode
  selectedRecipients: string
  subject: string
  body: string
  templateId: string
  preferredProvider: string
  status: string
  scheduleEnabled: boolean
  scheduleHourUtc: number
  scheduleMinuteUtc: number
  lastScheduledDateKey: string
}

type TemplateEditorState = {
  id: string
  name: string
  kind: string
  subject: string
  body: string
}

type ReplyEditorState = {
  messageId: string
  fullName: string
  email: string
  subject: string
  body: string
  preferredProvider: string
}

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'messages', label: 'Inbox' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'templates', label: 'Templates' },
  { id: 'queue', label: 'Queue' },
  { id: 'audit', label: 'Audit log' },
]

const USER_FILTERS: Array<{ value: UserFilter; label: string }> = [
  { value: 'all', label: 'All users' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'active', label: 'Recently active' },
  { value: 'inactive', label: 'Inactive' },
]

const USER_SORTS: Array<{ value: UserSort; label: string }> = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'login_desc', label: 'Recent sign-ins' },
  { value: 'points_desc', label: 'Highest points' },
  { value: 'email_asc', label: 'Email A-Z' },
  { value: 'username_asc', label: 'Username A-Z' },
]

const EMPTY_OVERVIEW: AdminOverview = {
  counts: {
    totalUsers: 0,
    verifiedUsers: 0,
    contactMessages: 0,
    activeDailyCampaigns: 0,
    drafts: 0,
    queuePending: 0,
    queueFailed: 0,
  },
  recentRuns: [],
  recentMessages: [],
}

const EMPTY_CAMPAIGN: CampaignEditorState = {
  id: '',
  name: '',
  kind: 'one_off',
  targetMode: 'selected',
  selectedRecipients: '',
  subject: '',
  body: '',
  templateId: '',
  preferredProvider: 'auto',
  status: 'draft',
  scheduleEnabled: false,
  scheduleHourUtc: 9,
  scheduleMinuteUtc: 0,
  lastScheduledDateKey: '',
}

const EMPTY_TEMPLATE: TemplateEditorState = {
  id: '',
  name: '',
  kind: 'general',
  subject: '',
  body: '',
}

const EMPTY_REPLY: ReplyEditorState = {
  messageId: '',
  fullName: '',
  email: '',
  subject: '',
  body: '',
  preferredProvider: 'auto',
}

function formatDateTime(value?: number | null) {
  if (!value) return 'Not yet'
  return new Date(value).toLocaleString()
}

function formatDateOnly(value?: number | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

function joinRecipients(value: string[]) {
  return value.join(', ')
}

function parseRecipients(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeId(record?: { id?: string; _id?: string } | null) {
  return String(record?.id || record?._id || '')
}

function toCampaignEditor(campaign?: EmailCampaign | null): CampaignEditorState {
  if (!campaign) return { ...EMPTY_CAMPAIGN }
  return {
    id: normalizeId(campaign),
    name: campaign.name || '',
    kind: campaign.kind || 'one_off',
    targetMode: campaign.targetMode || 'selected',
    selectedRecipients: joinRecipients(campaign.selectedRecipients || []),
    subject: campaign.subject || '',
    body: campaign.body || '',
    templateId: String(campaign.templateId || ''),
    preferredProvider: String(campaign.preferredProvider || 'auto'),
    status: String(campaign.status || 'draft'),
    scheduleEnabled: Boolean(campaign.scheduleEnabled),
    scheduleHourUtc: Number(campaign.scheduleHourUtc ?? 9),
    scheduleMinuteUtc: Number(campaign.scheduleMinuteUtc ?? 0),
    lastScheduledDateKey: String(campaign.lastScheduledDateKey || ''),
  }
}

function toTemplateEditor(template?: EmailTemplate | null): TemplateEditorState {
  if (!template) return { ...EMPTY_TEMPLATE }
  return {
    id: normalizeId(template),
    name: template.name || '',
    kind: template.kind || 'general',
    subject: template.subject || '',
    body: template.body || '',
  }
}

function statusTone(status: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'sent' || normalized === 'completed' || normalized === 'replied' || normalized === 'scheduled') return 'is-good'
  if (normalized === 'failed' || normalized === 'archived' || normalized === 'paused') return 'is-bad'
  if (normalized === 'queued' || normalized === 'sending' || normalized === 'pending') return 'is-warn'
  return ''
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = String((payload as { error?: string })?.error || 'Request failed')
    throw new Error(message)
  }
  return payload as T
}

function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <article className="admin-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  )
}

function SectionShell({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="admin-section card inset-card">
      <div className="admin-section-head">
        <div>
          <div className="section-kicker">Admin</div>
          <h3>{title}</h3>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export default function AdminDashboard({ account, token, onClose, onNotify }: Props) {
  const canAccess = Boolean(account?.isAdmin && token)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [isBusy, setIsBusy] = useState(false)
  const [overview, setOverview] = useState<AdminOverview>(EMPTY_OVERVIEW)
  const [users, setUsers] = useState<UserDirectoryResponse>({ items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 })
  const [messages, setMessages] = useState<ContactMessageResponse>({ items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 })
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [runs, setRuns] = useState<CampaignRun[]>([])
  const [queue, setQueue] = useState<QueueResponse>({
    items: [],
    counts: { pending: 0, sent: 0, failed: 0 },
    config: { batchSize: 0, intervalMs: 0, maxAttempts: 0 },
  })
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState<UserFilter>('all')
  const [userSort, setUserSort] = useState<UserSort>('created_desc')
  const [userPage, setUserPage] = useState(1)
  const [messageSearch, setMessageSearch] = useState('')
  const [messagePage, setMessagePage] = useState(1)
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null)
  const [loadingUserDetail, setLoadingUserDetail] = useState(false)
  const [campaignEditor, setCampaignEditor] = useState<CampaignEditorState>({ ...EMPTY_CAMPAIGN })
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState>({ ...EMPTY_TEMPLATE })
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [replyEditor, setReplyEditor] = useState<ReplyEditorState>({ ...EMPTY_REPLY })
  const [replyBusy, setReplyBusy] = useState(false)
  const [sendNowBusy, setSendNowBusy] = useState(false)

  async function adminFetch<T>(path: string, init?: RequestInit) {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    })
    return readJson<T>(response)
  }

  async function loadOverview() {
    const data = await adminFetch<AdminOverview>('/api/admin/overview')
    setOverview(data)
  }

  async function loadUsers(nextPage = userPage, nextSearch = userSearch, nextFilter = userFilter, nextSort = userSort) {
    const query = new URLSearchParams({
      page: String(nextPage),
      pageSize: '12',
      search: nextSearch,
      filter: nextFilter,
      sort: nextSort,
    })
    const data = await adminFetch<UserDirectoryResponse>(`/api/admin/users?${query.toString()}`)
    setUserPage(data.page)
    setUsers(data)
  }

  async function loadMessages(nextPage = messagePage, nextSearch = messageSearch) {
    const query = new URLSearchParams({
      page: String(nextPage),
      pageSize: '12',
      search: nextSearch,
    })
    const data = await adminFetch<ContactMessageResponse>(`/api/admin/messages?${query.toString()}`)
    setMessagePage(data.page)
    setMessages(data)
  }

  async function loadTemplates() {
    const data = await adminFetch<{ items: EmailTemplate[] }>('/api/admin/templates')
    setTemplates(data.items || [])
  }

  async function loadCampaigns() {
    const [campaignData, runData] = await Promise.all([
      adminFetch<{ items: EmailCampaign[] }>('/api/admin/campaigns'),
      adminFetch<{ items: CampaignRun[] }>('/api/admin/runs?limit=60'),
    ])
    setCampaigns(campaignData.items || [])
    setRuns(runData.items || [])
  }

  async function loadQueue() {
    const data = await adminFetch<QueueResponse>('/api/admin/queue?limit=200')
    setQueue(data)
  }

  async function loadAuditLogs() {
    const data = await adminFetch<{ items: AuditLog[] }>('/api/admin/audit-logs')
    setAuditLogs(data.items || [])
  }

  async function refreshEverything() {
    if (!canAccess) return
    setIsBusy(true)
    try {
      await Promise.all([
        loadOverview(),
        loadUsers(1, userSearch, userFilter, userSort),
        loadMessages(1, messageSearch),
        loadTemplates(),
        loadCampaigns(),
        loadQueue(),
        loadAuditLogs(),
      ])
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Admin dashboard could not load'))
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (!canAccess) return
    void refreshEverything()
  }, [canAccess])

  const selectedCount = selectedUsernames.length
  const visibleSelectedCount = useMemo(
    () => users.items.filter((entry) => selectedUsernames.includes(entry.username)).length,
    [users.items, selectedUsernames],
  )
  const currentTemplate = useMemo(
    () => templates.find((entry) => normalizeId(entry) === campaignEditor.templateId) || null,
    [templates, campaignEditor.templateId],
  )
  const dailyRuns = useMemo(
    () => runs.filter((entry) => entry.campaignKind === 'daily').slice(0, 8),
    [runs],
  )

  function resetCampaignEditor(kind: CampaignKind = 'one_off') {
    setCampaignEditor({
      ...EMPTY_CAMPAIGN,
      kind,
      name: kind === 'daily' ? 'Daily wellness email' : kind === 'thank_you' ? 'Thank-you note' : '',
    })
    setPreviewHtml('')
    setPreviewSubject('')
    setPreviewText('')
  }

  function toggleUserSelection(username: string) {
    setSelectedUsernames((current) =>
      current.includes(username) ? current.filter((entry) => entry !== username) : [...current, username],
    )
  }

  function selectVisibleUsers() {
    setSelectedUsernames((current) => Array.from(new Set([...current, ...users.items.map((entry) => entry.username)])))
  }

  function clearSelectedUsers() {
    setSelectedUsernames([])
  }

  function openCampaignComposerFromSelection() {
    if (selectedUsernames.length === 0) {
      onNotify?.('Select at least one user first.')
      return
    }

    setCampaignEditor((current) => ({
      ...current,
      id: '',
      name: current.name || 'Admin email',
      kind: 'one_off',
      targetMode: selectedUsernames.length === 1 ? 'one' : 'selected',
      selectedRecipients: joinRecipients(selectedUsernames),
      preferredProvider: current.preferredProvider || 'auto',
      status: 'draft',
    }))
    setActiveTab('campaigns')
  }

  async function openUserDetail(username: string) {
    setLoadingUserDetail(true)
    try {
      const detail = await adminFetch<UserDetail>(`/api/admin/users/${encodeURIComponent(username)}`)
      setSelectedUserDetail(detail)
      setActiveTab('users')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Could not load user details'))
    } finally {
      setLoadingUserDetail(false)
    }
  }

  function openReplyComposer(message: ContactMessage) {
    const name = message.fullName || 'there'
    setReplyEditor({
      messageId: normalizeId(message),
      fullName: name,
      email: message.email,
      subject: `Re: your Zenflow message`,
      body: `Hi ${name},\n\nThanks for reaching out to Zenflow.\n\n`,
      preferredProvider: 'auto',
    })
  }

  async function sendReply() {
    if (!replyEditor.messageId) {
      onNotify?.('Choose a message to reply to first.')
      return
    }

    setReplyBusy(true)
    try {
      await adminFetch(`/api/admin/messages/${encodeURIComponent(replyEditor.messageId)}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          subject: replyEditor.subject,
          body: replyEditor.body,
          preferredProvider: replyEditor.preferredProvider,
        }),
      })
      await Promise.all([loadMessages(), loadOverview()])
      setReplyEditor({ ...EMPTY_REPLY })
      onNotify?.('Reply sent.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Reply could not be sent'))
    } finally {
      setReplyBusy(false)
    }
  }

  async function exportUsersCsv() {
    try {
      const query = new URLSearchParams({
        search: userSearch,
        filter: userFilter,
        sort: userSort,
      })
      const response = await fetch(apiUrl(`/api/admin/users/export.csv?${query.toString()}`), {
        headers: { authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(String(payload?.error || 'Export failed'))
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'zenflow-users.csv'
      anchor.click()
      window.URL.revokeObjectURL(url)
      onNotify?.('User export downloaded.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'CSV export failed'))
    }
  }

  async function updateMessageStatus(message: ContactMessage, status: 'new' | 'replied' | 'archived') {
    try {
      await adminFetch(`/api/admin/messages/${encodeURIComponent(normalizeId(message))}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      await Promise.all([loadMessages(), loadOverview()])
      onNotify?.(`Message marked ${status}.`)
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Message update failed'))
    }
  }

  async function saveTemplate(event?: React.FormEvent) {
    event?.preventDefault()
    try {
      const payload = await adminFetch<{ item: EmailTemplate }>('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify({
          id: templateEditor.id || undefined,
          name: templateEditor.name,
          kind: templateEditor.kind,
          subject: templateEditor.subject,
          body: templateEditor.body,
        }),
      })
      setTemplateEditor(toTemplateEditor(payload.item))
      await loadTemplates()
      onNotify?.('Template saved.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Template save failed'))
    }
  }

  function fillRecipientsFromSelection(mode: TargetMode) {
    if (selectedUsernames.length === 0) return
    setCampaignEditor((current) => ({
      ...current,
      targetMode: mode,
      selectedRecipients: joinRecipients(mode === 'one' ? selectedUsernames.slice(0, 1) : selectedUsernames),
    }))
  }

  function applyTemplateToCampaign() {
    if (!currentTemplate) return
    setCampaignEditor((current) => ({
      ...current,
      subject: currentTemplate.subject,
      body: currentTemplate.body,
    }))
    onNotify?.(`Applied template "${currentTemplate.name}".`)
  }

  async function saveCampaign(statusOverride?: string) {
    try {
      const payload = await adminFetch<{ item: EmailCampaign }>('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          id: campaignEditor.id || undefined,
          name: campaignEditor.name,
          kind: campaignEditor.kind,
          targetMode: campaignEditor.targetMode,
          selectedRecipients: campaignEditor.targetMode === 'all' ? [] : parseRecipients(campaignEditor.selectedRecipients),
          subject: campaignEditor.subject,
          body: campaignEditor.body,
          templateId: campaignEditor.templateId || undefined,
          status: statusOverride || campaignEditor.status || 'draft',
          preferredProvider: campaignEditor.preferredProvider,
          scheduleEnabled: campaignEditor.kind === 'daily' ? campaignEditor.scheduleEnabled : false,
          scheduleHourUtc: campaignEditor.scheduleHourUtc,
          scheduleMinuteUtc: campaignEditor.scheduleMinuteUtc,
          lastScheduledDateKey: campaignEditor.lastScheduledDateKey,
        }),
      })
      setCampaignEditor(toCampaignEditor(payload.item))
      await Promise.all([loadCampaigns(), loadOverview()])
      onNotify?.('Campaign saved.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Campaign save failed'))
    }
  }

  async function previewCampaign() {
    try {
      const payload = await adminFetch<{ preview: { subject: string; text: string; html: string } }>('/api/admin/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({
          subject: campaignEditor.subject,
          body: campaignEditor.body,
        }),
      })
      setPreviewSubject(payload.preview.subject)
      setPreviewText(payload.preview.text)
      setPreviewHtml(payload.preview.html)
      onNotify?.('Preview updated.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Preview failed'))
    }
  }

  async function queueCampaign(action: 'queue' | 'test') {
    const recordId = campaignEditor.id
    if (!recordId) {
      onNotify?.('Save the campaign first.')
      return
    }

    try {
      await adminFetch(`/api/admin/campaigns/${encodeURIComponent(recordId)}/${action}`, {
        method: 'POST',
      })
      await Promise.all([loadCampaigns(), loadQueue(), loadOverview()])
      onNotify?.(action === 'test' ? 'Test email queued to the admin inbox.' : 'Campaign queued.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Campaign action failed'))
    }
  }

  async function sendCampaignNow() {
    const recordId = campaignEditor.id
    if (!recordId) {
      onNotify?.('Save the campaign first.')
      return
    }

    setSendNowBusy(true)
    try {
      const payload = await adminFetch<{ sent: number; failed: number; recipientCount: number }>(`/api/admin/campaigns/${encodeURIComponent(recordId)}/send-now`, {
        method: 'POST',
      })
      await Promise.all([loadOverview(), loadCampaigns()])
      onNotify?.(`Sent ${payload.sent} of ${payload.recipientCount} emails directly.`)
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Direct send failed'))
    } finally {
      setSendNowBusy(false)
    }
  }

  async function duplicateCampaign(recordId: string) {
    try {
      const payload = await adminFetch<{ item: EmailCampaign }>(`/api/admin/campaigns/${encodeURIComponent(recordId)}/duplicate`, {
        method: 'POST',
      })
      setCampaignEditor(toCampaignEditor(payload.item))
      await loadCampaigns()
      onNotify?.('Campaign duplicated.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Could not duplicate campaign'))
    }
  }

  async function setCampaignScheduleState(action: 'pause' | 'resume') {
    const recordId = campaignEditor.id
    if (!recordId) return

    try {
      const payload = await adminFetch<{ item: EmailCampaign }>(`/api/admin/campaigns/${encodeURIComponent(recordId)}/${action}`, {
        method: 'POST',
      })
      setCampaignEditor(toCampaignEditor(payload.item))
      await Promise.all([loadCampaigns(), loadOverview()])
      onNotify?.(action === 'pause' ? 'Campaign paused.' : 'Campaign resumed.')
    } catch (error) {
      onNotify?.(String((error as Error)?.message || 'Campaign update failed'))
    }
  }

  if (!canAccess) {
    return (
      <section className="admin-shell fade-rise">
        <SectionShell title="Admin access">
          <div className="admin-empty-state">
            <strong>Admin access is restricted.</strong>
            <p>Only the verified account for contactsumit2409@gmail.com can open this dashboard.</p>
          </div>
        </SectionShell>
      </section>
    )
  }

  return (
    <section className="admin-shell fade-rise">
      <div className="admin-topbar card">
        <div>
          <div className="section-kicker">Zenflow admin</div>
          <h2>Manage users, campaigns, and inbound messages.</h2>
          <p className="muted">
            This workspace is locked to {account?.email}. Use the queue for gradual sends and keep daily campaigns editable before they go out.
          </p>
        </div>
        <div className="admin-topbar-actions">
          <button type="button" className="ghost-btn" onClick={() => void refreshEverything()}>
            {isBusy ? 'Refreshing...' : 'Refresh'}
          </button>
          {onClose && (
            <button type="button" className="login-btn" onClick={onClose}>
              Back
            </button>
          )}
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="admin-grid">
          <SectionShell title="Health summary">
            <div className="admin-metric-grid">
              <MetricCard label="Users" value={overview.counts.totalUsers} note={`${overview.counts.verifiedUsers} verified`} />
              <MetricCard label="Inbox" value={overview.counts.contactMessages} note="Stored contact messages" />
              <MetricCard label="Daily campaigns" value={overview.counts.activeDailyCampaigns} note={`${overview.counts.drafts} drafts waiting`} />
              <MetricCard label="Queue pending" value={overview.counts.queuePending} note={`${overview.counts.queueFailed} failed jobs`} />
            </div>
          </SectionShell>

          <SectionShell title="Recent campaign runs">
            <div className="admin-list">
              {overview.recentRuns.length === 0 ? (
                <div className="admin-empty-state">No campaign runs yet.</div>
              ) : (
                overview.recentRuns.map((run) => (
                  <article key={normalizeId(run)} className="admin-list-row">
                    <div>
                      <strong>{run.campaignName}</strong>
                      <p className="muted">
                        {run.sentCount}/{run.recipientCount} sent | {run.failedCount} failed
                      </p>
                    </div>
                    <div className="admin-list-meta">
                      <span className={`admin-status-pill ${statusTone(run.status)}`}>{run.status}</span>
                      <small>{formatDateTime(run.createdAt)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionShell>

          <SectionShell title="Recent inbound messages">
            <div className="admin-list">
              {overview.recentMessages.length === 0 ? (
                <div className="admin-empty-state">No stored contact messages yet.</div>
              ) : (
                overview.recentMessages.map((message) => (
                  <article key={normalizeId(message)} className="admin-list-row">
                    <div>
                      <strong>{message.fullName || message.email}</strong>
                      <p>{message.message}</p>
                    </div>
                    <div className="admin-list-meta">
                      <span className={`admin-status-pill ${statusTone(message.status)}`}>{message.status}</span>
                      <small>{formatDateTime(message.createdAt)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionShell>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-grid">
          <SectionShell
            title="User directory"
            actions={
              <div className="admin-inline-actions">
                <button type="button" className="ghost-btn" onClick={selectVisibleUsers}>
                  Select visible ({users.items.length})
                </button>
                <button type="button" className="ghost-btn" onClick={clearSelectedUsers}>
                  Clear selection
                </button>
                <button type="button" className="ghost-btn" onClick={openCampaignComposerFromSelection}>
                  Email selected
                </button>
                <button type="button" className="ghost-btn" onClick={exportUsersCsv}>
                  Export CSV
                </button>
              </div>
            }
          >
            <div className="admin-toolbar">
              <input
                type="search"
                value={userSearch}
                placeholder="Search username, name, or email"
                onChange={(event) => setUserSearch(event.target.value)}
              />
              <select value={userFilter} onChange={(event) => setUserFilter(event.target.value as UserFilter)}>
                {USER_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select value={userSort} onChange={(event) => setUserSort(event.target.value as UserSort)}>
                {USER_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="login-btn"
                onClick={() => {
                  setUserPage(1)
                  void loadUsers(1, userSearch, userFilter, userSort)
                }}
              >
                Apply
              </button>
            </div>
            <div className="admin-selection-strip">
              <span>{selectedCount} selected across the dashboard.</span>
              <small>{visibleSelectedCount} of the current page are selected.</small>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th />
                    <th>User</th>
                    <th>Email</th>
                    <th>Points</th>
                    <th>Recent activity</th>
                    <th>Last sign-in</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.items.map((entry) => (
                    <tr key={entry.username}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsernames.includes(entry.username)}
                          onChange={() => toggleUserSelection(entry.username)}
                          aria-label={`Select ${entry.username}`}
                        />
                      </td>
                      <td>
                        <strong>{entry.fullName}</strong>
                        <div className="muted">@{entry.username}</div>
                      </td>
                      <td>
                        <div>{entry.email}</div>
                        <span className={`admin-status-pill ${entry.emailVerified ? 'is-good' : 'is-warn'}`}>
                          {entry.emailVerified ? 'verified' : 'unverified'}
                        </span>
                      </td>
                      <td>{entry.totalPoints}</td>
                      <td>{entry.recentActiveDays} active days | {entry.recentFocusMinutes} focus min</td>
                      <td>{formatDateOnly(entry.lastLoginAt)}</td>
                      <td>
                        <button type="button" className="ghost-btn" onClick={() => void openUserDetail(entry.username)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.items.length === 0 && <div className="admin-empty-state">No users match this search.</div>}
            </div>
            <div className="admin-pagination">
              <button
                type="button"
                className="ghost-btn"
                disabled={users.page <= 1}
                onClick={() => {
                  const nextPage = Math.max(1, users.page - 1)
                  setUserPage(nextPage)
                  void loadUsers(nextPage)
                }}
              >
                Previous
              </button>
              <span>Page {users.page} of {users.totalPages}</span>
              <button
                type="button"
                className="ghost-btn"
                disabled={users.page >= users.totalPages}
                onClick={() => {
                  const nextPage = Math.min(users.totalPages, users.page + 1)
                  setUserPage(nextPage)
                  void loadUsers(nextPage)
                }}
              >
                Next
              </button>
            </div>
          </SectionShell>

          <SectionShell
            title="User details"
            actions={loadingUserDetail ? <span className="muted">Loading...</span> : undefined}
          >
            {!selectedUserDetail ? (
              <div className="admin-empty-state">Choose a user to inspect profile, notes, tasks, and recent activity.</div>
            ) : (
              <div className="admin-detail-grid">
                <div className="admin-detail-card">
                  <h4>{selectedUserDetail.user.fullName}</h4>
                  <p className="muted">@{selectedUserDetail.user.username}</p>
                  <p>{selectedUserDetail.user.email}</p>
                  <div className="admin-micro-grid">
                    <span>Provider: {selectedUserDetail.user.authProvider}</span>
                    <span>Member since: {formatDateOnly(selectedUserDetail.user.created)}</span>
                    <span>Last sign-in: {formatDateTime(selectedUserDetail.user.lastLoginAt)}</span>
                    <span>Login count: {selectedUserDetail.user.loginCount}</span>
                  </div>
                </div>

                <div className="admin-detail-card">
                  <h4>Stored profile data</h4>
                  <div className="admin-micro-grid">
                    <span>Height: {selectedUserDetail.rawProfile.heightCm || 'Not set'}</span>
                    <span>Weight: {selectedUserDetail.rawProfile.weightKg || 'Not set'}</span>
                    <span>Birth date: {selectedUserDetail.rawProfile.dateOfBirth || 'Not set'}</span>
                    <span>Journal dates: {Object.keys(selectedUserDetail.journals || {}).length}</span>
                    <span>Todo dates: {Object.keys(selectedUserDetail.todosByDate || {}).length}</span>
                    <span>Planner fields: {Object.keys(selectedUserDetail.planner || {}).length}</span>
                  </div>
                </div>

                <div className="admin-detail-card">
                  <h4>Recent logs</h4>
                  <div className="admin-list compact">
                    {selectedUserDetail.recentLogs.length === 0 ? (
                      <div className="admin-empty-state">No logs stored.</div>
                    ) : (
                      selectedUserDetail.recentLogs.map((entry, index) => (
                        <article key={`${entry.date}-${entry.type}-${index}`} className="admin-list-row">
                          <div>
                            <strong>{entry.type}</strong>
                            <p className="muted">{entry.date}</p>
                          </div>
                          <div className="admin-list-meta">
                            <strong>{entry.value}</strong>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                <div className="admin-detail-card">
                  <h4>Recent notes and tasks</h4>
                  <div className="admin-json-preview">
                    <strong>Journals</strong>
                    <pre>{JSON.stringify(selectedUserDetail.journals, null, 2)}</pre>
                  </div>
                  <div className="admin-json-preview">
                    <strong>Todos</strong>
                    <pre>{JSON.stringify(selectedUserDetail.todosByDate, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </SectionShell>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="admin-grid">
          <SectionShell title="Stored inbox">
            <div className="admin-toolbar">
              <input
                type="search"
                value={messageSearch}
                placeholder="Search message text, name, or email"
                onChange={(event) => setMessageSearch(event.target.value)}
              />
              <button
                type="button"
                className="login-btn"
                onClick={() => {
                  setMessagePage(1)
                  void loadMessages(1, messageSearch)
                }}
              >
                Search
              </button>
            </div>
            <div className="admin-message-layout">
              <div className="admin-list">
                {messages.items.length === 0 ? (
                  <div className="admin-empty-state">No stored contact messages yet.</div>
                ) : (
                  messages.items.map((message) => (
                    <article key={normalizeId(message)} className="admin-message-card">
                      <div className="admin-message-head">
                        <div>
                          <strong>{message.fullName || message.email}</strong>
                          <div className="muted">{message.email}</div>
                        </div>
                        <span className={`admin-status-pill ${statusTone(message.status)}`}>{message.status}</span>
                      </div>
                      <p>{message.message}</p>
                      <div className="admin-inline-actions">
                        <small className="muted">{formatDateTime(message.createdAt)}</small>
                        <button type="button" className="ghost-btn" onClick={() => openReplyComposer(message)}>
                          Reply
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => void updateMessageStatus(message, 'new')}>
                          Mark new
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => void updateMessageStatus(message, 'replied')}>
                          Mark replied
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => void updateMessageStatus(message, 'archived')}>
                          Archive
                        </button>
                      </div>
                    </article>
                  ))
                )}
                <div className="admin-pagination">
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={messages.page <= 1}
                    onClick={() => {
                      const nextPage = Math.max(1, messages.page - 1)
                      setMessagePage(nextPage)
                      void loadMessages(nextPage)
                    }}
                  >
                    Previous
                  </button>
                  <span>Page {messages.page} of {messages.totalPages}</span>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={messages.page >= messages.totalPages}
                    onClick={() => {
                      const nextPage = Math.min(messages.totalPages, messages.page + 1)
                      setMessagePage(nextPage)
                      void loadMessages(nextPage)
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>

              <aside className="admin-reply-card">
                <div className="admin-reply-head">
                  <div>
                    <div className="section-kicker">Reply</div>
                    <h4>{replyEditor.email ? `Reply to ${replyEditor.email}` : 'Select a message'}</h4>
                  </div>
                  {replyEditor.messageId && (
                    <button type="button" className="ghost-btn" onClick={() => setReplyEditor({ ...EMPTY_REPLY })}>
                      Clear
                    </button>
                  )}
                </div>
                {replyEditor.messageId ? (
                  <div className="admin-form-stack">
                    <label>
                      Subject
                      <input
                        value={replyEditor.subject}
                        onChange={(event) => setReplyEditor((current) => ({ ...current, subject: event.target.value }))}
                      />
                    </label>
                    <label>
                      Provider
                      <select
                        value={replyEditor.preferredProvider}
                        onChange={(event) => setReplyEditor((current) => ({ ...current, preferredProvider: event.target.value }))}
                      >
                        <option value="auto">Auto</option>
                        <option value="smtp">SMTP</option>
                        <option value="resend">Resend</option>
                      </select>
                    </label>
                    <label>
                      Reply body
                      <textarea
                        rows={12}
                        value={replyEditor.body}
                        onChange={(event) => setReplyEditor((current) => ({ ...current, body: event.target.value }))}
                      />
                    </label>
                    <div className="admin-template-hint">
                      This sends immediately from the configured email sender and sets replies to your admin address.
                    </div>
                    <div className="admin-inline-actions">
                      <button type="button" className="login-btn" onClick={() => void sendReply()} disabled={replyBusy}>
                        {replyBusy ? 'Sending...' : 'Send reply'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty-state">
                    Pick a message and the reply composer will open here.
                  </div>
                )}
              </aside>
            </div>
          </SectionShell>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="admin-grid">
          <SectionShell
            title="Campaign editor"
            actions={
              <div className="admin-inline-actions">
                <button type="button" className="ghost-btn" onClick={() => resetCampaignEditor('one_off')}>
                  New campaign
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    resetCampaignEditor('thank_you')
                    setCampaignEditor((current) => ({
                      ...current,
                      name: 'Thanks for being with Zenflow',
                      subject: 'Thank you for building Zenflow with us',
                      body:
                        "Hi {{userName}},\n\nThank you for being one of Zenflow's early users. Your consistency, feedback, and word of mouth genuinely help us improve.\n\nIf Zenflow is helping your focus or wellness routine, keep leaning on the planner, timers, and daily note when you need structure.\n\nWith appreciation,\nZenflow",
                    }))
                  }}
                >
                  Appreciation draft
                </button>
              </div>
            }
          >
            <div className="admin-campaign-layout">
              <form
                className="admin-form-stack"
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveCampaign('draft')
                }}
              >
                <div className="admin-field-grid">
                  <label>
                    Campaign name
                    <input
                      value={campaignEditor.name}
                      onChange={(event) => setCampaignEditor((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    Kind
                    <select
                      value={campaignEditor.kind}
                      onChange={(event) => setCampaignEditor((current) => ({ ...current, kind: event.target.value as CampaignKind }))}
                    >
                      <option value="one_off">One-off</option>
                      <option value="daily">Daily email</option>
                      <option value="thank_you">Thank-you</option>
                    </select>
                  </label>
                  <label>
                    Target
                    <select
                      value={campaignEditor.targetMode}
                      onChange={(event) => setCampaignEditor((current) => ({ ...current, targetMode: event.target.value as TargetMode }))}
                    >
                      <option value="selected">Selected users</option>
                      <option value="one">One user</option>
                      <option value="all">All users</option>
                    </select>
                  </label>
                  <label>
                    Provider
                    <select
                      value={campaignEditor.preferredProvider}
                      onChange={(event) => setCampaignEditor((current) => ({ ...current, preferredProvider: event.target.value }))}
                    >
                      <option value="auto">Auto</option>
                      <option value="smtp">SMTP</option>
                      <option value="resend">Resend</option>
                    </select>
                  </label>
                </div>

                <div className="admin-selection-strip">
                  <span>{selectedCount} users selected from the directory.</span>
                  <div className="admin-inline-actions">
                    <button type="button" className="ghost-btn" onClick={() => fillRecipientsFromSelection('selected')}>
                      Use current selection
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => fillRecipientsFromSelection('one')}>
                      Use first selected user
                    </button>
                  </div>
                </div>

                {campaignEditor.targetMode !== 'all' && (
                  <label>
                    Recipients
                    <textarea
                      value={campaignEditor.selectedRecipients}
                      placeholder="username1, username2, email@example.com"
                      onChange={(event) => setCampaignEditor((current) => ({ ...current, selectedRecipients: event.target.value }))}
                    />
                  </label>
                )}

                <div className="admin-field-grid">
                  <label>
                    Template
                    <select
                      value={campaignEditor.templateId}
                      onChange={(event) => setCampaignEditor((current) => ({ ...current, templateId: event.target.value }))}
                    >
                      <option value="">No template</option>
                      {templates.map((template) => (
                        <option key={normalizeId(template)} value={normalizeId(template)}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="admin-inline-actions align-end">
                    <button type="button" className="ghost-btn" onClick={applyTemplateToCampaign} disabled={!currentTemplate}>
                      Apply template
                    </button>
                  </div>
                </div>

                <label>
                  Subject
                  <input
                    value={campaignEditor.subject}
                    onChange={(event) => setCampaignEditor((current) => ({ ...current, subject: event.target.value }))}
                  />
                </label>

                <label>
                  Email body
                  <textarea
                    value={campaignEditor.body}
                    rows={12}
                    onChange={(event) => setCampaignEditor((current) => ({ ...current, body: event.target.value }))}
                  />
                </label>

                {campaignEditor.kind === 'daily' && (
                  <div className="admin-field-grid">
                    <label className="admin-checkbox-row">
                      <input
                        type="checkbox"
                        checked={campaignEditor.scheduleEnabled}
                        onChange={(event) => setCampaignEditor((current) => ({ ...current, scheduleEnabled: event.target.checked }))}
                      />
                      <span>Schedule this campaign daily</span>
                    </label>
                    <label>
                      Hour UTC
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={campaignEditor.scheduleHourUtc}
                        onChange={(event) => setCampaignEditor((current) => ({ ...current, scheduleHourUtc: Number(event.target.value || 0) }))}
                      />
                    </label>
                    <label>
                      Minute UTC
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={campaignEditor.scheduleMinuteUtc}
                        onChange={(event) => setCampaignEditor((current) => ({ ...current, scheduleMinuteUtc: Number(event.target.value || 0) }))}
                      />
                    </label>
                  </div>
                )}

                <div className="admin-template-hint">
                  Supported variables: <code>{'{{userName}}'}</code>, <code>{'{{username}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{signupDate}}'}</code>
                </div>

                <div className="admin-composer-note">
                  Send now is for one-to-one or small-group email from the admin workspace. Bulk delivery should still use queue send so provider limits stay safe.
                </div>

                <div className="admin-inline-actions wrap">
                  <button type="submit" className="login-btn">Save draft</button>
                  <button type="button" className="ghost-btn" onClick={() => void previewCampaign()}>
                    Preview
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => void queueCampaign('test')}>
                    Send test to admin
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => void sendCampaignNow()} disabled={!campaignEditor.id || sendNowBusy}>
                    {sendNowBusy ? 'Sending...' : 'Send now'}
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => void queueCampaign('queue')}>
                    Queue send
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => void setCampaignScheduleState('pause')} disabled={!campaignEditor.id}>
                    Pause
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => void setCampaignScheduleState('resume')} disabled={!campaignEditor.id}>
                    Resume
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => void duplicateCampaign(campaignEditor.id)} disabled={!campaignEditor.id}>
                    Duplicate
                  </button>
                </div>
              </form>

              <div className="admin-preview-card">
                <h4>Preview</h4>
                <div className="admin-preview-meta">
                  <span>Target: {campaignEditor.targetMode}</span>
                  <span>
                    Recipients: {campaignEditor.targetMode === 'all' ? 'all verified users' : parseRecipients(campaignEditor.selectedRecipients).length || 0}
                  </span>
                </div>
                {previewSubject ? (
                  <>
                    <strong>{previewSubject}</strong>
                    <div className="admin-email-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    <details>
                      <summary>Preview text</summary>
                      <pre>{previewText}</pre>
                    </details>
                  </>
                ) : (
                  <div className="admin-empty-state">Run a preview to see how variables render for a real user record.</div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell title="Saved campaigns">
            <div className="admin-list">
              {campaigns.length === 0 ? (
                <div className="admin-empty-state">No saved campaigns yet.</div>
              ) : (
                campaigns.map((campaign) => (
                  <article key={normalizeId(campaign)} className="admin-list-row">
                    <div>
                      <strong>{campaign.name}</strong>
                      <p className="muted">
                        {campaign.kind} | {campaign.targetMode} | {campaign.selectedRecipients?.length || 0} recipients saved
                      </p>
                    </div>
                    <div className="admin-inline-actions">
                      <span className={`admin-status-pill ${statusTone(campaign.status || '')}`}>{campaign.status || 'draft'}</span>
                      <button type="button" className="ghost-btn" onClick={() => setCampaignEditor(toCampaignEditor(campaign))}>
                        Edit
                      </button>
                      <button type="button" className="ghost-btn" onClick={() => void duplicateCampaign(normalizeId(campaign))}>
                        Duplicate
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionShell>

          <SectionShell title="Run history">
            <div className="admin-list">
              {runs.length === 0 ? (
                <div className="admin-empty-state">No runs yet.</div>
              ) : (
                runs.map((run) => (
                  <article key={normalizeId(run)} className="admin-list-row">
                    <div>
                      <strong>{run.campaignName}</strong>
                      <p className="muted">
                        {run.sentCount}/{run.recipientCount} sent | {run.failedCount} failed | {run.pendingCount} pending
                      </p>
                    </div>
                    <div className="admin-list-meta">
                      <span className={`admin-status-pill ${statusTone(run.status)}`}>{run.status}</span>
                      <small>{formatDateTime(run.createdAt)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
            {dailyRuns.length > 0 && (
              <div className="admin-subsection">
                <h4>Recent daily-email history</h4>
                <div className="admin-list compact">
                  {dailyRuns.map((run) => (
                    <article key={`${normalizeId(run)}-daily`} className="admin-list-row">
                      <div>
                        <strong>{run.campaignName}</strong>
                        <p className="muted">{run.sentCount}/{run.recipientCount} sent</p>
                      </div>
                      <small>{formatDateTime(run.createdAt)}</small>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </SectionShell>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="admin-grid">
          <SectionShell title="Reusable templates">
            <div className="admin-campaign-layout">
              <form className="admin-form-stack" onSubmit={(event) => void saveTemplate(event)}>
                <label>
                  Template name
                  <input
                    value={templateEditor.name}
                    onChange={(event) => setTemplateEditor((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <div className="admin-field-grid">
                  <label>
                    Kind
                    <input
                      value={templateEditor.kind}
                      onChange={(event) => setTemplateEditor((current) => ({ ...current, kind: event.target.value }))}
                    />
                  </label>
                  <div className="admin-inline-actions align-end">
                    <button type="button" className="ghost-btn" onClick={() => setTemplateEditor({ ...EMPTY_TEMPLATE })}>
                      New template
                    </button>
                  </div>
                </div>
                <label>
                  Subject
                  <input
                    value={templateEditor.subject}
                    onChange={(event) => setTemplateEditor((current) => ({ ...current, subject: event.target.value }))}
                  />
                </label>
                <label>
                  Body
                  <textarea
                    rows={12}
                    value={templateEditor.body}
                    onChange={(event) => setTemplateEditor((current) => ({ ...current, body: event.target.value }))}
                  />
                </label>
                <div className="admin-template-hint">
                  Use templates for daily reminders, appreciation notes, or one-off check-ins. Campaigns can load these and then be edited before sending.
                </div>
                <div className="admin-inline-actions">
                  <button type="submit" className="login-btn">Save template</button>
                </div>
              </form>
              <div className="admin-list">
                {templates.length === 0 ? (
                  <div className="admin-empty-state">No templates saved yet.</div>
                ) : (
                  templates.map((template) => (
                    <article key={normalizeId(template)} className="admin-list-row">
                      <div>
                        <strong>{template.name}</strong>
                        <p className="muted">{template.kind}</p>
                      </div>
                      <div className="admin-inline-actions">
                        <button type="button" className="ghost-btn" onClick={() => setTemplateEditor(toTemplateEditor(template))}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() =>
                            setCampaignEditor((current) => ({
                              ...current,
                              templateId: normalizeId(template),
                              subject: template.subject,
                              body: template.body,
                            }))
                          }
                        >
                          Use in campaign
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </SectionShell>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="admin-grid">
          <SectionShell title="Email queue">
            <div className="admin-metric-grid">
              <MetricCard label="Pending" value={queue.counts.pending} note={`Batch size ${queue.config.batchSize}`} />
              <MetricCard label="Sent" value={queue.counts.sent} note={`Retry max ${queue.config.maxAttempts}`} />
              <MetricCard label="Failed" value={queue.counts.failed} note={`Interval ${Math.round(queue.config.intervalMs / 1000)}s`} />
            </div>
            <div className="admin-list">
              {queue.items.length === 0 ? (
                <div className="admin-empty-state">No jobs are in the queue.</div>
              ) : (
                queue.items.map((job) => (
                  <article key={normalizeId(job)} className="admin-list-row">
                    <div>
                      <strong>{job.subject}</strong>
                      <p className="muted">
                        {job.toEmail} | attempt {job.attemptCount}
                      </p>
                      {job.lastError && <p className="admin-error-line">{job.lastError}</p>}
                    </div>
                    <div className="admin-list-meta">
                      <span className={`admin-status-pill ${statusTone(job.status)}`}>{job.status}</span>
                      <small>{formatDateTime(job.sentAt || job.nextAttemptAt || job.createdAt)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionShell>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="admin-grid">
          <SectionShell title="Audit log">
            <div className="admin-list">
              {auditLogs.length === 0 ? (
                <div className="admin-empty-state">No audit logs yet.</div>
              ) : (
                auditLogs.map((entry) => (
                  <article key={normalizeId(entry)} className="admin-list-row">
                    <div>
                      <strong>{entry.summary || entry.action}</strong>
                      <p className="muted">
                        {entry.actorUsername || 'system'} | {entry.action}
                      </p>
                    </div>
                    <div className="admin-list-meta">
                      <span className="admin-status-pill">{entry.targetType || 'event'}</span>
                      <small>{formatDateTime(entry.createdAt)}</small>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionShell>
        </div>
      )}
    </section>
  )
}
