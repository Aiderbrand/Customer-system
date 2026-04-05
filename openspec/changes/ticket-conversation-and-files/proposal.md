# Proposal: ticket-conversation-and-files

## Intent

Implement a real frontend-first file attachment flow and enhance the conversation UX within the Ticket Detail view. This enables users to upload/select real files via browser input directly from the ticket conversation, upgrading the overall design quality to a premium, highly functional feel while maintaining a frontend-only architecture in preparation for a future backend API.

## Scope

### In Scope
- Real file selection via browser file input in both Create Ticket and Ticket Detail views.
- Frontend-only attachment model utilizing `File` objects and object URLs for local previews.
- UI to attach, remove, and open files from the Ticket Detail conversation block.
- Enhanced conversation UI and better message/file ergonomics.
- Design refinements implementing strong `shadcn` patterns for a premium feel.
- Clean architecture readiness (Service Layer / DTOs) to support future backend upload API.

### Out of Scope
- Backend persistence or storage API implementation.
- Cloud storage integration (S3, GCS, etc.).
- Multipart upload API or chunking.
- Virus scanning or file validation beyond basic frontend checks (size/type).
- Additional permission logic beyond existing RBAC.

## Approach

- **Domain/DTOs**: Extend the current ticket models and DTOs to distinguish between persisted file metadata (mocked existing files) and transient browser-selected `File` objects.
- **State Management**: Use React state to manage transient file attachments. Upon "sending" a message, convert the `File` object into a frontend-persisted entry using `URL.createObjectURL` for immediate preview, keeping it in memory.
- **UI Components**:
  - Replace the current simulated attachment button with a hidden `<input type="file" />` triggered by a custom `shadcn` button.
  - Upgrade the conversation feed to cleanly separate text messages from file attachments, showing thumbnails/previews for images and proper icons for documents.
  - Implement a cleanup effect (`URL.revokeObjectURL`) when the component unmounts to prevent memory leaks.
- **Design System**: Strictly leverage `shadcn` primitives (`Button`, `Dialog`, `ScrollArea`, `Avatar`, `Card`, `Tooltip`) to ensure visual consistency and high quality.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(dashboard)/tickets/[id]/` | Modified | Ticket Detail page and sidebar |
| `src/components/tickets/ticket-conversation.tsx` | Modified | Main conversation feed and input area |
| `src/components/tickets/create-ticket-form.tsx` | Modified | File selection replacing the mock button |
| `src/components/tickets/file-viewer.tsx` | Modified | Support for both mock metadata and `blob:` object URLs |
| `src/lib/validations/ticket.ts` | Modified | DTO schema updates to support `File` objects on the frontend |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Memory leaks from object URLs | Medium | Ensure `URL.revokeObjectURL` is called when components unmount or attachments are removed. |
| Mixed type safety (Mock vs Real `File`) | High | Clearly separate interfaces (`PersistedFile` vs `TransientFile`) in the domain layer. |
| Inconsistent UX between Create and Detail | Low | Share a common `FileAttachment` component across both views. |

## Rollback Plan

Revert the modified components (`ticket-conversation.tsx`, `create-ticket-form.tsx`, etc.) to their previous commits. Remove the new transient file interfaces from the domain layer and restore the mock-only UI implementation.

## Dependencies

- Existing `shadcn` UI components (specifically file upload variants or standard inputs).
- `lucide-react` for file type icons.

## Success Criteria

- [ ] Users can select real files from their OS via a file picker in Ticket Detail.
- [ ] Users can select real files in the Create Ticket form.
- [ ] Selected files can be removed before sending/saving.
- [ ] Attached files are immediately visible in the conversation feed (using object URLs for previews).
- [ ] No memory leaks (object URLs are cleaned up).
- [ ] UI feels premium, using `shadcn` and matching the existing design system.