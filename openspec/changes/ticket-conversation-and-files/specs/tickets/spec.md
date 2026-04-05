# Tickets Specification (File Attachments & Conversation)

## ADDED Requirements

### Requirement: Real File Selection in Create Ticket (R1)
The system MUST allow users to select multiple real files using the browser file picker when creating a ticket.
The selected files MUST be visible before submission, and the user MUST be able to remove any selected file before submitting.
Files MUST become attached to the created ticket in the frontend state.

#### Scenario: Attach files during ticket creation
- GIVEN a user creates a ticket
- WHEN they attach files from their device
- THEN the selected files are listed before submission
- AND they are attached to the ticket in frontend state after creation

### Requirement: Real File Selection in Ticket Detail (R2)
The ticket detail view MUST include an "attach files" action.
The system MUST allow users to select one or multiple files from the OS/browser picker.
Newly attached files MUST appear in the ticket's files section immediately.
The user MUST be able to remove newly attached files in the frontend state.
The flow MUST work without navigating away from the detail page.

#### Scenario: Attach files from ticket detail
- GIVEN a user is in the ticket detail view
- WHEN they attach a file using the attach action
- THEN the new file appears immediately in the files section without page navigation
- AND the user can remove the file directly from the UI

### Requirement: File Viewing and Opening (R3)
Attached files MUST be visible in a dedicated files panel or sidebar on the detail screen.
Clicking a file MUST open a meaningful viewer/preview experience.
Images MUST preview visually when possible.
Non-previewable files MUST show their metadata and a fallback viewer/state with clear actions.

#### Scenario: Open an attached image
- GIVEN an attached image file
- WHEN the user opens it
- THEN they see an in-app preview

#### Scenario: Open a non-previewable file
- GIVEN a non-previewable file
- WHEN the user opens it
- THEN they see metadata and a fallback viewer state

### Requirement: Frontend-only File Model Compatibility (R4)
The system MUST handle browser-selected `File` objects alongside persisted/mock attachment metadata.
The implementation MUST be designed to be future-compatible with backend upload APIs.

#### Scenario: Display mixed file types
- GIVEN a ticket has both previously mocked attachments and newly selected `File` objects
- WHEN the user views the ticket files
- THEN both types are displayed consistently in the UI

## MODIFIED Requirements

### Requirement: Conversation UX Quality (R5)
The conversation block MUST be styled and behave like a chat interface.
Attachments added from the detail screen MUST feel integrated into the conversation workflow.
The toggle between internal and public notes MUST be visually compact and immediately understandable.
*(Previously: The conversation was a basic list with left/right alignment and a compact toggle, but no integrated attachment workflow)*

#### Scenario: Toggle note visibility
- GIVEN a user is composing a note in the ticket detail
- WHEN they toggle between internal and public
- THEN the UI clearly and compactly indicates the current note state

### Requirement: Redundancy and Information Hierarchy (R6)
The system MUST avoid duplicate metadata across the header and sidebar.
The detail screen MUST have a single clear source of truth for dates, SLA, and files.
*(Previously: Duplicate metadata existed across the header and sidebar)*

#### Scenario: View ticket metadata
- GIVEN duplicate metadata currently appears in the detail view
- WHEN the new design is applied
- THEN SLA, dates, and files appear only once in their correct designated locations

### Requirement: Accessibility and Usability (R7)
Upload, open, and remove file actions MUST be keyboard accessible.
The system MUST display clear empty states and loading states for files.
File names MUST truncate safely while remaining discoverable (e.g., showing the extension).
*(Previously: Accessibility for file actions and safe filename truncation was not fully defined)*

#### Scenario: Keyboard navigation for files
- GIVEN a list of attached files
- WHEN the user navigates using the keyboard
- THEN they can access the upload, open, and remove actions

#### Scenario: Long filename display
- GIVEN a file with an excessively long name is attached
- WHEN the file is displayed in the list
- THEN the name truncates safely, keeping the file extension visible
