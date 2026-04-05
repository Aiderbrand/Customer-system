# Projects Specification

## Purpose

Define `/projects` as the project hub and `/projects/[id]` as the operational workspace, with explicit separation between client-visible and internal project information.

## Requirements

### Requirement: Projects hub clarity

The system MUST present `/projects` as a scannable hub with search, status filters, role-appropriate summary metrics, quick actions, empty states, and direct navigation to each project workspace.

#### Scenario: Internal user scans and filters projects

- GIVEN a SYSTEM_ADMIN, PROJECT_LEAD, or DELIVERY_SPECIALIST opens `/projects`
- WHEN projects exist and the user applies search or status filters
- THEN the hub shows matching projects with status, current phase, progress, open tickets, and next milestone
- AND internal-only risk or overdue indicators MAY appear without exposing duplicate metadata blocks

#### Scenario: Empty filtered result

- GIVEN any user opens `/projects`
- WHEN no project matches the active filters
- THEN the hub shows an empty state with the active filter context and a clear reset action

### Requirement: Project workspace structure

The system MUST present `/projects/[id]` as a workspace with screen-level navigation for `Resumen`, `Fases`, `Tickets`, and `Actividad`; internal roles MUST additionally access `Tareas internas`, `Notas internas`, and `Administración`.

#### Scenario: Shared workspace navigation

- GIVEN an authorized user opens `/projects/[id]`
- WHEN the project is available for that company
- THEN the page shows a single project header with the canonical metadata and section navigation
- AND moving between sections preserves the same project context without creating alternate detail views

### Requirement: Client vs internal visibility

The system MUST enforce that ACCOUNT_OWNER and COLLABORATOR see projects, phases, and tickets only; they MUST NOT see internal tasks, internal notes, execution times, or internal administration controls.

#### Scenario: Client opens a project

- GIVEN an ACCOUNT_OWNER or COLLABORATOR opens `/projects/[id]`
- WHEN the workspace loads
- THEN only client-visible sections and fields are shown
- AND internal sections are absent rather than visually hidden placeholders

#### Scenario: Internal role opens a project

- GIVEN a SYSTEM_ADMIN, PROJECT_LEAD, or DELIVERY_SPECIALIST opens `/projects/[id]`
- WHEN the workspace loads
- THEN internal sections are available in addition to the shared sections
- AND tickets remain separate from internal tasks in labels, counts, and lists

### Requirement: Phase visibility and progress

The system MUST show project phases as the canonical progress model for all roles, including current phase, ordered phase list, and visible milestones; internal roles SHOULD also see blockers or operational context tied to phases.

#### Scenario: Phase progress by role

- GIVEN a user opens the `Fases` section
- WHEN the project contains ordered phases
- THEN all roles see phase status and milestones relevant to the project state
- AND only internal roles may see additional operational context for those phases

### Requirement: Pending tasks and SLA health

The system MUST keep tickets and tasks as separate entities. For v1, “SLA del proyecto” SHALL mean the health summary of open internal project tasks against their task-level due deadline, aggregated per project as `on-track`, `at-risk`, or `breached`; clients MUST NOT see this summary.

#### Scenario: Internal task backlog with SLA health

- GIVEN an internal role opens `Tareas internas`
- WHEN the project has open tasks with due deadlines
- THEN the workspace lists pending tasks by phase, assignee, priority, and due state
- AND the project SLA health reflects task deadline risk without merging tickets into that calculation

### Requirement: Notes, administration, and source of truth

The system MUST provide internal-only notes and administration sections, and MUST use one canonical metadata source per project so header values are not contradicted or redundantly repeated across sections.

#### Scenario: Canonical metadata and internal controls

- GIVEN an internal role opens `Resumen`, `Notas internas`, or `Administración`
- WHEN project metadata is shown
- THEN name, state, company, current phase, and key dates come from one canonical project context
- AND secondary sections reference that context without restating conflicting copies

### Requirement: Screen actions and navigation outcomes

The system SHOULD expose role-appropriate quick actions from the hub and workspace, including navigation to tickets, filtered sections, and allowed project actions, while keeping low-noise layouts and explicit empty states.

#### Scenario: Quick action from hub to workspace section

- GIVEN a user triggers a quick action such as viewing tickets or phases from `/projects`
- WHEN the destination project workspace opens
- THEN the matching section is selected with the same project context
- AND if that section has no data, the user sees a section-specific empty state with the next allowed action
