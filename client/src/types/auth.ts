export interface AuthAccount {
  username: string
  fullName: string
  email: string
  analyticsId?: string
  emailVerified?: boolean
  authProvider?: string
  created: number | null
  lastLoginAt: number | null
  loginCount: number
}

export interface StoredSession {
  account: AuthAccount
  token: string
}
