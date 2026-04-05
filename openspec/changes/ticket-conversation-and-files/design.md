# Design: ticket-conversation-and-files

## Technical Approach

Replace mock file pools with real browser `File` selection via `<input type="file">` in both CreateTicketSheet and TicketDetail. Introduce a discriminated-union attachment model (`LocalAttachment | PersistedAttachment`) so the frontend works identically whether files are browser-local or returned from a future API. Evolve `ticketService` with explicit file operations. Redesign the file viewer dialog to show real image previews via `URL.createObjectURL`. Compact the reply-box footer into a single-row action bar.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|-------------|-----------|
| ADR-001 | Attachment model | Discriminated union `{ source: 'local', file: File, objectUrl: string }` vs `{ source: 'persisted', id, url, ... }`. `LocalAttachment` wraps browser `File` + cached objectUrl. | Single flat type with optional fields | Type narrowing prevents accessing `.file` on server attachments and `.url` on local ones. objectUrl lifecycle is explicit (revoke on unmount/remove). |
| ADR-002 | Attach availability | Both CreateTicketSheet and TicketDetail reply-box expose a hidden `<input type="file" multiple>` triggered by a Paperclip button. | Only in create form | User explicitly requested file upload from detail too. Same `useFileAttachments` hook powers both. |
| ADR-003 | Files in detail layout | Files stay in sidebar (single source of truth) with count badge. Clicking opens a file-viewer Sheet. Files are NOT duplicated inside conversation. | Inline in conversation; separate tab | Sidebar = metadata home (already has ID, dates, SLA, assignee). Adding files there avoids scroll pollution in conversation. Sheet > Dialog for richer preview. |
| ADR-004 | Composer footer | Single row: `[char count] [internal toggle btn] [attach btn] [send btn]`. No tabs above textarea. | Tab bar above textarea | User explicitly asked to compact; a single footer row saves ~40px vertical. Internal toggle is a small button, not a tab. |

## Data Flow

```
Browser File picker ──> useFileAttachments hook ──> LocalAttachment[]
                              │                          │
                    createObjectURL()              revoke on remove/unmount
                              │
                   TicketReplyBox / CreateTicketSheet
                              │
                   onSubmit ──> ticketService.attachFiles(ticketId, File[])
                              │         (mock: converts to PersistedAttachment)
                              │
              ticketService.getTicket() ──> PersistedAttachment[]
                              │
                   TicketDetail sidebar ──> TicketFilesSection
                              │
                   click file ──> FileViewerSheet (image preview or fallback)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/types/domain.ts` | Modify | Add `LocalAttachment`, `PersistedAttachment`, union `Attachment`. Remove `TicketFileInput`. |
| `lib/services/ticket-service.ts` | Modify | Add `attachFiles(ticketId, File[])`, `removeFile(ticketId, fileId)`. Accept `File[]` in `createTicket`. |
| `features/tickets/hooks/use-file-attachments.ts` | Create | Hook: `addFiles(FileList)`, `removeFile(id)`, `attachments: LocalAttachment[]`, `clear()`. Manages objectUrl lifecycle. |
| `features/tickets/components/create-ticket-sheet.tsx` | Modify | Replace mock pool with hidden `<input type="file">` + `useFileAttachments`. |
| `features/tickets/components/ticket-reply-box.tsx` | Modify | Add Paperclip button in footer row. Accept `onAttachFiles` callback. |
| `features/tickets/components/ticket-detail.tsx` | Modify | Wire attach from reply-box to service. Pass count to sidebar. |
| `features/tickets/components/ticket-detail-container.tsx` | Modify | Add `handleAttachFiles` and `handleRemoveFile` wiring to service. |
| `features/tickets/components/file-viewer-sheet.tsx` | Create | Sheet with image preview (objectUrl or persisted url), metadata badges, fallback state for non-image types. |
| `features/tickets/components/attachment-chip.tsx` | Create | Reusable chip: icon + name + size badge + optional remove button. Used in sidebar, create form, reply preview. |

## Interfaces / Contracts

```typescript
// ── Attachment model ──
interface AttachmentBase {
  id: string
  name: string
  size: number
  sizeLabel: string
  mimeType: string
}

interface LocalAttachment extends AttachmentBase {
  source: 'local'
  file: File
  objectUrl: string          // caller MUST revoke
}

interface PersistedAttachment extends AttachmentBase {
  source: 'persisted'
  url: string                // download/preview URL from backend
  uploadedAt: Date
  uploadedById: string
}

type Attachment = LocalAttachment | PersistedAttachment

// ── Hook ──
function useFileAttachments(): {
  attachments: LocalAttachment[]
  addFiles: (files: FileList | File[]) => void
  removeFile: (id: string) => void
  clear: () => void           // revokes all objectUrls
}

// ── Service additions ──
interface TicketService {
  // existing...
  attachFiles(ticketId: string, files: File[]): Promise<PersistedAttachment[]>
  removeFile(ticketId: string, fileId: string): Promise<void>
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useFileAttachments` objectUrl lifecycle | Vitest + mock `URL.createObjectURL` |
| Unit | Attachment type narrowing | Type-level tests (tsc compile check) |
| Integration | CreateTicketSheet submits with real File[] | Vitest + testing-library, mock service |
| Integration | FileViewerSheet renders image vs fallback | testing-library render assertions |

## Migration / Rollout

No migration required. `TicketFileInput` can be removed once `File[]` replaces it in the DTO. The `MOCK_FILE_POOL` constant in create-ticket-sheet is deleted entirely.

## Open Questions

- [ ] Max file size limit? (suggest 10MB per file, 25MB total per operation)
- [ ] Allowed mime types whitelist or deny-list?
