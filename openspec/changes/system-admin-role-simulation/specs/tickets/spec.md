# Tickets Specification

## Purpose
Define local company filtering and fail-closed tenant scoping for `/tickets` under global role-only simulation.

## Requirements

### Requirement: Local company filter on tickets hub
The system MUST show `/tickets` according to the effective role and authorized assignments. If the current effective user can see tickets from more than one company, the page MUST provide a local companies filter. Roles whose valid view does not span multiple companies MUST NOT see that filter.

#### Scenario: Multi-company ticket view for system admin
- GIVEN a real `SYSTEM_ADMIN` or a simulated state that still permits multiple visible companies
- WHEN the actor opens `/tickets`
- THEN the page shows all visible tickets across authorized companies by default
- AND the actor may narrow the list with a local companies filter

#### Scenario: Simulated non-admin ticket view
- GIVEN a `SYSTEM_ADMIN` simulating `PROJECT_LEAD` or another non-admin role
- WHEN the actor opens `/tickets`
- THEN the page shows only tickets allowed for that effective role and assignments
- AND the page does not expose a companies filter unless that role truly has multi-company visibility

### Requirement: Fail-closed company-scoped ticket operations
The system MUST require explicit company or resource scope for company-scoped ticket requests and MUST NOT rely on any removed global company selector. Missing, stale, or unauthorized scope MUST be rejected without fallback to a remembered company.

#### Scenario: Missing scope on company-scoped ticket action
- GIVEN a ticket operation requires company scope
- WHEN the request arrives without valid explicit scope after the global selector removal
- THEN the system rejects the operation
- AND audit data preserves actor, effective role, and attempted scope when available
