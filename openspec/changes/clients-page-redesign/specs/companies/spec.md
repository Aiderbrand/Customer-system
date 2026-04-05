# Companies Specification

## Purpose
Define `companies` as the internal operations hub for `Company`, replacing `clients` naming from the first release without inventing a CRM model.

## Requirements

### Requirement: Companies route and naming consistency
The system MUST expose this capability as `Companies` in route, navigation, breadcrumb, page title, and change-local artifacts. Legacy `/clients` entrypoints, if kept temporarily, MUST redirect to `/companies` and MUST NOT render mixed `clients`/`companies` labels.

#### Scenario: Legacy entrypoint normalization
- GIVEN an authorized internal user opens `/clients`
- WHEN the page resolves
- THEN the system redirects or resolves to `/companies`
- AND the visible UI uses `Companies` naming only

### Requirement: Companies hub table-first behavior
The system MUST present `/companies` as an internal, table-first hub with company rows, row-level actions, explicit loading/error/empty states, and only contract-backed columns needed to identify the company and operate the hub.

#### Scenario: Authorized user scans companies
- GIVEN a `SYSTEM_ADMIN` or `PROJECT_LEAD` opens `/companies`
- WHEN companies are available
- THEN the hub shows a scannable data-table with each company state and available actions
- AND row interaction opens contextual detail or actions without requiring a separate workspace route in v1

#### Scenario: No rows for current view
- GIVEN an authorized user opens `/companies`
- WHEN no company exists or no row matches the current filters
- THEN the hub shows an explicit empty state
- AND the empty state offers a clear reset or next allowed action

### Requirement: Search, filters, and view-state persistence
The system MUST support search and filters for the companies hub. The hub SHOULD persist active query state in URL parameters when feasible so reload and shareable navigation preserve the same view. Invalid filter values MUST be normalized instead of breaking the page.

#### Scenario: Reload preserves the filtered view
- GIVEN an authorized user applies search or filters on `/companies`
- WHEN the page reloads or the user navigates back
- THEN the same valid query state is restored
- AND unsupported query values are discarded safely

### Requirement: Company lifecycle and allowed states
The system MUST support creating, editing, activating, and deactivating companies. V1 company state SHALL be limited to `active` and `inactive`; the hub MUST NOT require or invent additional lifecycle states. The flow MUST NOT hard-delete a company through this screen.

#### Scenario: Role-limited lifecycle actions
- GIVEN a `PROJECT_LEAD` opens a company row
- WHEN they update company information
- THEN the update is allowed
- AND actions for create or activate/deactivate are not available

#### Scenario: System admin changes company status
- GIVEN a `SYSTEM_ADMIN` selects an active company
- WHEN they deactivate it
- THEN the company becomes inactive without losing traceability
- AND a later reactivation remains possible

### Requirement: Members and invitations in company context
The system MUST expose company-scoped members and invitations inside the companies hub context. `SYSTEM_ADMIN` and `PROJECT_LEAD` MAY invite members from this surface, and invitation outcomes MUST continue to honor the existing invitation role matrix and company scoping rules.

#### Scenario: Duplicate pending invitation
- GIVEN a company already has a pending invitation for an email
- WHEN an authorized internal user tries to invite that same email again
- THEN the system rejects the duplicate
- AND preserves the existing pending invitation state

### Requirement: Projects from company and implicit tickets relation
The system MUST allow linking existing projects to a company and creating a new project from the company context. `SYSTEM_ADMIN` MAY link existing projects; `SYSTEM_ADMIN` and `PROJECT_LEAD` MAY create a new project from the company context. Tickets MUST remain an implicit relation derived from company/project data and MUST NOT support manual linking or unlinking from this screen.

#### Scenario: Project lead creates project from company
- GIVEN a `PROJECT_LEAD` is viewing a company
- WHEN they choose create project
- THEN the new project is created in that company context
- AND no manual ticket-linking control is shown

### Requirement: Internal-only RBAC, audit visibility, and tenancy safety
The system MUST restrict `/companies` visibility to internal roles only. `SYSTEM_ADMIN` has full access; `PROJECT_LEAD` has `view`, `update`, `invite`, and `create-project`; `DELIVERY_SPECIALIST`, `ACCOUNT_OWNER`, and `COLLABORATOR` MUST NOT see or access this screen. Backend mutations MUST enforce company/resource authorization and MUST record audit entries for company create, update, status changes, invitations, project linking, and project creation. Audit/activity visibility from this hub MUST be limited to `SYSTEM_ADMIN`.

#### Scenario: External or disallowed role attempts access
- GIVEN a `DELIVERY_SPECIALIST`, `ACCOUNT_OWNER`, or `COLLABORATOR`
- WHEN they navigate directly to `/companies`
- THEN the system denies access
- AND the navigation entry is absent for that role
