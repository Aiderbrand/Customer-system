import type { LocalAttachment, PersistedAttachment, Attachment } from '@/lib/types'

const MAX_IMAGE_DATA_URL_BYTES = 1.5 * 1024 * 1024
const MAX_GENERIC_DATA_URL_BYTES = 256 * 1024

// ─── MIME type helpers ────────────────────────────────────────────────────────

/** Returns true if the file can be previewed as an image in the browser. */
export function isImageAttachment(attachment: Attachment): boolean {
  return attachment.mimeType.startsWith('image/')
}

/** Returns true if the attachment is a PDF. */
export function isPdfAttachment(attachment: Attachment): boolean {
  return attachment.mimeType === 'application/pdf'
}

/**
 * Returns true if the browser can meaningfully preview this attachment.
 * Currently: images only (PDF requires iframe which is out of scope for this batch).
 */
export function isPreviewable(attachment: Attachment): boolean {
  return isImageAttachment(attachment)
}

// ─── Size label ───────────────────────────────────────────────────────────────

/**
 * Converts a byte count to a human-readable size label.
 * e.g. 253952 → "248 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Object URL lifecycle ─────────────────────────────────────────────────────

/**
 * Creates an object URL for a browser File and returns it.
 * The caller is responsible for revoking via `revokeObjectUrl`.
 */
export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revokes an object URL to free memory.
 * Safe to call with empty string (no-op).
 */
export function revokeObjectUrl(url: string): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function shouldPersistDataUrl(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return file.size <= MAX_IMAGE_DATA_URL_BYTES
  }

  return file.size <= MAX_GENERIC_DATA_URL_BYTES
}

export function createMockAttachmentUrl(name: string, mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    const safeName = name.replace(/[<&>]/g, '')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient></defs><rect width="1200" height="900" rx="48" fill="url(#g)"/><g fill="#475569"><rect x="430" y="270" width="340" height="240" rx="32" fill="#cbd5e1"/><circle cx="525" cy="355" r="42" fill="#94a3b8"/><path d="M445 470l95-95 80 80 52-52 98 98H445z" fill="#64748b"/><text x="600" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="34">${safeName}</text></g></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  const body = `Archivo mock: ${name}\nTipo: ${mimeType}\n\nEste adjunto pertenece a los datos seed del entorno frontend-only.`
  return `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`
}

// ─── LocalAttachment factory ──────────────────────────────────────────────────

/**
 * Converts a browser `File` into a `LocalAttachment`.
 * Creates an objectUrl — caller MUST eventually call `revokeObjectUrl(attachment.objectUrl)`.
 */
export function fileToLocalAttachment(file: File, id: string): LocalAttachment {
  return {
    source: 'local',
    id,
    name: file.name,
    size: file.size,
    sizeLabel: formatFileSize(file.size),
    mimeType: file.type || 'application/octet-stream',
    file,
    objectUrl: createObjectUrl(file),
  }
}

// ─── PersistedAttachment factory (mock) ──────────────────────────────────────

/**
 * Converts a browser `File` into a `PersistedAttachment` (mock — no actual upload).
 * Used by the service layer to simulate a backend response after "uploading".
 *
 * In frontend-only mode an object URL is created so the file viewer can still preview
 * the attachment after it is "persisted". The caller MUST call `revokeObjectUrl` on
 * the returned `url` when the attachment is removed or the component unmounts.
 * (In a real backend integration the url would be a server URL and no revoking is needed.)
 */
export async function fileToPersistedAttachment(
  file: File,
  id: string,
  uploadedById: string,
  uploadedAt: Date,
): Promise<PersistedAttachment> {
  const url = shouldPersistDataUrl(file) ? await readFileAsDataUrl(file) : ''

  return {
    source: 'persisted',
    id,
    name: file.name,
    size: file.size,
    sizeLabel: formatFileSize(file.size),
    mimeType: file.type || 'application/octet-stream',
    url,
    uploadedAt,
    uploadedById,
  }
}

// ─── Preview URL resolution ───────────────────────────────────────────────────

/**
 * Returns the best available URL for previewing an attachment.
 * - LocalAttachment: objectUrl (already created on pick)
 * - PersistedAttachment: url field
 * Returns null if no URL is available.
 */
export function getPreviewUrl(attachment: Attachment): string | null {
  if (attachment.source === 'local') {
    return attachment.objectUrl || null
  }
  return attachment.url || null
}

// ─── Safe filename truncation ─────────────────────────────────────────────────

/**
 * Truncates a filename to `maxLength` characters while preserving the extension.
 * e.g. truncateFilename("very-long-filename.pdf", 12) → "very-lon.pdf"
 */
export function truncateFilename(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1) return name.slice(0, maxLength) + '…'
  const ext = name.slice(lastDot)          // e.g. ".pdf"
  const stem = name.slice(0, lastDot)
  const stemMax = maxLength - ext.length - 1  // -1 for ellipsis
  if (stemMax <= 0) return name.slice(0, maxLength)
  return stem.slice(0, stemMax) + '…' + ext
}
