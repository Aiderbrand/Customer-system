# Auth and Invitations Specification

## Purpose
Define the authentication, multi-tenant authorization, and invite-only access controls for the Aiderbrand-gestion platform.

## Requirements

### Requirement: Email/Password Authentication
The system MUST authenticate users using an email and password combination, issuing an access token and a secure HTTP-only refresh token.

#### Scenario: Successful Login
- GIVEN a user with a valid registered email and password
- WHEN they attempt to log in
- THEN the system issues authentication tokens
- AND the system records a 'user.login' audit log

### Requirement: Invite-Only Access
The system MUST NOT allow open user self-registration. All new users MUST be created through an explicit invitation flow.

#### Scenario: Attempted Self-Registration
- GIVEN an unauthenticated user
- WHEN they attempt to register a new account directly
- THEN the system rejects the request
- AND returns a 403/404 indicating registration is closed

### Requirement: Company Creation and Multi-Company Membership
The system MUST allow `SYSTEM_ADMIN` and `PROJECT_LEAD` to create companies without an initial owner. A user MAY belong to multiple companies with different roles via a `CompanyMembership` junction.

#### Scenario: User in Multiple Companies
- GIVEN a user invited to Company A and Company B
- WHEN the user logs in
- THEN the system returns the user's profile with memberships for both Company A and B
- AND the frontend allows switching the active company context via an `X-Company-Id` header

### Requirement: Role-Based Invitation Rules
The system MUST enforce strict RBAC for sending invitations:
- `SYSTEM_ADMIN` and `PROJECT_LEAD` MAY invite `ACCOUNT_OWNER`, `COLLABORATOR`, or `DELIVERY_SPECIALIST`.
- `ACCOUNT_OWNER` MAY only invite `COLLABORATOR` to their specific company.
- Other roles MUST NOT send invitations.

#### Scenario: Account Owner attempts to invite an Owner
- GIVEN an authenticated `ACCOUNT_OWNER`
- WHEN they attempt to invite a new `ACCOUNT_OWNER`
- THEN the system rejects the request
- AND returns a 403 Forbidden error

### Requirement: Invitation Acceptance and Password Creation
The system MUST allow an invited user to accept an opaque, time-limited invitation token, provide their name, and set a new password.

#### Scenario: Accepting a valid invitation
- GIVEN a user with a valid, non-expired invitation token
- WHEN they submit their name and a new password
- THEN the system creates or updates the user account and adds a `CompanyMembership`
- AND marks the invitation as accepted
- AND records an 'invitation.accepted' audit log

### Requirement: Password Reset via Email
The system MUST allow users to request a password reset link via email using an opaque, short-lived token.

#### Scenario: Requesting a password reset
- GIVEN a registered user
- WHEN they request a password reset for their email
- THEN the system generates a token and sends a reset email
- AND the API response does not reveal whether the email exists

### Requirement: Manual Password Reset Link Generation
The system MUST allow a `SYSTEM_ADMIN` to manually generate a password reset link for any user without sending an email.

#### Scenario: Admin generates reset link
- GIVEN an authenticated `SYSTEM_ADMIN`
- WHEN they request to generate a reset link for a specific user ID
- THEN the system returns the full reset URL
- AND records a 'password_reset_link.generated' audit log

### Requirement: Mandatory Audit Logging
The system MUST record all critical authentication and invitation actions in the Audit Log, including actor, action, and target entity.

#### Scenario: Auditing an invitation creation
- GIVEN an authorized user
- WHEN they successfully create an invitation
- THEN the system writes a log entry with action 'invitation.created', the actor's ID, and the invited email metadata
