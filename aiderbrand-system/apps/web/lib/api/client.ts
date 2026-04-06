type JsonBody = Record<string, unknown> | undefined

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: JsonBody
  accessToken?: string | null
  companyId?: string | null
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const DEFAULT_BASE_URL = 'http://localhost:3001/api/v1'

let accessTokenRef: string | null = null

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_BASE_URL
}

function buildHeaders(options: ApiRequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const accessToken = options.accessToken ?? accessTokenRef
  const companyId = options.companyId

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  if (companyId) {
    headers['X-Company-Id'] = companyId
  }

  return headers
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : null
}

export const apiClient = {
  setAccessToken(token: string | null) {
    accessTokenRef = token
  },

  setCompanyId(companyId: string | null) {
    void companyId
  },

  clearSessionContext() {
    accessTokenRef = null
  },

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: buildHeaders(options),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })

    const payload = await parseResponse(response)

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String(payload.message)
          : `API request failed with status ${response.status}`

      throw new ApiError(message, response.status, payload)
    }

    return payload as T
  },
}
