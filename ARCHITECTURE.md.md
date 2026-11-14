## Technical Deep Dive: How `layerCleanerPro` Eliminates Web Interruptions

### 1. Why There Is Sometimes a 2–3 Second Delay Before an Overlay Disappears

On many modern websites, popups and overlays are not present in the initial HTML payload. Instead, they are dynamically injected into the DOM (Document Object Model) after page load via scroll event listeners, asynchronous timers (`setTimeout`), or lazy-loaded third-party ad scripts.

To keep browser overhead minimal, `layerCleanerPro` avoids continuous polling (such as running `setInterval` loops) and instead relies on **event-driven DOM observation via `MutationObserver`** paired with a **debounce mechanism**:

* **Lazy-Load & DOM Detection Cycle:** The moment a site's script injects a new element, `MutationObserver` detects changes in `childList` and `subtree`.
* **Debouncing (300ms):** To prevent performance spikes when heavy DOM mutations occur in rapid succession, the extension waits for a 300ms quiet period after the last mutation before executing the cleanup routine (`cleanLayers`).
* **Handling Multi-Stage Resurrection:** Some aggressive sites actively monitor their overlays and attempt to re-render or unhide them immediately after removal. As `MutationObserver` and `purgeRestoredElements` repeatedly neutralize these restoration attempts over a couple of seconds until the page settles, a brief 2–3 second delay can occasionally be observed before the screen completely stabilizes.

---

### 2. Automated Consent & Response: Mechanism and Potential Trade-offs

The `autoAcceptConsent()` function inside `content.js` scans interactive elements and uses multilingual keyword matching (English, Japanese, and Chinese) to automatically trigger `.click()` on confirmation buttons (e.g., *Accept*, *Agree*, *OK*) within cookie banners and consent dialogs.

#### Advantages
* Simply hiding a consent banner via CSS (`display: none`) often leaves the page unusable—background scroll locks remain active, or the site refuses to load main content until a consent state flag is triggered. Automating the click completes the site's expected flow so you can read immediately.

#### Potential Drawbacks & Risks
* **Unintended Consent to Tracking/Terms:** Because dialogs are accepted automatically, the user agrees to privacy policies or tracking cookies without manually reviewing them.
* **False-Positive Clicks:** Although the script checks the surrounding container context (`containerText`) for privacy- or cookie-related keywords before acting, there is still a minor risk of accidentally clicking an unrelated "OK" or confirmation button inside a similarly worded dialog.
* **Bot Detection & Terms of Service Gray Areas:** Having a script automatically respond to human-verification prompts or consent gates operates in a gray area regarding site Terms of Service and bot-mitigation systems. For this reason, the feature is cleanly isolated behind a single toggle flag (`ENABLE_AUTO_CONSENT`) at the top of `content.js` for users who prefer to disable it.

---

### 3. Preventing Unwanted Tab Spawns Triggered by Clicks

Malicious popups and redirect traps frequently hijack click events (or react to automated clicks) by calling `window.open()` to force-open new advertisement tabs. `layerCleanerPro` neutralizes this at the browser level inside `background.js` (Service Worker), **eliminating spawned tabs before they even render or flicker on screen**:

1. **Instant Creation Hook (`chrome.tabs.onCreated`):** Captures every new tab creation event at the exact millisecond it is initiated.
2. **Preserving Manual User Actions:** Inspects `newTab.pendingUrl` and `newTab.url` to ensure user-initiated blank tabs or browser pages (`chrome://`, `about:blank`) are never touched.
3. **Opener Domain Verification:** Looks up the parent tab (`openerTabId`) that triggered the new tab and checks its hostname against the user's opt-in blocklist.
4. **Pre-Render Termination & Counting:** If the parent domain is on the blocklist, `chrome.tabs.remove()` immediately destroys the child tab before its UI paints, while incrementing the parent tab's badge counter.

---

### 4. Geometric & Layout Heuristics for Detecting "Intrusive" Layers

Modern overlays routinely obfuscate their CSS class names and IDs to evade simple keyword filters (`modal`, `popup`, `overlay`). To counter this, `layerCleanerPro` evaluates **computed CSS layout properties and viewport geometry**:

#### Filtering Criteria
1. **Structural Protection:** Elements nested inside semantic layout tags (`<header>`, `<nav>`, `<footer>`) are explicitly ignored so legitimate site navigation is never broken.
2. **Floating Layer Isolation:** Using `getComputedStyle()`, the script targets elements positioned out of normal document flow (`position: fixed` or `absolute`) with a stacking order of `z-index >= 10`.

#### Two Geometric Rules for Identifying Interruptions
For each floating candidate, `getBoundingClientRect()` calculates its exact rendered dimensions and screen coordinates. An element is flagged and neutralized if it meets either condition:

* **Viewport Coverage (Area Heuristic):**
  The element's surface area (`rect.width * rect.height`) exceeds **30% of the total viewport area** (`window.innerWidth * window.innerHeight`), catching large modals and full-screen interstitials.
* **Center-Screen Intrusion (Centroid Heuristic):**
  Even if an element occupies less than 30% of the screen, it is flagged if its geometric center `(centerX, centerY)` falls within the **central zone of the viewport** (between 25% and 75% along both axes). This pinpoints smaller dialogs that pop up directly in the user's line of sight while sparing corner widgets:

```text
centerX = rect.left + (rect.width / 2)
centerY = rect.top  + (rect.height / 2)

0.25 * window.innerWidth  <= centerX <= 0.75 * window.innerWidth
0.25 * window.innerHeight <= centerY <= 0.75 * window.innerHeight