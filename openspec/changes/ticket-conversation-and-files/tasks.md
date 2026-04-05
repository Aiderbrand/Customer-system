# Tasks: ticket-conversation-and-files

## Group 1 — Attachment model foundation
- [x] **TASK-001**: Add attachment union/domain contracts
  - Files: `aiderbrand-system/apps/web/lib/types/domain.ts`
  - Depends on: None
  - Notes: Define `AttachmentBase`, `LocalAttachment`, `PersistedAttachment`, `Attachment`; update ticket DTOs.
- [x] **TASK-002**: Add ticket feature helper types
  - Files: `aiderbrand-system/apps/web/features/tickets/types.ts`
  - Depends on: TASK-001
  - Notes: Add UI/helper aliases only if needed for form and detail flows.
- [x] **TASK-003**: Align mock ticket file fixtures
  - Files: `aiderbrand-system/apps/web/lib/mock/tickets.ts`, `aiderbrand-system/apps/web/lib/mock/index.ts`
  - Depends on: TASK-001
  - Notes: Export persisted attachment-compatible mock records.
- [x] **TASK-004**: Add file preview/object URL utilities
  - Files: `aiderbrand-system/apps/web/features/tickets/lib/file-attachments.ts`
  - Depends on: TASK-001
  - Notes: Centralize previewability, size labels, create/revoke object URL helpers.

## Group 2 — File attachments hook / service bridge
- [x] **TASK-005**: Create reusable `useFileAttachments` hook
  - Files: `aiderbrand-system/apps/web/features/tickets/hooks/use-file-attachments.ts`
  - Depends on: TASK-001, TASK-004
  - Notes: Support add/remove/clear and cleanup on remove/unmount.
- [x] **TASK-006**: Update create-ticket service input
  - Files: `aiderbrand-system/apps/web/lib/services/ticket-service.ts`
  - Depends on: TASK-001, TASK-004
  - Notes: Accept `File[]` in `createTicket` and map them to persisted mock attachments.
- [x] **TASK-007**: Add detail attach/remove service methods
  - Files: `aiderbrand-system/apps/web/lib/services/ticket-service.ts`
  - Depends on: TASK-006
  - Notes: Implement `attachFiles(ticketId, files)` and `removeFile(ticketId, fileId)`.

## Group 3 — Create Ticket real file picker
- [x] **TASK-008**: Replace mock attach button with real picker
  - Files: `aiderbrand-system/apps/web/features/tickets/components/create-ticket-sheet.tsx`
  - Depends on: TASK-005
  - Notes: Add hidden `input[type=file][multiple]` triggered by button.
- [x] **TASK-009**: Render removable selected files list
  - Files: `aiderbrand-system/apps/web/features/tickets/components/create-ticket-sheet.tsx`, `aiderbrand-system/apps/web/features/tickets/components/attachment-chip.tsx`
  - Depends on: TASK-005
  - Notes: Show selected files, truncation, icons, sizes, and remove action.
- [x] **TASK-010**: Submit real files and preserve dirty guard
  - Files: `aiderbrand-system/apps/web/features/tickets/components/create-ticket-sheet.tsx`
  - Depends on: TASK-006, TASK-008, TASK-009
  - Notes: Pass `File[]` through create flow; reset attachments only after success.

## Group 4 — Ticket Detail file actions
- [x] **TASK-011**: Add detail attach/remove handlers in container
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail-container.tsx`, `aiderbrand-system/apps/web/features/tickets/hooks/use-ticket-detail.ts`
  - Depends on: TASK-007
  - Notes: Expose frontend-only attach/remove mutations and optimistic refresh.
- [x] **TASK-012**: Add real attach action to reply box
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-reply-box.tsx`
  - Depends on: TASK-005
  - Notes: Add attach callback, compact footer action row, keyboard-accessible picker trigger.
- [x] **TASK-013**: Show attached files immediately in detail
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`
  - Depends on: TASK-011, TASK-012
  - Notes: Wire sidebar list updates and removable files for allowed frontend UX.

## Group 5 — File viewer experience
- [x] **TASK-014**: Build reusable file viewer sheet
  - Files: `aiderbrand-system/apps/web/features/tickets/components/file-viewer-sheet.tsx`
  - Depends on: TASK-001, TASK-004
  - Notes: Support image preview, metadata badges, and non-preview fallback.
- [x] **TASK-015**: Replace dialog viewer wiring in detail
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`
  - Depends on: TASK-013, TASK-014
  - Notes: Open sidebar files in Sheet and support mixed local/persisted attachments.

## Group 6 — Conversation UX refinement
- [x] **TASK-016**: Compact composer footer affordances
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-reply-box.tsx`
  - Depends on: TASK-012
  - Notes: Keep one row: char count, internal toggle, attach, send.
- [x] **TASK-017**: Improve chat hierarchy and alignment
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-timeline.tsx`, `aiderbrand-system/apps/web/features/tickets/components/timeline-item.tsx`
  - Depends on: None
  - Notes: Refine left/right ownership, spacing rhythm, and internal note emphasis.

## Group 7 — Detail layout cleanup
- [x] **TASK-018**: Enforce sidebar as file metadata source of truth
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`, `aiderbrand-system/apps/web/features/tickets/components/ticket-detail-header.tsx`
  - Depends on: TASK-013
  - Notes: Remove duplication of files/dates/SLA outside designated sidebar areas.
- [x] **TASK-019**: Polish sidebar balance and empty states
  - Files: `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`, `aiderbrand-system/apps/web/features/tickets/components/attachment-chip.tsx`
  - Depends on: TASK-015, TASK-018
  - Notes: Add count badge, safe filename truncation, and clear empty-state copy.

## Group 8 — Verification
- [x] **TASK-020**: Run TypeScript verification
  - Files: `aiderbrand-system/apps/web`
  - Depends on: TASK-019
  - Notes: Execute project TypeScript check and fix any attachment typing regressions.
- [x] **TASK-021**: Review cleanup and interaction polish
  - Files: `aiderbrand-system/apps/web/features/tickets/**/*`
  - Depends on: TASK-020
  - Notes: Verify object URL cleanup, remove flows, keyboard access, and empty states.

## Group 9 — Inline image previews & enhanced viewer (post-batch)
- [x] **TASK-022**: Extend file_attachment event payload with full attachment objects
  - Files: `aiderbrand-system/apps/web/lib/types/domain.ts`, `aiderbrand-system/apps/web/lib/services/ticket-service.ts`, `aiderbrand-system/apps/web/features/tickets/hooks/use-ticket-detail.ts`
  - Depends on: TASK-021
  - Notes: Add optional `attachments?: PersistedAttachment[]` to the event data; service and hook store/inject it.
- [x] **TASK-023**: Render inline image thumbnails in conversation timeline
  - Files: `aiderbrand-system/apps/web/features/tickets/components/timeline-item.tsx`, `aiderbrand-system/apps/web/features/tickets/components/ticket-timeline.tsx`, `aiderbrand-system/apps/web/features/tickets/components/ticket-detail.tsx`
  - Depends on: TASK-022
  - Notes: FileAttachmentItem detects image attachments, renders thumbnail grid; clicking opens FileViewerSheet via onOpenFile callback threaded from TicketDetail.
- [x] **TASK-024**: Upgrade FileViewerSheet with zoom/fullscreen/download controls
  - Files: `aiderbrand-system/apps/web/features/tickets/components/file-viewer-sheet.tsx`
  - Depends on: TASK-014
  - Notes: Add zoom in/out/reset toolbar, open-in-new-tab (ExternalLink), download button; zoom resets on sheet close.
