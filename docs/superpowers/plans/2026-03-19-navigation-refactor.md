# Navigation Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old full-route and Hummingbird-based navigation flow with QR-anchored single-segment navigation shared by compass and AR camera modes.

**Architecture:** The backend will expose a normalized node lookup API and a new `/api/navigation/segment` flow backed by an in-memory graph, A* routing, and single-segment extraction. The frontend will store one canonical navigation session, derive compass and AR render data from that session, and remove all continuous-position assumptions.

**Tech Stack:** Spring Boot, MyBatis-Plus, JUnit/MockMvc, WeChat Mini Program, Three.js via `threejs-miniprogram`

---

## File Map

### Backend

- Modify: `backend/src/main/java/com/hospital/arnavigation/controller/NavigationController.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/mapper/HospitalNodeMapper.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/service/impl/AStarPathFindingServiceImpl.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationSegmentRequestDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationSegmentResponseDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationNodeDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationPointDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/NavigationSegmentService.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/impl/NavigationSegmentServiceImpl.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/HospitalGraphRepository.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/AStarRoutePlanner.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/SegmentExtractor.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/NavigationPointAssembler.java`
- Modify: `backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java`

### Frontend shared navigation

- Modify: `frontend/miniprogram/app.js`
- Create: `frontend/miniprogram/services/navigation-api.js`
- Create: `frontend/miniprogram/services/navigation-session.js`
- Create: `frontend/miniprogram/utils/navigation-transform.js`

### Frontend compass mode

- Modify: `frontend/miniprogram/pages/navigation/navigation.js`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxml`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxss`

### Frontend AR mode

- Modify: `frontend/miniprogram/pages/ar/ar.js`
- Modify: `frontend/miniprogram/pages/ar/ar.wxml`
- Modify: `frontend/miniprogram/pages/ar/ar.wxss`
- Modify: `frontend/miniprogram/pages/ar/ar.json`
- Create: `frontend/miniprogram/renderers/ar-scene/index.js`
- Create: `frontend/miniprogram/renderers/ar-scene/curve.js`
- Create: `frontend/miniprogram/renderers/ar-scene/arrow.js`
- Create: `frontend/miniprogram/renderers/ar-scene/motion.js`

### Cleanup

- Modify: `frontend/miniprogram/utils/hummingbird/HummingbirdSDK.js` only if imports cannot be removed without breaking build
- Remove references from: `frontend/miniprogram/pages/ar/ar.js`

## Chunk 1: Backend segment navigation

### Task 1: Add backend DTOs and node lookup contract

**Files:**
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationSegmentRequestDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationSegmentResponseDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationNodeDTO.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/NavigationPointDTO.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/controller/NavigationController.java`
- Test: `backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java`

- [ ] **Step 1: Write the failing controller tests**

Add MockMvc tests for:
- `GET /api/navigation/node/code/{nodeCode}` returns one normalized node object
- `POST /api/navigation/segment` accepts `startCode` and `targetId`

- [ ] **Step 2: Run the controller tests to verify they fail**

Run: `mvn -Dtest=NavigationControllerTest test`
Expected: FAIL because new DTOs and endpoint behavior do not exist yet.

- [ ] **Step 3: Add minimal DTOs and controller signatures**

Implement request/response DTOs and update controller method signatures to compile with mocked dependencies.

- [ ] **Step 4: Run the controller tests to verify they still fail for missing service wiring**

Run: `mvn -Dtest=NavigationControllerTest test`
Expected: FAIL with assertion or wiring gaps specific to new contract.

- [ ] **Step 5: Finish minimal controller wiring**

Inject the new service, normalize the node lookup payload, and return the new response contract.

- [ ] **Step 6: Run the controller tests to verify they pass**

Run: `mvn -Dtest=NavigationControllerTest test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/hospital/arnavigation/controller/NavigationController.java backend/src/main/java/com/hospital/arnavigation/dto/NavigationSegmentRequestDTO.java backend/src/main/java/com/hospital/arnavigation/dto/NavigationSegmentResponseDTO.java backend/src/main/java/com/hospital/arnavigation/dto/NavigationNodeDTO.java backend/src/main/java/com/hospital/arnavigation/dto/NavigationPointDTO.java backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java
git commit -m "feat: add navigation segment api contract"
```

### Task 2: Implement graph loading and A* single-segment service

**Files:**
- Create: `backend/src/main/java/com/hospital/arnavigation/service/NavigationSegmentService.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/impl/NavigationSegmentServiceImpl.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/HospitalGraphRepository.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/AStarRoutePlanner.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/SegmentExtractor.java`
- Create: `backend/src/main/java/com/hospital/arnavigation/service/navigation/NavigationPointAssembler.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/mapper/HospitalNodeMapper.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/service/impl/AStarPathFindingServiceImpl.java`
- Test: `backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java`

- [ ] **Step 1: Write failing tests for segment success and data invariant failures**

Add tests for:
- segment success from `startCode` to `targetId`
- error when `startCode` not found
- error when duplicate or empty `nodeCode` is encountered in navigable nodes

- [ ] **Step 2: Run backend tests to verify they fail**

Run: `mvn -Dtest=NavigationControllerTest test`
Expected: FAIL because the segment service and graph validation are not implemented.

- [ ] **Step 3: Implement graph repository and route planner minimally**

Load active nodes and accessible edges once per request, validate `nodeCode`, run A* with elevator wait cost `+15`, and reconstruct the full path.

- [ ] **Step 4: Implement segment extraction and coordinate assembly**

Return `[N0]` for already-at-target and `[N0, N1]` for normal segment routing. Normalize node and point coordinates with planar and world fields.

- [ ] **Step 5: Run backend tests to verify they pass**

Run: `mvn -Dtest=NavigationControllerTest test`
Expected: PASS.

- [ ] **Step 6: Run the full backend test suite**

Run: `mvn test`
Expected: PASS or only unrelated pre-existing failures.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/hospital/arnavigation/mapper/HospitalNodeMapper.java backend/src/main/java/com/hospital/arnavigation/service/NavigationSegmentService.java backend/src/main/java/com/hospital/arnavigation/service/impl/NavigationSegmentServiceImpl.java backend/src/main/java/com/hospital/arnavigation/service/navigation/HospitalGraphRepository.java backend/src/main/java/com/hospital/arnavigation/service/navigation/AStarRoutePlanner.java backend/src/main/java/com/hospital/arnavigation/service/navigation/SegmentExtractor.java backend/src/main/java/com/hospital/arnavigation/service/navigation/NavigationPointAssembler.java backend/src/main/java/com/hospital/arnavigation/service/impl/AStarPathFindingServiceImpl.java backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java
git commit -m "feat: implement qr segment navigation backend"
```

## Chunk 2: Frontend shared navigation session

### Task 3: Add canonical navigation session and API wrappers

**Files:**
- Modify: `frontend/miniprogram/app.js`
- Create: `frontend/miniprogram/services/navigation-api.js`
- Create: `frontend/miniprogram/services/navigation-session.js`
- Create: `frontend/miniprogram/utils/navigation-transform.js`

- [ ] **Step 1: Write a lightweight manual verification checklist in comments or scratch notes**

Verify:
- session can be created from one node lookup + one segment response
- session stores only canonical points and node metadata
- derived planar and world data are produced by transform helpers

- [ ] **Step 2: Implement `navigation-api.js`**

Wrap:
- `getNodeByCode(nodeCode)`
- `getNavigationSegment(startCode, targetId)`

- [ ] **Step 3: Implement `navigation-transform.js`**

Create pure helpers for:
- normalized node conversion
- planar path conversion
- Three.js point conversion
- segment heading extraction for compass mode

- [ ] **Step 4: Implement `navigation-session.js` and `app.js` integration**

Add app-level getters/setters for:
- destination
- current navigation session
- current navigation mode

- [ ] **Step 5: Manually verify imports compile logically**

Check each new file is imported from existing pages without circular dependencies.

- [ ] **Step 6: Commit**

```bash
git add frontend/miniprogram/app.js frontend/miniprogram/services/navigation-api.js frontend/miniprogram/services/navigation-session.js frontend/miniprogram/utils/navigation-transform.js
git commit -m "feat: add shared navigation session"
```

## Chunk 3: Compass mode refactor

### Task 4: Rebuild compass mode on top of shared session

**Files:**
- Modify: `frontend/miniprogram/pages/navigation/navigation.js`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxml`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxss`

- [ ] **Step 1: Replace old route-fetch and fake location progression with a failing manual behavior check**

Manual expectation:
- page reads existing session
- page shows current scanned node and next scan node
- page offers `重新扫码校准` and `我已到达下一点`

- [ ] **Step 2: Remove direct full-route planning and fake arrival logic**

Delete page-owned path fetching, GPS assumptions, and auto-step progression.

- [ ] **Step 3: Rewire compass updates to session-derived heading only**

Use the first segment direction and device heading to compute relative instruction text.

- [ ] **Step 4: Add deterministic re-scan actions**

Button A: open scanner and refresh segment from scanned node
Button B: prompt the user to scan the next QR code

- [ ] **Step 5: Update layout text and state rendering**

Show:
- current node
- next node
- target name
- current mode
- scan prompt

- [ ] **Step 6: Manual verification in Mini Program DevTools**

Expected:
- compass page loads from session
- direction text changes with compass updates
- no Hummingbird or continuous-position references remain

- [ ] **Step 7: Commit**

```bash
git add frontend/miniprogram/pages/navigation/navigation.js frontend/miniprogram/pages/navigation/navigation.wxml frontend/miniprogram/pages/navigation/navigation.wxss
git commit -m "feat: refactor compass navigation mode"
```

## Chunk 4: AR mode refactor

### Task 5: Rebuild AR page as local-anchor camera overlay

**Files:**
- Modify: `frontend/miniprogram/pages/ar/ar.js`
- Modify: `frontend/miniprogram/pages/ar/ar.wxml`
- Modify: `frontend/miniprogram/pages/ar/ar.wxss`
- Modify: `frontend/miniprogram/pages/ar/ar.json`
- Create: `frontend/miniprogram/renderers/ar-scene/index.js`
- Create: `frontend/miniprogram/renderers/ar-scene/curve.js`
- Create: `frontend/miniprogram/renderers/ar-scene/arrow.js`
- Create: `frontend/miniprogram/renderers/ar-scene/motion.js`

- [ ] **Step 1: Add a failing manual verification target**

Manual expectation:
- page loads from shared session
- camera stays anchored at last scanned node
- device motion rotates the scene
- curve and arrow render ahead of the user

- [ ] **Step 2: Remove Hummingbird imports and location update flow**

Delete:
- SDK initialization
- restart logic
- continuous location callback handling

- [ ] **Step 3: Build renderer helpers**

Implement:
- scene/bootstrap
- CatmullRom curve creation
- arrow mesh creation/orientation
- device-motion-to-camera rotation mapping

- [ ] **Step 4: Rebuild page lifecycle around shared session**

Load canonical segment points, initialize camera at the scanned node, render the local-anchor path, and show re-scan prompts.

- [ ] **Step 5: Update the page view**

Ensure the page includes:
- camera background
- `webgl` canvas overlay
- next scan node prompt
- mode switch / re-scan actions

- [ ] **Step 6: Manual verification in Mini Program DevTools**

Expected:
- no Hummingbird references remain
- AR page renders even without continuous position updates
- copy clearly states this is scan-anchored guidance

- [ ] **Step 7: Commit**

```bash
git add frontend/miniprogram/pages/ar/ar.js frontend/miniprogram/pages/ar/ar.wxml frontend/miniprogram/pages/ar/ar.wxss frontend/miniprogram/pages/ar/ar.json frontend/miniprogram/renderers/ar-scene/index.js frontend/miniprogram/renderers/ar-scene/curve.js frontend/miniprogram/renderers/ar-scene/arrow.js frontend/miniprogram/renderers/ar-scene/motion.js
git commit -m "feat: refactor ar navigation mode"
```

## Chunk 5: Integration and verification

### Task 6: Integrate mode switching and final cleanup

**Files:**
- Modify: `frontend/miniprogram/app.js`
- Modify: `frontend/miniprogram/pages/navigation/navigation.js`
- Modify: `frontend/miniprogram/pages/ar/ar.js`
- Inspect: `frontend/miniprogram/utils/hummingbird/HummingbirdSDK.js`

- [ ] **Step 1: Verify both pages can switch modes without losing the current session**

Manual expectation:
- switching pages does not re-plan the route
- session remains canonical

- [ ] **Step 2: Remove any dead Hummingbird code paths left behind**

Delete unused imports and any dead state fields.

- [ ] **Step 3: Run backend verification**

Run: `mvn test`
Expected: PASS or only unrelated pre-existing failures documented in final notes.

- [ ] **Step 4: Run frontend static verification that is available**

If a local check script exists, run it. Otherwise, at minimum open Mini Program DevTools and verify both pages load.

- [ ] **Step 5: Review changed files for coordinate contract consistency**

Confirm:
- node lookup and segment data use the same normalization contract
- compass mode uses planar fields
- AR mode uses world fields

- [ ] **Step 6: Commit**

```bash
git add frontend/miniprogram/app.js frontend/miniprogram/pages/navigation/navigation.js frontend/miniprogram/pages/ar/ar.js docs/superpowers/specs/2026-03-19-navigation-refactor-design.md docs/superpowers/plans/2026-03-19-navigation-refactor.md
git commit -m "chore: finalize navigation refactor integration"
```

Plan complete and saved to `docs/superpowers/plans/2026-03-19-navigation-refactor.md`. Ready to execute.
