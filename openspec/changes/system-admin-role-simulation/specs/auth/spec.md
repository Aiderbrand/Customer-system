# Auth Specification

## Purpose
Define global role simulation, explicit company scoping, and fail-closed authz for corrected system-admin behavior.

## Requirements

### Requirement: Header-driven role simulation
The system MUST expose role simulation in the header only to actors whose real authority is `SYSTEM_ADMIN`. Selecting a simulatable role MUST activate that role globally without binding a company. Selecting `SYSTEM_ADMIN` MUST end the active simulation. Non-admin actors MUST NOT see or use the control.

#### Scenario: Start or stop simulation from header
- GIVEN an authenticated real `SYSTEM_ADMIN`
- WHEN the actor selects `PROJECT_LEAD` and later selects `SYSTEM_ADMIN`
- THEN the system activates a global effective role simulation and later closes it
- AND no global company context is created or required

#### Scenario: Reject unauthorized simulation control
- GIVEN an authenticated actor without real `SYSTEM_ADMIN` authority
- WHEN the actor loads or submits the simulation control
- THEN the control is absent or rejected
- AND no simulation state is created or changed

### Requirement: Explicit company scope and compatibility
The system MUST separate global auth context from company scope. `/auth/session` and simulation endpoints MUST NOT depend on a global company selector. Company-scoped endpoints MUST require explicit company input from the request contract when needed and MUST fail closed when that scope is missing, invalid, or inaccessible. During migration, legacy endpoints MAY continue accepting explicit `X-Company-Id`, but the API MUST NOT infer a default company from header state.

#### Scenario: Fail closed without explicit company scope
- GIVEN a company-scoped request from a user with ambiguous or missing company scope
- WHEN the request does not provide a valid explicit company context
- THEN the system rejects the request
- AND the rejection is auditable without granting cross-tenant access

#### Scenario: Audit effective and scoped context
- GIVEN a protected action executed during role simulation
- WHEN the action is recorded
- THEN the audit trail includes actor identity, effective role, scoped company when present, and timestamp
- AND the record remains traceable after migration from global company state
