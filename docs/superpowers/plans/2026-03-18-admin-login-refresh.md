# Admin Login Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the admin login page into a clean hospital-grade institutional interface without changing login behavior.

**Architecture:** Keep the existing Vue single-file component and Element Plus form logic intact. Replace the page markup and scoped styles with a split layout, stronger branding structure, and refined responsive styling.

**Tech Stack:** Vue 3, Vite, TypeScript, Element Plus, scoped CSS

---

### Task 1: Refresh Login Page Structure And Styling

**Files:**
- Modify: `admin/src/views/login/Login.vue`

- [ ] Update the template to introduce a left-side institutional panel and a right-side login panel.
- [ ] Preserve the existing reactive form model, validation rules, and login handler.
- [ ] Replace the gradient-card styling with a restrained editorial/institutional layout.
- [ ] Ensure the page remains responsive below tablet widths.

### Task 2: Verify

**Files:**
- Test: `admin/src/views/login/Login.vue`

- [ ] Run a production build for the admin frontend.
- [ ] Confirm there are no TypeScript or SFC compilation errors from the login page changes.
