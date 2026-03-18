# Admin Web Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a consistent hospital-grade visual language across the admin shell and current management views.

**Architecture:** Keep the existing Vue page structure and business logic. Replace page markup and scoped styling where needed to establish a consistent shell, content header pattern, and control styling.

**Tech Stack:** Vue 3, TypeScript, Element Plus, scoped CSS

---

### Task 1: Refresh Shared Shell

**Files:**
- Modify: `admin/src/layouts/BasicLayout.vue`

- [ ] Replace corrupted text with proper Chinese labels.
- [ ] Redesign the header, sidebar, and content shell to match the login page aesthetic.
- [ ] Keep existing routing and logout behavior unchanged.

### Task 2: Refresh Location Management

**Files:**
- Modify: `admin/src/views/location/LocationManagement.vue`

- [ ] Repair corrupted Chinese copy.
- [ ] Restructure the page into a branded header, filters panel, and refined data panel.
- [ ] Restyle tables, dialogs, tags, and pagination to match the shared shell.

### Task 3: Refresh QR Code Batch Page

**Files:**
- Modify: `admin/src/views/location/QRCodeBatch.vue`

- [ ] Repair corrupted Chinese copy.
- [ ] Add the same page-header/content-panel language used elsewhere.
- [ ] Restyle selection actions, table, result cards, and pagination.

### Task 4: Verify

**Files:**
- Test: `admin/src/layouts/BasicLayout.vue`
- Test: `admin/src/views/location/LocationManagement.vue`
- Test: `admin/src/views/location/QRCodeBatch.vue`

- [ ] Run admin type-check and production build.
