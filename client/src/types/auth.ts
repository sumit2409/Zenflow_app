export interface AuthAccount {
  username: string
  fullName: string
  email: string
  created: number | null
  lastLoginAt: number | null
  loginCount: number
}

export interface StoredSession {
  account: AuthAccount
  token: string
}
