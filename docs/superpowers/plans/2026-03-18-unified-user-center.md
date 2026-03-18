# Unified User Center Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified user system that supports admin password login, WeChat mini-program login, admin-side user management, and matching database SQL.

**Architecture:** Use a shared `app_user` table for both admin and WeChat users, plus a `user_session` table for persisted bearer tokens. The backend exposes login, current-user, logout, and admin user-management APIs; the admin app consumes those APIs; the mini-program switches to the WeChat-specific login endpoint.

**Tech Stack:** Spring Boot 3, MyBatis-Plus, MySQL, Vue 3, Pinia, Element Plus, WeChat Mini Program

---

## Chunk 1: Backend Auth And User APIs

### Task 1: Define persistence model and auth contract

**Files:**
- Create: `backend/src/main/java/com/hospital/arnavigation/entity/AppUser.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/entity/UserSession.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/mapper/AppUserMapper.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/mapper/UserSessionMapper.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/AdminLoginRequest.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/UserCreateRequest.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/UserUpdateRequest.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/UserStatusUpdateRequest.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/PasswordResetRequest.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/dto/WechatLoginRequest.java`

- [ ] Step 1: Write failing backend tests for admin login, WeChat login, and current-user lookup
- [ ] Step 2: Run backend tests to confirm missing behavior fails
- [ ] Step 3: Add persistence entities, mapper interfaces, and request DTOs
- [ ] Step 4: Re-run tests and confirm failures narrow to service/controller behavior

### Task 2: Implement auth service and controller flows

**Files:**
- Create: `backend/src/main/java/com/hospital/arnavigation/service/UserService.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/impl/UserServiceImpl.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/controller/UserController.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/controller/AdminUserController.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/util/PasswordUtils.java`

- [ ] Step 1: Add failing tests for admin-only user list/create/update/status/reset-password behavior
- [ ] Step 2: Run the targeted tests and confirm access-control/API failures
- [ ] Step 3: Implement token-backed auth lookup, admin password login, WeChat login, logout, and admin user CRUD-lite endpoints
- [ ] Step 4: Run the backend test slice and confirm green

## Chunk 2: Admin Web Integration

### Task 3: Replace mock admin login with real API login

**Files:**
- Modify: `admin/src/views/login/Login.vue`
- Modify: `admin/src/stores/user.ts`
- Modify: `admin/src/utils/request.ts`
- Create: `admin/src/api/user.ts`

- [ ] Step 1: Add the request/store types needed for auth responses
- [ ] Step 2: Wire the login page to `POST /api/user/admin/login`
- [ ] Step 3: Load current user via `GET /api/user/info` and clear session via logout
- [ ] Step 4: Run `npm run type-check` in `admin` and fix any issues

### Task 4: Add admin user management page

**Files:**
- Create: `admin/src/views/user/UserManagement.vue`
- Modify: `admin/src/layouts/BasicLayout.vue`
- Modify: `admin/src/router/index.ts`

- [ ] Step 1: Add route and sidebar entry for user management
- [ ] Step 2: Build user list filters, table actions, and admin create/edit/reset-password dialogs
- [ ] Step 3: Connect page actions to backend admin user APIs
- [ ] Step 4: Run `npm run type-check` in `admin` and fix any issues

## Chunk 3: SQL, Mini Program, And Docs

### Task 5: Add database bootstrap SQL

**Files:**
- Create: `backend/sql/2026-03-18-unified-user-center.sql`

- [ ] Step 1: Define `app_user` and `user_session` DDL with indexes and logical-delete fields
- [ ] Step 2: Insert default admin account with documented initial password
- [ ] Step 3: Review SQL against backend entity field names

### Task 6: Update mini-program login integration and documentation

**Files:**
- Modify: `frontend/miniprogram/utils/request.js`
- Modify: `frontend/miniprogram/app.js`
- Modify: `docs/api-contract.md`

- [ ] Step 1: Switch mini-program login to `POST /api/user/wechat/login`
- [ ] Step 2: Normalize token and user info caching to the new response shape
- [ ] Step 3: Update API contract with admin auth, WeChat auth, and admin user-management endpoints
- [ ] Step 4: Self-review docs and login call paths for consistency
