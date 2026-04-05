# Projects Specification

## Purpose
Define local company filtering and role-aware visibility for `/projects` without global company state.

## Requirements

### Requirement: Local company filter on projects hub
The system MUST show `/projects` items according to the effective role and allowed assignments. If the current effective user can access more than one company for that view, the page MUST provide a local companies filter. If only one company applies, or the effective role is a non-admin role without multi-company reach, the page MUST NOT show a companies filter.

#### Scenario: System admin filters projects locally
- GIVEN a real or simulated `SYSTEM_ADMIN` with visible projects in multiple companies
- WHEN the actor opens `/projects` and applies a companies filter
- THEN the list shows only projects visible for the selected companies
- AND the filtering is local to `/projects`

#### Scenario: Non-admin does not receive irrelevant filter
- GIVEN an effective `ACCOUNT_OWNER`, `COLLABORATOR`, `PROJECT_LEAD`, or `DELIVERY_SPECIALIST` whose view is limited by assignments or one company
- WHEN the actor opens `/projects`
- THEN the page lists only authorized projects
- AND no companies filter is shown if it does not apply

### Requirement: No dependency on global company header state
The system MUST allow `/projects` to load without a global company selected in auth or header state. Requests for project data MUST carry only the explicit local company filters or resource scope they need. Invalid or unauthorized local company filters MUST fail closed.

#### Scenario: Reject inaccessible company filter
- GIVEN a user applies a projects filter containing a company outside their visible scope
- WHEN the list request is evaluated
- THEN the system ignores or rejects the inaccessible scope without widening results
- AND no project from another tenant is returned
