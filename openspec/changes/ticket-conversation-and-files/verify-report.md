## Verification Report

**Change**: ticket-conversation-and-files  
**Version**: N/A  
**Date**: 2026-03-28

---

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 24 |
| Tasks complete | 24 |
| Tasks incomplete | 0 |

All tasks in `openspec/changes/ticket-conversation-and-files/tasks.md` are marked complete.

---

### Build, Type Check, and Tests Execution

**Build**: ⚠️ Skipped  
`aiderbrand-system/apps/web/package.json` defines `build: next build`, but repository-level instructions explicitly forbid running builds after changes. This verification did not execute a build command.

**Typecheck**: ✅ Passed
```bash
cd /Users/daniel/Documents/Desarrollos/Aiderbrand-gestion/aiderbrand-system/apps/web
npm run typecheck

> web@0.0.1 typecheck
> tsc --noEmit
```

**Tests**: ❌ Not runnable / not configured
```bash
cd /Users/daniel/Documents/Desarrollos/Aiderbrand-gestion/aiderbrand-system/apps/web
npm run test

npm error Lifecycle script `test` failed with error:
npm error workspace web@0.0.1
npm error location /Users/daniel/Documents/Desarrollos/Aiderbrand-gestion/aiderbrand-system/apps/web
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run --workspace=web@0.0.1
```

**Coverage**: ➖ Not configured

---

### Explicit User Expectations Check
| Expectation | Result | Evidence |
|-------------|--------|----------|
| 1. Create Ticket real file picker | ✅ Static evidence present | `create-ticket-sheet.tsx` uses a real hidden `input[type=file][multiple]`, lists selected files, and lets the user remove them before submit. |
| 2. Ticket Detail real file picker | ✅ Static evidence present | `ticket-reply-box.tsx` exposes a real hidden `input[type=file][multiple]`; `ticket-detail.tsx` / `use-ticket-detail.ts` wire attach handling without navigation. |
| 3. Files visible immediately after attach | ⚠️ Partial | `use-ticket-detail.ts` appends persisted attachments optimistically, but `fileToPersistedAttachment()` can persist `url: ''` for larger files, so immediate preview/open behavior is not guaranteed for every attached file. |
| 4. Images inline in conversation | ✅ Static evidence present | `timeline-item.tsx` renders `file_attachment` image attachments as chat-style thumbnail bubbles using event `attachments`. |
| 5. Images open in modal/lightbox | ⚠️ Partial | `ticket-detail.tsx` routes images to `ImageLightboxDialog`, but images with no persisted preview URL return `null` in the dialog, so large images can still fail to open. |
| 6. Non-image files open in sheet/fallback | ⚠️ Partial | Non-images route to `FileViewerSheet`, but when `previewUrl` is empty the fallback loses open/download actions, so the experience is not consistently meaningful for every file. |
| 7. Timeline includes status/assignment/file events | ✅ Static evidence present | `ticket-service.ts` records status, assignment, and file attachment events; `use-ticket-detail.ts` injects optimistic file/status/assignment events; `timeline-item.tsx` renders them. |
| 8. No duplicate metadata outside source-of-truth areas | ✅ Static evidence present | Dates and SLA are only in the sidebar; files are listed once in the sidebar, while conversation shows attachment events rather than a duplicate metadata panel. |
| 9. Conversation scroll is isolated; composer stays visible | ✅ Static evidence present | `app-shell.tsx`, route pages, `ticket-detail.tsx`, and `ticket-timeline.tsx` all use `min-h-0` + overflow containment so the `ScrollArea` is isolated inside the conversation card and the composer sits outside it. |
| 10. Ticket state persists across reload structurally | ✅ Static evidence present | `ticket-service.ts` hydrates from `localStorage`, seeds fallback data on first load, serializes date fields, and revives attachment URLs for stored/seeded data. |

---

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| R1 Real File Selection in Create Ticket | Attach files during ticket creation | (none found) | ❌ UNTESTED |
| R2 Real File Selection in Ticket Detail | Attach files from ticket detail | (none found) | ❌ UNTESTED |
| R3 File Viewing and Opening | Open an attached image | (none found) | ❌ UNTESTED |
| R3 File Viewing and Opening | Open a non-previewable file | (none found) | ❌ UNTESTED |
| R4 Frontend-only File Model Compatibility | Display mixed file types | (none found) | ❌ UNTESTED |
| R5 Conversation UX Quality | Toggle note visibility | (none found) | ❌ UNTESTED |
| R6 Redundancy and Information Hierarchy | View ticket metadata | (none found) | ❌ UNTESTED |
| R7 Accessibility and Usability | Keyboard navigation for files | (none found) | ❌ UNTESTED |
| R7 Accessibility and Usability | Long filename display | (none found) | ❌ UNTESTED |

**Compliance summary**: 0/9 scenarios compliant

---

### Correctness (Static — Structural Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| R1 Real File Selection in Create Ticket | ✅ Implemented | Real file picker, removable selected list, and `File[]` submission are wired in `create-ticket-sheet.tsx` and `ticket-service.ts`. |
| R2 Real File Selection in Ticket Detail | ✅ Implemented | Detail attach/remove flows are wired through `ticket-reply-box.tsx`, `ticket-detail.tsx`, `ticket-detail-container.tsx`, and `use-ticket-detail.ts`. |
| R3 File Viewing and Opening | ⚠️ Partial | Seeded and revived persisted files now get usable fallback URLs, but new large files can still persist with empty `url`, leaving image lightbox / non-image fallback incomplete. |
| R4 Frontend-only File Model Compatibility | ✅ Implemented | `Attachment`, `LocalAttachment`, and `PersistedAttachment` are defined in `domain.ts`; helper logic centralizes preview/URL handling in `file-attachments.ts`. |
| R5 Conversation UX Quality | ✅ Implemented | Compact composer, chat-style comments, inline image attachment bubbles, and compact internal/public toggle are all present. |
| R6 Redundancy and Information Hierarchy | ✅ Implemented | Header intentionally omits duplicated dates/SLA/files; right sidebar is the metadata home. |
| R7 Accessibility and Usability | ⚠️ Partial | Buttons are keyboard reachable and filenames truncate safely with title/tooltips, but there is still no runtime proof and no dedicated per-files loading state. |

---

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| ADR-001 Attachment model | ✅ Yes | Discriminated union implemented in `lib/types/domain.ts`. |
| ADR-002 Attach availability in create + detail | ✅ Yes | Both Create Ticket and Ticket Detail use real hidden file inputs. |
| ADR-003 Files stay in sidebar; clicking opens Sheet; files not duplicated in conversation | ⚠️ Deviated | Sidebar remains metadata source of truth, but image attachments are now rendered inline in the timeline and open in a dedicated lightbox dialog. |
| ADR-004 Single-row composer footer | ✅ Yes | Reply composer footer remains compact: char count, internal/public toggle, attach, send. |
| File Changes table | ⚠️ Deviated | `image-lightbox-dialog.tsx` exists and is wired, but the design artifact was not updated to reflect that final UX decision. |

---

### Issues Found

**CRITICAL** (must fix before archive):
1. No automated tests or configured test runner exist for this change in `aiderbrand-system/apps/web`; `npm run test` fails because the `test` script is missing. Under the verify contract, all 9 spec scenarios remain ❌ UNTESTED and therefore non-compliant.
2. `fileToPersistedAttachment()` intentionally stores `url: ''` for files above the in-memory data URL thresholds (`1.5 MB` for images, `256 KB` for non-images), while the UI does not block those files. That means newly attached larger files can fail the required open/preview flow immediately after attach: images may not render inline or open in `ImageLightboxDialog`, and non-image fallbacks may lose actionable open/download links.

**WARNING** (should fix):
1. Build was not executed because repository instructions explicitly forbid running builds after changes; verification lacks `next build` evidence.
2. `design.md` is stale relative to the shipped UX: inline conversation images and `ImageLightboxDialog` are implemented but not captured in the design artifact.
3. Accessibility/usability is only structurally evident; there are no runtime tests proving keyboard interaction, truncation behavior, or empty/loading states for file flows.

**SUGGESTION** (nice to have):
1. Add integration tests for Create Ticket attach/remove, detail attach/remove, timeline image rendering, lightbox open, and non-image fallback behavior.
2. Either enforce explicit file-size limits in the picker flow or guarantee a usable persisted URL for every accepted attachment so runtime behavior matches the spec.
3. Update `design.md` so the final viewer split (image lightbox vs non-image sheet) and inline image timeline behavior are part of the audit trail.

---

### Verdict
**FAIL**

TypeScript passes and the implementation now covers most of the intended UX structurally, including seeded attachment hydration and localStorage-backed persistence, but verification still fails because every spec scenario is untested and larger newly attached files can still break the required open/preview experience immediately after attach.
