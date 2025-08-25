# Production Readiness - Definition of Done (DoD)

Last Updated: 2025-08-24
Status: ACTIVE

## Legend
- ✅ Complete
- 🚧 In Progress  
- ⏳ Planned
- ❌ Blocked
- 🔄 Under Review

---

## Phase 0: Foundation & Hygiene (Day 0-1)

### P0.1 CI/Workflows
**P0.1.1** ✅ Split CI workflows (build vs E2E)
- Acceptance: Separate ci.yml and e2e.yml files exist
- Status: Complete - PR #1 on Flowpuppywarp

**P0.1.2** ✅ Standardize Node version to 20
- Acceptance: All workflows use Node 20
- Status: Complete - PR #1

**P0.1.3** ⏳ Enable branch protection on main
- Acceptance: 
  - Require PR reviews
  - Require status checks (Build & E2E)
  - Dismiss stale approvals
  - Require linear history
  - Restrict direct pushes
- Status: Pending repo admin action

**P0.1.4** ✅ Enable Dependabot
- Acceptance: Weekly updates for npm and GitHub Actions
- Status: Pending configuration

**P0.1.5** ✅ Add CodeQL security scanning
- Acceptance: Weekly JS/TS scans configured and passing
- Status: Pending workflow creation

### P0.2 Repo Hygiene
**P0.2.1** ✅ Update root README with project overview
- Acceptance: Clear quickstart and links to docs
- Status: Complete - PR #1

**P0.2.2** ✅ Add CONTRIBUTING.md
- Acceptance: Setup, conventions, testing guidelines
- Status: Complete - PR #1

**P0.2.3** ✅ Add CODEOWNERS
- Acceptance: Ownership defined for main areas
- Status: Complete - PR #1

**P0.2.4** ✅ Resolve storybook-static artifacts policy
- Acceptance: Decision documented, action applied (.gitignore or keep)
- Status: Pending decision

**P0.2.5** ✅ Resolve duplicate FlowCanvas components
- Acceptance: Single source of truth or documented separation
- Status: Pending investigation

### P0.3 Security & Dependencies
**P0.3.1** ⏳ Run npm audit fix
- Acceptance: No critical vulnerabilities
- Status: 23 vulnerabilities found (22 moderate, 1 critical)

**P0.3.2** ⏳ Enable GitHub security alerts
- Acceptance: Dependabot security alerts enabled
- Status: Pending configuration

**P0.3.3** ⏳ Document secrets rotation procedure
- Acceptance: docs/runbooks/secrets-rotation.md exists
- Status: Pending creation

---

## Phase 1: Release Candidate Blockers (2-4 days)

### P1.1 Core Functionality (AB-401)
**P1.1.1** ⏳ Complete runtime join validator rules
- Acceptance: All join node validation rules implemented
- Location: apps/web/src/lib/orchestrator/validate.ts
- Status: Scaffolded, needs completion

**P1.1.2** ⏳ Complete runtime race validator rules  
- Acceptance: All race node validation rules implemented
- Location: apps/web/src/lib/orchestrator/validate.ts
- Status: Scaffolded, needs completion

**P1.1.3** ⏳ Complete runtime mapLoop validator rules
- Acceptance: All mapLoop validation rules implemented
- Location: apps/web/src/lib/orchestrator/validate.ts
- Status: Scaffolded, needs completion

**P1.1.4** ⏳ Add unit tests for runtime validators
- Acceptance: 100% coverage of validator rules
- Status: Pending test creation

**P1.1.5** ⏳ Add E2E tests for validator edge cases
- Acceptance: User-visible guidance tested, no crashes
- Status: Pending test creation

### P1.2 Code Quality
**P1.2.1** 🚧 Fix React hooks exhaustive-deps warnings
- Acceptance: Build logs clean or justified suppressions
- Status: Issue #2 created on Flowpuppywarp
- Components affected:
  - BuilderLayout.tsx (line 79)
  - ConversationalFlow.tsx (line 519)
  - LeftPanelFixed.tsx (lines 156, 181)
  - RightInspector.tsx (line 35)
  - CredentialsModal.tsx (line 19)
  - builder/page.tsx (line 117)
  - create/page.tsx (lines 42, 234, 238)
  - DiffPreview.tsx (line 57)
  - FlowCanvas.tsx (lines 422, 428, 434, 440, 454, 468, 520)
  - PanelLayout.tsx (lines 61, 89)

**P1.2.2** ⏳ Add performance budget reporting (non-gating)
- Acceptance: CI reports bundle sizes and perf metrics
- Status: Pending implementation

**P1.2.3** ⏳ Add visual snapshot baseline (non-gating)
- Acceptance: Snapshots generated, diffs reported
- Status: Pending implementation

### P1.3 Observability
**P1.3.1** ⏳ Add error tracking (Sentry or equivalent)
- Acceptance: 
  - DSN configured via env
  - Request IDs in logs
  - Uncaught errors captured
- Status: Pending setup

**P1.3.2** ⏳ Add health endpoint
- Acceptance: /api/health returns version, commit, status
- Status: Pending implementation

**P1.3.3** ⏳ Add uptime monitoring
- Acceptance: GitHub Action scheduled health check
- Status: Pending workflow creation

**P1.3.4** ⏳ Add structured logging
- Acceptance: All API routes use consistent log format
- Status: Pending implementation

### P1.4 Security Hardening
**P1.4.1** ✅ SSRF protection for egress
- Acceptance: Private IPs/localhost blocked
- Status: Complete - tests passing

**P1.4.2** ✅ API-scoped CSP
- Acceptance: CSP applied to API routes only
- Status: Complete - middleware configured

**P1.4.3** ⏳ Verify SSRF in live mode
- Acceptance: Tests pass with real providers
- Status: Pending live verification

**P1.4.4** ⏳ Document encryption key management
- Acceptance: Key rotation procedure documented
- Status: Pending documentation

### P1.5 Data & Migrations
**P1.5.1** ⏳ Ensure migrations are idempotent
- Acceptance: supabase db reset && push round-trip clean
- Status: Pending verification

**P1.5.2** ⏳ Add migration rollback documentation
- Acceptance: Each migration has rollback notes
- Status: Pending documentation

---

## Phase 2: General Availability (1-2 weeks)

### P2.1 Provider Management (AB-404)
**P2.1.1** ⏳ Add UI toggle for live/mock mode per provider
- Acceptance: Toggle visible in admin panel
- Status: Pending implementation

**P2.1.2** ⏳ Persist toggle state
- Acceptance: State saved and restored on refresh
- Status: Pending implementation

**P2.1.3** ⏳ Plumb toggle through to API calls
- Acceptance: Mock/live respected in all provider calls
- Status: Pending implementation

**P2.1.4** ⏳ Default CI to mock mode
- Acceptance: CI uses mocks by default
- Status: Pending configuration

**P2.1.5** ⏳ Add E2E coverage for both modes
- Acceptance: Tests cover mock and live paths
- Status: Pending test creation

### P2.2 Integration Testing (AB-405)
**P2.2.1** ⏳ Create mock responses for OpenAI
- Acceptance: Deterministic mocks for all OpenAI endpoints
- Status: Pending creation

**P2.2.2** ⏳ Create mock responses for Anthropic
- Acceptance: Deterministic mocks for all Anthropic endpoints
- Status: Pending creation

**P2.2.3** ⏳ Create mock responses for OpenRouter
- Acceptance: Deterministic mocks for all OpenRouter endpoints
- Status: Pending creation

**P2.2.4** ⏳ Add integration test suite
- Acceptance: Tests cover end-to-end flows with mocks
- Status: Pending implementation

### P2.3 OAuth & Connections
**P2.3.1** ⏳ Implement OAuth for OpenAI
- Acceptance: OAuth completes inline without leaving builder
- Status: Pending implementation

**P2.3.2** ⏳ Implement OAuth for social provider
- Acceptance: At least one social OAuth working
- Status: Pending implementation

**P2.3.3** ⏳ Add error state handling
- Acceptance: OAuth errors surfaced in right panel
- Status: Pending implementation

**P2.3.4** ⏳ Document OAuth setup
- Acceptance: docs/integrations/oauth.md exists
- Status: Pending documentation

### P2.4 Persistence & Real-time
**P2.4.1** ⏳ Complete runs persistence to DB
- Acceptance: Runs saved to Supabase
- Status: Pending implementation

**P2.4.2** ⏳ Complete steps persistence to DB
- Acceptance: Steps saved with foreign key to runs
- Status: Pending implementation

**P2.4.3** ⏳ Implement retry policies
- Acceptance: Failed steps retry with backoff
- Status: Pending implementation

**P2.4.4** ⏳ Enable real-time SSE updates
- Acceptance: Tasks page updates without refresh
- Status: Pending implementation

**P2.4.5** ⏳ Add reconnection handling
- Acceptance: SSE reconnects on disconnect
- Status: Pending implementation

### P2.5 Accessibility (AB-603)
**P2.5.1** ⏳ Add keyboard navigation for Builder
- Acceptance: Tab through all interactive elements
- Status: Pending implementation

**P2.5.2** ⏳ Add keyboard navigation for Tasks
- Acceptance: Tab through runs and steps
- Status: Pending implementation

**P2.5.3** ⏳ Add focus rings
- Acceptance: Clear focus indicators on all elements
- Status: Pending implementation

**P2.5.4** ⏳ Add escape key handling
- Acceptance: Esc closes modals and dropdowns
- Status: Pending implementation

**P2.5.5** ⏳ Add keyboard shortcuts documentation
- Acceptance: Shortcuts listed in UI and docs
- Status: Pending implementation

**P2.5.6** ⏳ Add E2E keyboard traversal tests
- Acceptance: Tests cover keyboard-only navigation
- Status: Pending test creation

### P2.6 Performance (AB-602)
**P2.6.1** ⏳ Establish LCP budget
- Acceptance: Target < 2.5s for 75th percentile
- Status: Pending baseline

**P2.6.2** ⏳ Establish CLS budget
- Acceptance: Target < 0.1 for 75th percentile
- Status: Pending baseline

**P2.6.3** ⏳ Establish INP budget
- Acceptance: Target < 200ms for 75th percentile
- Status: Pending baseline

**P2.6.4** ⏳ Establish JS bundle size budget
- Acceptance: Main bundle < 200KB, route bundles < 100KB
- Status: Pending baseline

**P2.6.5** ⏳ Add CI performance gates (non-blocking)
- Acceptance: Performance reported but not blocking
- Status: Pending implementation

**P2.6.6** ⏳ Make performance gates blocking
- Acceptance: CI fails on budget violations
- Status: Pending after 1 week non-blocking

### P2.7 Visual Testing (AB-601)
**P2.7.1** ⏳ Snapshot NodeCard component
- Acceptance: Visual snapshot exists and passes
- Status: Pending implementation

**P2.7.2** ⏳ Snapshot DecisionCard component
- Acceptance: Visual snapshot exists and passes
- Status: Pending implementation

**P2.7.3** ⏳ Snapshot Add-Action modal
- Acceptance: Visual snapshot exists and passes
- Status: Pending implementation

**P2.7.4** ⏳ Snapshot ConnectionTile component
- Acceptance: Visual snapshot exists and passes
- Status: Pending implementation

**P2.7.5** ⏳ Snapshot Canvas with lanes
- Acceptance: Visual snapshot exists and passes
- Status: Pending implementation

**P2.7.6** ⏳ Add visual diff reporting
- Acceptance: Diffs shown in CI artifacts
- Status: Pending implementation

### P2.8 Documentation
**P2.8.1** ⏳ Create deployment runbook
- Acceptance: docs/runbooks/deployment.md exists
- Status: Pending creation

**P2.8.2** ⏳ Create rollback runbook
- Acceptance: docs/runbooks/rollback.md exists
- Status: Pending creation

**P2.8.3** ⏳ Create incident response runbook
- Acceptance: docs/runbooks/incident-response.md exists
- Status: Pending creation

**P2.8.4** ⏳ Create DB backup/restore runbook
- Acceptance: docs/runbooks/database.md exists
- Status: Pending creation

**P2.8.5** ⏳ Define SLA/SLOs
- Acceptance: docs/policies/sla.md exists
- Status: Pending creation

**P2.8.6** ⏳ Create privacy policy
- Acceptance: docs/policies/privacy.md exists
- Status: Pending creation

**P2.8.7** ⏳ Create data retention policy
- Acceptance: docs/policies/data-retention.md exists
- Status: Pending creation

---

## Phase 3: Deployment & Operations

### P3.1 Environments
**P3.1.1** ⏳ Setup staging environment
- Acceptance: Staging URL accessible and configured
- Status: Pending setup

**P3.1.2** ⏳ Setup production environment
- Acceptance: Production URL accessible and configured
- Status: Pending setup

**P3.1.3** ⏳ Configure environment variables
- Acceptance: All env vars documented and set
- Status: Pending configuration

**P3.1.4** ⏳ Setup GitHub Environments
- Acceptance: Staging and Production environments in GitHub
- Status: Pending configuration

### P3.2 CI/CD Pipeline
**P3.2.1** ⏳ Setup preview deployments for PRs
- Acceptance: Each PR gets preview URL
- Status: Pending configuration

**P3.2.2** ⏳ Setup auto-deploy to staging from main
- Acceptance: Merge to main deploys to staging
- Status: Pending configuration

**P3.2.3** ⏳ Setup production deploy from tags
- Acceptance: vX.Y.Z tags deploy to production
- Status: Pending configuration

**P3.2.4** ⏳ Add rollback mechanism
- Acceptance: One-click rollback documented and tested
- Status: Pending implementation

### P3.3 Monitoring
**P3.3.1** ⏳ Setup uptime monitoring
- Acceptance: Alerts on downtime
- Status: Pending configuration

**P3.3.2** ⏳ Setup error alerting
- Acceptance: Alerts on error rate spikes
- Status: Pending configuration

**P3.3.3** ⏳ Setup performance monitoring
- Acceptance: Dashboards for key metrics
- Status: Pending configuration

**P3.3.4** ⏳ Setup nightly E2E runs
- Acceptance: Live E2E runs against staging
- Status: Pending configuration

---

## Summary Statistics

Total Tasks: 104
- ✅ Complete: 7
- 🚧 In Progress: 1
- ⏳ Planned: 96
- ❌ Blocked: 0

Completion by Phase:
- Phase 0: 23% (7/30)
- Phase 1: 5% (1/21)
- Phase 2: 0% (0/41)
- Phase 3: 0% (0/12)

---

## Next Actions Queue

1. P0.1.3 - Enable branch protection (requires admin)
2. P1.2.1 - Fix React hooks warnings (Issue #2)
3. P1.1.1-3 - Complete runtime validators
4. P0.3.1 - Run npm audit fix
5. P0.1.4 - Enable Dependabot

---

## Change Log

### 2025-08-24
- P0.2.5 marked as Complete


### 2025-08-24
- P0.2.4 marked as Complete


### 2025-08-24
- P0.1.5 marked as Complete


### 2025-08-24
- P0.1.4 marked as Complete


### 2024-12-24
- Initial DoD created
- Completed items marked from PR #1
- Issue #2 linked for hooks warnings
