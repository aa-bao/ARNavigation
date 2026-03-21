# Map Feature Implementation Plan

> For agentic workers: use subagent-driven-development when tasks are independent. Vue and mini program rendering may proceed in parallel because they own disjoint files.

**Goal:** Replace the PNG-based hospital map with frontend-rendered floor maps so node positions, current location, destination, and next calibration point all align directly with database coordinates.

**Architecture:** Keep the existing navigation/session/backend APIs. Introduce a shared per-frontend map scene builder that normalizes node and edge coordinates into a fixed viewport. The Vue admin app renders the scene in SVG for inspection and filtering. The mini program renders the same scene in canvas for patient-facing map browsing during navigation.

**Tech Stack:** WeChat Mini Program canvas, Vue 3 + Element Plus + SVG, existing Spring Boot navigation endpoints

---

## File Map

### Mini program

- Modify: `frontend/miniprogram/services/map-data.js`
- Modify: `frontend/miniprogram/utils/map-projector.js`
- Modify: `frontend/miniprogram/services/navigation-api.js`
- Modify: `frontend/miniprogram/pages/map/map.js`
- Modify: `frontend/miniprogram/pages/map/map.wxml`
- Modify: `frontend/miniprogram/pages/map/map.wxss`

### Vue admin

- Modify: `frontend/vue/src/constants/maps.ts`
- Modify: `frontend/vue/src/utils/mapProjector.ts`
- Modify: `frontend/vue/src/views/location/HospitalMapView.vue`

### No backend changes planned

- Reuse: `GET /api/navigation/nodes`
- Reuse: `GET /api/navigation/edges`

---

## Chunk 1: Replace shared map model assumptions

### Task 1: Remove PNG projection assumptions from map helpers

**Files:**
- `frontend/miniprogram/services/map-data.js`
- `frontend/miniprogram/utils/map-projector.js`
- `frontend/vue/src/constants/maps.ts`
- `frontend/vue/src/utils/mapProjector.ts`

- [ ] Replace image-path and plot-area based config with floor metadata, viewport dimensions, padding, and node/marker styling constants.
- [ ] Keep only `1F / 2F / 3F` floor options in the runtime renderer.
- [ ] Implement coordinate normalization from database `x_coordinate/y_coordinate` into viewport coordinates.
- [ ] Implement render-scene builders that return floor nodes, floor edges, optional route points, and marker positions.
- [ ] Preserve compatibility with existing node payload shapes used by both apps.

**Verification**
- [ ] Sanity-check `(0,0)`, `(24,12)`, and one negative-y node project inside viewport bounds.

---

## Chunk 2: Rebuild Vue admin map as SVG

### Task 2: Replace `HospitalMapView.vue` with data-driven SVG rendering

**Files:**
- `frontend/vue/src/views/location/HospitalMapView.vue`
- `frontend/vue/src/constants/maps.ts`
- `frontend/vue/src/utils/mapProjector.ts`

- [ ] Keep existing route and sidebar entry intact.
- [ ] Fetch nodes and edges from existing APIs and build floor scenes locally.
- [ ] Render floor background, grid, edges, nodes, and labels in SVG.
- [ ] Keep floor switch, keyword search, node-type filter, edge toggle, and click-to-view detail.
- [ ] Remove all PNG imports and image-based overlay logic from the admin map page.

**Verification**
- [ ] Run `npm run build` in `frontend/vue`.

---

## Chunk 3: Rebuild mini program map as canvas

### Task 3: Replace the map page with a canvas renderer

**Files:**
- `frontend/miniprogram/services/map-data.js`
- `frontend/miniprogram/utils/map-projector.js`
- `frontend/miniprogram/services/navigation-api.js`
- `frontend/miniprogram/pages/map/map.js`
- `frontend/miniprogram/pages/map/map.wxml`
- `frontend/miniprogram/pages/map/map.wxss`

- [ ] Keep the existing bottom tab and navigation-page entry intact.
- [ ] Fetch nodes and edges from existing APIs and build floor scenes locally.
- [ ] Draw floor background, grid, edges, nodes, labels, route polyline when present, and `CURRENT / DESTINATION / SEGMENT_END` markers on canvas.
- [ ] Keep the page usable before scanning any QR code.
- [ ] Show cross-floor guidance and current summaries from existing navigation session/global state.
- [ ] Remove PNG image rendering and image-error state from the map page.

**Verification**
- [ ] Run targeted static checks where possible.
- [ ] Manual verification deferred to user in WeChat DevTools.

---

## Chunk 4: Integrate and clean up

### Task 4: Integrate worker outputs and remove stale PNG assumptions

**Files:**
- Any touched files above

- [ ] Reconcile shared naming and floor option consistency between Vue and mini program.
- [ ] Remove stale references to overview/plotArea/imagePath in runtime code.
- [ ] Confirm no navigation-page regression for “查看地图”.
- [ ] Review git diff for leftover dead code or conflicting edits.

**Verification**
- [ ] Run `npm run build` in `frontend/vue`.
- [ ] If available, smoke-check mini program JS syntax locally.

---

## Risks

- Mini program canvas sizing can drift if device pixel ratio is ignored. The renderer should derive its drawing size from the measured container and current screen ratio.
- Node labels can overlap in dense areas. v1 accepts limited overlap; priority is structural accuracy.
- Existing payloads are not perfectly uniform. Scene builders must tolerate `planarX/planarY`, `xCoordinate/yCoordinate`, or nested `coordinates`.

## Definition of Done

- Vue admin map no longer depends on PNG assets at runtime and can inspect nodes and edges by floor.
- Mini program map no longer depends on PNG assets at runtime and renders a readable floor map from live node/edge data.
- QR-based current location, destination, and navigation segment end appear on the correct floor scene.
- Existing navigation entry points and session flow continue to work.
