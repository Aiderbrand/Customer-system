# Proposal: tickets-gestion

## Intent

Build a scalable ticket management UI (frontend-first with mock data) allowing users to manage support requests directly from the sidebar. Tickets can optionally be associated with projects, and all projects belong to a multi-tenant Company structure. The UI must follow strict RBAC visibility and UX guidelines.

## Scope

### In Scope
- AppShell layout with a config-driven, RBAC-filtered Sidebar.
- Domain types for Tickets, Projects, and Companies.
- Ticket CRUD UI including a conversational-style ticket detail view.
- Optional project-to-ticket association.
- Mock data layer via custom hooks.
- State management via React Context.
- UX rules: No unnecessary scroll, notification on modal backdrop click.

### Out of Scope
- Backend/API integrations.
- Real authentication flows.
- Phase/Task management and Proposal module.
- File uploads and email notifications.

## Approach

Implement a frontend-first architecture using Next.js 16 App Router `(app)` route groups and feature folders. We will use the Container/Presentational pattern for components, leveraging `shadcn/ui` (radix-nova style) and Tailwind CSS v4. Data will be handled via custom hooks simulating a Service Layer, with DTO validation applied even to mock data to ensure future backend compatibility.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/app/(app)/layout.tsx` | New | AppShell and Sidebar implementation |
| `apps/web/app/(app)/dashboard/` | New | Dashboard placeholder view |
| `apps/web/app/(app)/tickets/` | New | Global ticket list and conversational detail view |
| `apps/web/app/(app)/projects/` | New | Project list and project-scoped ticket views |
| `packages/ui/` | Modified | Add/update shadcn components as needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| radix-ui v1 unified quirks | Medium | Stick to documented shadcn/ui patterns and test accessibility manually. |
| State management scaling (Context only) | Low | Keep state localized using Container components; prepare for future GPX-Store/Redux migration if needed. |

## Rollback Plan

Execute `git revert` on the commits related to `tickets-gestion`. No database rollback required as this phase is frontend-only with mock data.

## Dependencies

- None (Frontend-only mock implementation)

## Success Criteria

- [ ] Sidebar navigates correctly and filters items based on the active role.
- [ ] Ticket CRUD operations function successfully with the mock data layer.
- [ ] The conversational ticket view renders messages and respects SLA/state visual cues.
- [ ] Modals display a warning notification when clicking outside to prevent lost progress.
