# Map Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared hospital map capability across the mini program and Vue admin app, including a bottom-tab map page, navigation-page map entry, realtime current/destination markers, and an admin preview page.

**Architecture:** The implementation will introduce one shared map configuration and planar-coordinate projection layer, then wire it into two frontends with different presentation goals. The mini program will consume global location/navigation state and render floor-plan overlays, while the Vue admin app will provide map validation and node preview tooling on top of the same projection rules.

**Tech Stack:** WeChat Mini Program, Vue 3 + Element Plus, existing Spring Boot/MyBatis APIs when needed, shared JavaScript/TypeScript map helpers

---

## File Map

### Shared map data and projection

- Create: `frontend/miniprogram/services/map-data.js`
- Create: `frontend/miniprogram/utils/map-projector.js`
- Create: `frontend/vue/src/constants/maps.ts`
- Create: `frontend/vue/src/utils/mapProjector.ts`

### Mini Program map feature

- Modify: `frontend/miniprogram/app.json`
- Modify: `frontend/miniprogram/pages/navigation/navigation.js`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxml`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxss`
- Create: `frontend/miniprogram/pages/map/map.js`
- Create: `frontend/miniprogram/pages/map/map.wxml`
- Create: `frontend/miniprogram/pages/map/map.wxss`
- Create: `frontend/miniprogram/pages/map/map.json`
- Create: `frontend/miniprogram/images/map.png`
- Create: `frontend/miniprogram/images/map-active.png`

### Mini Program map assets

- Create: `frontend/miniprogram/assets/maps/Hospital_Layout_Floor_1.png`
- Create: `frontend/miniprogram/assets/maps/Hospital_Layout_Floor_2.png`
- Create: `frontend/miniprogram/assets/maps/Hospital_Layout_Floor_3.png`
- Create: `frontend/miniprogram/assets/maps/hospital_3d_layout.png`

### Vue admin map preview

- Modify: `frontend/vue/src/router/index.ts`
- Modify: `frontend/vue/src/api/location.ts`
- Create: `frontend/vue/src/views/location/HospitalMapView.vue`

### Optional backend map config exposure

- Create: `backend/src/main/java/com/hospital/arnavigation/dto/MapConfigDTO.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/controller/NavigationController.java`
- Test: `backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java`

## Chunk 1: Shared map foundation

### Task 1: Add shared map configuration and projection helpers

**Files:**
- Create: `frontend/miniprogram/services/map-data.js`
- Create: `frontend/miniprogram/utils/map-projector.js`
- Create: `frontend/vue/src/constants/maps.ts`
- Create: `frontend/vue/src/utils/mapProjector.ts`

- [ ] **Step 1: Write the projection invariants into the helper comments and plan notes**

Document:
- floor plans use `minX=-8`, `maxX=48`, `minY=-20`, `maxY=35`
- `left = normalizedX`
- `top = 1 - normalizedY`
- out-of-range values clamp to `[0, 1]`
- 3D overview is read-only and does not receive precise markers

- [ ] **Step 2: Implement the mini program map config**

Create a focused config module that exports:
- floor-plan metadata for `1F`, `2F`, `3F`
- the 3D overview entry
- image paths that match packaged mini program assets

- [ ] **Step 3: Implement the mini program projector helper**

Add pure helpers for:
- `getFloorMapConfig(floor)`
- `projectPlanarPointToMap({ x, y, floor })`
- `buildMapMarker(node, markerType)`

- [ ] **Step 4: Mirror the same config and helper structure in Vue**

Keep naming and formulae aligned with the mini program implementation so rendering stays consistent across both apps.

- [ ] **Step 5: Run a manual logic sanity check**

Verify with sample points:
- `(0, 0)` projects inside bounds
- `(24, 12)` projects inside bounds
- missing floor returns no precise marker result

- [ ] **Step 6: Commit**

```bash
git add frontend/miniprogram/services/map-data.js frontend/miniprogram/utils/map-projector.js frontend/vue/src/constants/maps.ts frontend/vue/src/utils/mapProjector.ts
git commit -m "feat: add shared map projection helpers"
```

## Chunk 2: Mini Program map page and tab integration

### Task 2: Add the map tab and map page shell

**Files:**
- Modify: `frontend/miniprogram/app.json`
- Create: `frontend/miniprogram/pages/map/map.js`
- Create: `frontend/miniprogram/pages/map/map.wxml`
- Create: `frontend/miniprogram/pages/map/map.wxss`
- Create: `frontend/miniprogram/pages/map/map.json`
- Create: `frontend/miniprogram/images/map.png`
- Create: `frontend/miniprogram/images/map-active.png`
- Create: `frontend/miniprogram/assets/maps/Hospital_Layout_Floor_1.png`
- Create: `frontend/miniprogram/assets/maps/Hospital_Layout_Floor_2.png`
- Create: `frontend/miniprogram/assets/maps/Hospital_Layout_Floor_3.png`
- Create: `frontend/miniprogram/assets/maps/hospital_3d_layout.png`

- [ ] **Step 1: Write the failing manual acceptance checklist**

Expected behavior:
- bottom tab includes `地图`
- map page opens without location state
- 1F/2F/3F/3D tabs are visible
- floor-plan image renders
- 3D overview opens in read-only mode

- [ ] **Step 2: Package the map assets into the mini program**

Copy the provided PNG files into a dedicated `assets/maps` directory under the mini program.

- [ ] **Step 3: Add the map page and register it in `app.json`**

Update the page list and tab bar so the mini program exposes:
- 首页
- 地图
- 我的

- [ ] **Step 4: Build the map page shell**

Implement:
- current view mode detection
- floor switching
- image loading state
- read-only 3D overview state
- fallback messaging for missing config or image-load failure

- [ ] **Step 5: Manual verification in Mini Program DevTools**

Expected:
- tab bar shows the new entry
- page loads with floor switching
- image errors degrade to text instead of blank UI

- [ ] **Step 6: Commit**

```bash
git add frontend/miniprogram/app.json frontend/miniprogram/pages/map/map.js frontend/miniprogram/pages/map/map.wxml frontend/miniprogram/pages/map/map.wxss frontend/miniprogram/pages/map/map.json frontend/miniprogram/images/map.png frontend/miniprogram/images/map-active.png frontend/miniprogram/assets/maps/Hospital_Layout_Floor_1.png frontend/miniprogram/assets/maps/Hospital_Layout_Floor_2.png frontend/miniprogram/assets/maps/Hospital_Layout_Floor_3.png frontend/miniprogram/assets/maps/hospital_3d_layout.png
git commit -m "feat: add mini program map tab"
```

### Task 3: Render current and destination markers in the mini program

**Files:**
- Modify: `frontend/miniprogram/pages/map/map.js`
- Modify: `frontend/miniprogram/pages/map/map.wxml`
- Modify: `frontend/miniprogram/pages/map/map.wxss`

- [ ] **Step 1: Define the v1 marker acceptance behavior**

Expected behavior:
- if `currentLocation` exists, the current marker renders on its floor plan
- if `destination` exists, the destination marker renders on its floor plan
- if the user is on a different floor, the page shows floor-summary text instead of forcing a wrong marker
- 3D overview shows summary text only, no precise markers

- [ ] **Step 2: Read global app state and navigation session**

Use:
- `app.globalData.currentLocation`
- `app.globalData.destination`
- `app.globalData.navigationSession`

Prioritize the session current node when available.

- [ ] **Step 3: Convert nodes into projected markers**

Use the shared projector helper to build render-ready marker data for:
- `CURRENT`
- `DESTINATION`

- [ ] **Step 4: Render overlay markers and state cards**

Implement an absolutely-positioned overlay layer and summary cards that show:
- current location name
- destination name
- current floor
- target floor
- floor mismatch guidance

- [ ] **Step 5: Manual verification in Mini Program DevTools**

Expected:
- current marker appears after a successful QR scan
- destination marker appears after selecting a destination
- switching floors hides markers that do not belong to the current floor

- [ ] **Step 6: Commit**

```bash
git add frontend/miniprogram/pages/map/map.js frontend/miniprogram/pages/map/map.wxml frontend/miniprogram/pages/map/map.wxss
git commit -m "feat: render mini program map markers"
```

### Task 4: Add the navigation-page entry into the map feature

**Files:**
- Modify: `frontend/miniprogram/pages/navigation/navigation.js`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxml`
- Modify: `frontend/miniprogram/pages/navigation/navigation.wxss`

- [ ] **Step 1: Add the failing manual acceptance note**

Expected behavior:
- navigation page shows a `查看地图` action
- tapping it opens the map page in navigation mode
- map page reuses the existing session and does not rebuild routing state

- [ ] **Step 2: Add a navigation-to-map action in `navigation.js`**

Use a normal page jump with mode parameters instead of a new route-planning request.

- [ ] **Step 3: Add the UI control in `navigation.wxml` and style it**

Fit the new action into the existing action group without disturbing current navigation flows.

- [ ] **Step 4: Manual verification**

Expected:
- map page opens from navigation
- returning to navigation keeps the session intact

- [ ] **Step 5: Commit**

```bash
git add frontend/miniprogram/pages/navigation/navigation.js frontend/miniprogram/pages/navigation/navigation.wxml frontend/miniprogram/pages/navigation/navigation.wxss
git commit -m "feat: add navigation map entry"
```

## Chunk 3: Vue admin map preview

### Task 5: Add the admin map preview page and route

**Files:**
- Modify: `frontend/vue/src/router/index.ts`
- Modify: `frontend/vue/src/api/location.ts`
- Create: `frontend/vue/src/views/location/HospitalMapView.vue`

- [ ] **Step 1: Write the failing manual acceptance checklist**

Expected behavior:
- admin route exists
- page loads floor-plan image and node overlays
- floor filter, type filter, and search work
- clicking a marker shows node details

- [ ] **Step 2: Extend the location API typing only as needed**

Ensure the existing location API surfaces the fields needed for projection without inventing a second coordinate contract.

- [ ] **Step 3: Add the route**

Wire a new route into the existing authenticated `BasicLayout` children.

- [ ] **Step 4: Build `HospitalMapView.vue`**

Implement:
- floor switcher
- 3D overview read-only tab
- node search and type filter
- projected node overlays
- selected-node details panel

- [ ] **Step 5: Add optional edge-overlay scaffolding without requiring it for v1**

If edge data is easy to obtain from current APIs, include a toggle. Otherwise, leave the toggle disabled with explicit TODO-free copy such as “v1 暂未接入”.

- [ ] **Step 6: Run a local frontend verification**

Run: `npm run build`
Workdir: `frontend/vue`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/vue/src/router/index.ts frontend/vue/src/api/location.ts frontend/vue/src/views/location/HospitalMapView.vue
git commit -m "feat: add admin hospital map preview"
```

## Chunk 4: Optional backend map config endpoint

### Task 6: Expose map metadata from the backend if integration benefit is worth the churn

**Files:**
- Create: `backend/src/main/java/com/hospital/arnavigation/dto/MapConfigDTO.java`
- Modify: `backend/src/main/java/com/hospital/arnavigation/controller/NavigationController.java`
- Test: `backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java`

- [ ] **Step 1: Decide whether to ship v1 with local config or server config**

Default recommendation:
- use local config first if it avoids cross-stack churn
- only add backend exposure if both frontends clearly benefit right now

- [ ] **Step 2: If backend exposure is chosen, add a failing controller test**

Test:
- `GET /api/maps` returns floor-plan metadata and overview metadata

- [ ] **Step 3: Implement the DTO and controller response**

Keep the response static and focused; do not add image upload or edit APIs.

- [ ] **Step 4: Run the targeted backend tests**

Run: `mvn -Dtest=NavigationControllerTest test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hospital/arnavigation/dto/MapConfigDTO.java backend/src/main/java/com/hospital/arnavigation/controller/NavigationController.java backend/src/test/java/com/hospital/arnavigation/controller/NavigationControllerTest.java
git commit -m "feat: expose map metadata api"
```

## Chunk 5: Final integration and verification

### Task 7: Verify cross-app consistency and clean handoff

**Files:**
- Inspect: `frontend/miniprogram/pages/map/map.js`
- Inspect: `frontend/miniprogram/utils/map-projector.js`
- Inspect: `frontend/vue/src/views/location/HospitalMapView.vue`
- Inspect: `frontend/vue/src/utils/mapProjector.ts`

- [ ] **Step 1: Verify projection parity**

Confirm the same sample node lands consistently in both frontends:
- 1F entrance
- elevator hall
- one destination on 2F or 3F

- [ ] **Step 2: Verify failure fallbacks**

Check:
- missing map config shows text fallback
- image load failure shows text fallback
- invalid floor avoids precise marker rendering

- [ ] **Step 3: Run mini program manual verification**

Expected:
- scan a QR code on the index page
- open the map tab
- current marker appears
- select a destination
- destination marker appears
- open map from navigation page

- [ ] **Step 4: Run Vue verification**

Run: `npm run build`
Workdir: `frontend/vue`
Expected: PASS.

- [ ] **Step 5: Run backend verification if Task 6 was implemented**

Run: `mvn test`
Workdir: `backend`
Expected: PASS or only unrelated pre-existing failures documented in final notes.

- [ ] **Step 6: Commit**

```bash
git add frontend/miniprogram/app.json frontend/miniprogram/pages/map/map.js frontend/miniprogram/pages/map/map.wxml frontend/miniprogram/pages/map/map.wxss frontend/miniprogram/pages/navigation/navigation.js frontend/miniprogram/pages/navigation/navigation.wxml frontend/miniprogram/pages/navigation/navigation.wxss frontend/miniprogram/services/map-data.js frontend/miniprogram/utils/map-projector.js frontend/vue/src/constants/maps.ts frontend/vue/src/utils/mapProjector.ts frontend/vue/src/views/location/HospitalMapView.vue frontend/vue/src/router/index.ts frontend/vue/src/api/location.ts
git commit -m "feat: integrate hospital map feature"
```

Plan complete and saved to `docs/superpowers/plans/2026-03-20-map-feature.md`. Ready to execute.
