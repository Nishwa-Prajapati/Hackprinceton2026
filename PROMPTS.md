# LabZero — Claude Code Prompt Sequence
## Phase 1: The Playable Skeleton

Read this file top to bottom before starting.
Run ONE prompt at a time. Wait for it to finish and verify it works before moving to the next.
Never skip a prompt. Never combine two prompts into one.

---

## Before You Start — Setup Checklist

```bash
# 1. Make sure Claude Code is installed
npm install -g @anthropic-ai/claude-code

# 2. Navigate to your project folder
cd labzero

# 3. Make sure CLAUDE.md is in the root
ls CLAUDE.md   # should print: CLAUDE.md

# 4. Open Claude Code
claude

# 5. Verify it reads CLAUDE.md (type this first thing)
> What project am I working on and what is Phase 1's goal?
# It should describe LabZero and the Phase 1 checklist. If it doesn't, something is wrong with CLAUDE.md placement.
```

---

## PROMPT 1 — Project Scaffold

**What this does:** Creates the entire folder structure, installs all packages, sets up Vite + React + Tailwind + Three.js + Express proxy. Nothing visual yet — just the foundation.

```
Scaffold the complete LabZero project as defined in CLAUDE.md.

Create the exact folder structure from the File Structure section.

For client/:
- Initialize Vite + React 18
- Install: three@0.165.0, gsap@3, @gsap/react, tailwindcss@3, axios, react@18, react-dom@18
- Configure tailwind.config.js and postcss
- Create index.html with title "LabZero"
- Create src/main.jsx that mounts <App /> to #root
- Create src/App.jsx that renders a black full-screen div with text "LabZero Loading..." for now
- Create src/api/client.js as an axios instance with baseURL pointing to http://localhost:3001

For server/:
- Initialize Node.js with Express
- Install: express, cors, dotenv, axios, node-fetch
- Create server/index.js that starts on port 3001 with cors enabled
- Create all 4 route files (elevenlabs.js, gemini.js, claude.js) as empty stubs that return { ok: true }
- Mount routes at /api/narrate, /api/iteminfo, /api/explain, /api/portfolio
- Create .env.example with: ELEVENLABS_KEY=, GEMINI_KEY=, ANTHROPIC_KEY=, PORT=3001

For root:
- Create package.json with scripts:
  "dev": runs both client (port 5173) and server (port 3001) concurrently
  "client": cd client && vite
  "server": cd server && node index.js

Create src/data/reactions.json with exactly 2 reactions following the schema in CLAUDE.md:
1. na-water-01 (Sodium + Water, zone B, failure: explosion_red)
2. hcl-naoh-01 (HCl + NaOH, zone A, correct: colour change, failure: wrong_acid)

Do not create any Three.js code yet. Just the scaffold.
```

**Verify before next prompt:**
- `npm run dev` starts without errors
- Browser shows "LabZero Loading..." on black screen
- `/api/iteminfo` returns `{ ok: true }` when you visit localhost:3001/api/iteminfo

---

## PROMPT 2 — Basic Three.js Scene

**What this does:** Creates the Three.js engine with a basic 3D room — floor, walls, ceiling, lights. No lab furniture yet. Just a walkable space with the right colors.

```
Create src/lab/LabEngine.js as the core Three.js class for LabZero.

LabEngine should:
- Accept a canvas DOM element in constructor
- Create a THREE.WebGLRenderer attached to that canvas, with antialias: true, shadowMap enabled
- Create a THREE.PerspectiveCamera (FOV 75, positioned at ENTRANCE waypoint: x:0, y:1.7, z:12, looking toward z:0)
- Create a THREE.Scene with background color #0d0d1a (very dark navy)
- Add fog: THREE.Fog('#0d0d1a', 15, 40)
- Add ambient light: color #1a1a3e, intensity 0.4
- Add 3 rectangular overhead lights (THREE.RectAreaLight, color #ffffff, intensity 2.0) positioned at y:4, spaced along z axis
- Add orange accent point lights (color #FF8C00, intensity 0.8) along bench edges at y:1.0
- Build a room:
  - Floor: PlaneGeometry(20, 30), MeshStandardMaterial color #d4d4d4, roughness 0.3, metalness 0.1, receiveShadow true
  - Ceiling: same geometry, color #2a2a3e, at y:5
  - Back wall: BoxGeometry(20, 5, 0.2) at z:-14, color #1e1e2e
  - Left wall: BoxGeometry(0.2, 5, 30) at x:-10, color #1e1e2e
  - Right wall: same at x:10
- Add a resize handler that updates camera aspect and renderer size
- Expose: init(canvas), animate(), dispose(), scene, camera, renderer

Update App.jsx to:
- Create a canvas ref
- On mount, init LabEngine with the canvas ref
- Canvas should be position:fixed, full screen (w-screen h-screen)
- Remove the "LabZero Loading..." text
```

**Verify before next prompt:**
- Dark 3D room visible in browser
- Room has visible floor and walls
- Soft lighting visible (not pitch black, not overexposed)

---

## PROMPT 3 — Lab Aesthetic: Benches and Cabinets (Visual Shell)

**What this does:** Adds the sci-fi lab furniture — 2 long bench islands and 4 wall cabinets. This is the visual that matches the reference images. Orange trim, grey surfaces, glowing blue strips.

```
In LabEngine.js, add a buildLabFurniture() method called during init.

Build the following using Three.js geometry (NO external 3D model files):

BENCH ISLANDS (2 of them, centered in the lab):
  Each bench:
  - Main surface: BoxGeometry(4, 0.1, 1.5), MeshStandardMaterial color #e8e8e8, roughness 0.2
  - Body: BoxGeometry(4, 0.9, 1.5), color #3a3a4a, roughness 0.6
  - Orange trim strip along all 4 base edges: BoxGeometry(4.05, 0.05, 0.05), color #FF8C00, emissive #FF6000, emissiveIntensity 0.4
  - Blue diagonal hazard stripe texture on body (use a canvas texture: alternating #1a1a8a and #2a2a2a diagonal stripes, 45deg)
  - Position bench 1 at (0, 0.5, 0), bench 2 at (0, 0.5, -6)

WALL CABINETS (4 of them, along back and side walls):
  Each cabinet:
  - Body: BoxGeometry(2.5, 2.5, 0.4), MeshStandardMaterial color #1e1e2e, roughness 0.5
  - Door frame: BoxGeometry(2.6, 2.6, 0.05), color #2a2a3a
  - Orange top trim: BoxGeometry(2.6, 0.08, 0.08), color #FF8C00, emissive #FF6000, emissiveIntensity 0.5
  - Cyan LED strip: BoxGeometry(2.3, 0.03, 0.03) at top inside, color #00D4FF, emissive #00D4FF, emissiveIntensity 1.5
  - Small blue screen panel: BoxGeometry(0.6, 0.3, 0.02) at top centre of door, color #0a2a5e, emissive #00aaff, emissiveIntensity 0.8
  - Cabinet positions:
    Cabinet A: left wall, x:-9, y:2, z:2 (rotated 90deg to face inward)
    Cabinet B: left wall, x:-9, y:2, z:-3 (rotated 90deg)
    Cabinet C: back wall, x:-3, y:2, z:-13.5
    Cabinet D: back wall, x:3, y:2, z:-13.5

OVERHEAD LIGHTS (matching reference image):
  - 4 rectangular light housing boxes: BoxGeometry(1.5, 0.1, 0.5), color #2a2a3a
  - Each with emissive white panel beneath: BoxGeometry(1.3, 0.02, 0.4), color #ffffff, emissive #ffffff, emissiveIntensity 1.0
  - Hung from ceiling at y:4.5, positions: z:6, z:2, z:-3, z:-8

Add a PointLight (color #00D4FF, intensity 0.3) next to each cabinet for the cyan glow effect.

Store cabinet meshes in this.cabinets[] array for later raycasting.
```

**Verify before next prompt:**
- Lab looks like the reference images (grey/dark walls, orange bench edges, glowing cabinets)
- 2 bench islands visible in the center
- 4 wall cabinets with cyan LED glow
- Overhead lights with white glow panels

---

## PROMPT 4 — Scroll Navigation (Walking Through the Lab)

**What this does:** Makes the camera physically move forward/backward as the student scrolls. The feeling of walking into the lab.

```
Create src/lab/LabControls.js.

This class manages all camera movement for LabZero using GSAP tweens.

Define these waypoints as constants at the top of the file:
```javascript
const WAYPOINTS = {
  ENTRANCE:   { pos: {x:0, y:1.7, z:12},  look: {x:0, y:1.7, z:0}  },
  CENTER:     { pos: {x:0, y:1.7, z:4},   look: {x:0, y:1.7, z:-4} },
  BENCH_VIEW: { pos: {x:0, y:1.4, z:1},   look: {x:0, y:0.9, z:-3} },
  CABINET_A:  { pos: {x:-7, y:1.7, z:2},  look: {x:-9, y:1.5, z:2} },
  CABINET_B:  { pos: {x:-7, y:1.7, z:-3}, look: {x:-9, y:1.5, z:-3}},
  CABINET_C:  { pos: {x:-2, y:1.7, z:-11},look: {x:-3, y:1.5, z:-13.5}},
  CABINET_D:  { pos: {x:2,  y:1.7, z:-11},look: {x:3,  y:1.5, z:-13.5}},
}
```

LabControls class:
- Constructor accepts camera (THREE.Camera)
- Tracks currentWaypoint (starts at "ENTRANCE") and scrollProgress (0 to 1)
- On wheel event: update scrollProgress by event.deltaY * 0.001, clamped 0–1
  - 0.0–0.4 → lerp camera between ENTRANCE and CENTER
  - 0.4–0.8 → lerp camera between CENTER and BENCH_VIEW
  - Use GSAP to tween camera position and a lookAt target (store lookAt as a THREE.Vector3)
- Method goToCabinet(cabinetId): GSAP tween camera to CABINET_X waypoint in 0.8s, ease: "power2.inOut"
- Method returnToLab(): GSAP tween back to last non-cabinet waypoint in 0.8s
- Method tweenCamera(waypoint, duration=0.8): internal GSAP tween for position + lookAt
- The camera must always call camera.lookAt(this.lookTarget) in the LabEngine animate loop

Integrate LabControls into LabEngine:
- Instantiate in init()
- Call controls.handleScroll in a wheel event listener on the canvas
- In animate loop: camera.lookAt(controls.lookTarget)

Add this to App.jsx:
- After lab loads, show a small hint at bottom of screen: "Scroll to walk into the lab ↓" that fades out after 4 seconds
```

**Verify before next prompt:**
- Scrolling moves the camera forward into the lab
- Scrolling back moves it toward the entrance
- Camera always looks forward (not at the sky or floor)
- Movement is smooth (GSAP easing, not jerky)

---

## PROMPT 5 — Cabinet Click to Open

**What this does:** Clicking a cabinet zooms the camera to it, the doors animate open, and you see inside.

```
Create src/lab/Cabinet.js.

Cabinet class:
- Constructor: accepts { id, mesh, doorMeshLeft, doorMeshRight, waypoint, items[] }
- State machine: CLOSED → OPENING → OPEN → CLOSING → CLOSED
- open() method:
  - Set state to OPENING
  - GSAP tween doorMeshLeft.rotation.y from 0 to -Math.PI*0.65 in 0.5s
  - GSAP tween doorMeshRight.rotation.y from 0 to Math.PI*0.65 in 0.5s
  - On complete: set state to OPEN, emit "cabinet:opened" event with this.id
- close() method:
  - Reverse the door tweens, on complete set state CLOSED
- isOpen getter

Update LabEngine.buildLabFurniture():
- Each cabinet body needs TWO door panels instead of one solid face:
  - Left door: BoxGeometry(1.2, 2.3, 0.05), pivot at LEFT EDGE (set geometry to offset x by +0.6)
  - Right door: same, pivot at RIGHT EDGE (offset x by -0.6)
  - Both doors: color #2a2a3e, orange edge strip on outer edge
- Create Cabinet instances for all 4 cabinets, store in this.cabinets Map keyed by id ("A","B","C","D")

Add raycasting to LabEngine:
- On canvas click: raycast against all cabinet door meshes
- If hit and cabinet is CLOSED: call labControls.goToCabinet(cabinetId), then cabinet.open()
- If hit and cabinet is OPEN: do nothing (items will be clickable separately)

Create src/components/CabinetOverlay.jsx:
- Shown when any cabinet is open (driven by React Context state activeCabinet !== null)
- Shows cabinet name at top: "Cabinet A — Reagents"
- Shows a "← Back to Lab" button in top-left
- On click: calls returnToLab(), closes cabinet
- Style: semi-transparent dark overlay at screen edges only (not covering cabinet view)
- Font: monospace, color #00D4FF (cyan), to match lab aesthetic

Create src/lab/LabState.js as a simple EventEmitter (use Node's EventEmitter or a tiny custom one):
- Events: cabinet:opened, cabinet:closed, item:picked, item:placed, reaction:started, reaction:complete
- Import this in LabEngine and Cabinet — use it to communicate state to React
```

**Verify before next prompt:**
- Clicking a cabinet: camera zooms in smoothly
- Both cabinet doors swing open
- CabinetOverlay UI appears (cabinet name + back button)
- Clicking "Back to Lab" closes cabinet and camera returns to lab

---

## PROMPT 6 — Items Inside Cabinets

**What this does:** Populates cabinets with 3D chemical bottles and tools. These are the items students will pick up.

```
Create src/lab/ItemManager.js.

Define CABINET_ITEMS at the top:
```javascript
const CABINET_ITEMS = {
  A: [
    { id: "sodium",    label: "Sodium (Na)",    color: "#silver", shape: "cylinder",  formula: "Na",   hazard: "high"   },
    { id: "water",     label: "Water (H₂O)",    color: "#4488ff", shape: "flask",     formula: "H₂O",  hazard: "none"   },
    { id: "hcl",       label: "HCl (aq)",       color: "#ffff88", shape: "bottle",    formula: "HCl",  hazard: "medium" },
    { id: "naoh",      label: "NaOH (aq)",      color: "#88ffaa", shape: "bottle",    formula: "NaOH", hazard: "medium" },
  ],
  B: [
    { id: "ethanol",   label: "Ethanol",        color: "#ccddff", shape: "bottle",    formula: "C₂H₅OH", hazard: "medium" },
    { id: "cuso4",     label: "CuSO₄ (aq)",     color: "#0066ff", shape: "flask",     formula: "CuSO₄",  hazard: "low"    },
    { id: "zinc",      label: "Zinc plate",     color: "#aaaaaa", shape: "plate",     formula: "Zn",     hazard: "low"    },
    { id: "beaker",    label: "Beaker",         color: "#ffffff", shape: "beaker",    formula: null,     hazard: "none"   },
  ],
  C: [
    { id: "bunsen",    label: "Bunsen burner",  color: "#555555", shape: "bunsen",    formula: null,     hazard: "medium" },
    { id: "tongs",     label: "Tongs",          color: "#888888", shape: "tongs",     formula: null,     hazard: "none"   },
    { id: "testtubes", label: "Test tubes",     color: "#dddddd", shape: "testtube",  formula: null,     hazard: "none"   },
    { id: "indicator", label: "pH Indicator",   color: "#ff88ff", shape: "strip",     formula: null,     hazard: "none"   },
  ],
  D: [
    { id: "conical",   label: "Conical flask",  color: "#ffffff", shape: "conical",   formula: null,     hazard: "none"   },
    { id: "pipette",   label: "Pipette",        color: "#eeeeee", shape: "pipette",   formula: null,     hazard: "none"   },
    { id: "phmeter",   label: "pH Meter",       color: "#222266", shape: "box",       formula: null,     hazard: "none"   },
    { id: "goggles",   label: "Safety goggles", color: "#334455", shape: "goggles",   formula: null,     hazard: "none"   },
  ],
}
```

For each item shape, build a 3D mesh using only Three.js geometry:
- "bottle": CylinderGeometry(0.06, 0.08, 0.25) for body + smaller cylinder for neck
- "flask": SphereGeometry(0.1) flattened (scale y:0.7) + cylinder neck
- "cylinder": CylinderGeometry(0.05, 0.05, 0.15) — for sodium (silvery)
- "beaker": CylinderGeometry(0.09, 0.08, 0.18, 32, 1, true) — open top
- "plate": BoxGeometry(0.15, 0.01, 0.1)
- "bunsen": CylinderGeometry(0.04, 0.06, 0.2) base + thin tube
- "box": BoxGeometry(0.1, 0.06, 0.08)
- All others: simple BoxGeometry(0.08, 0.15, 0.08) as fallback

Items inside each cabinet sit on cabinet shelves:
- Position items spaced evenly across shelf at y offsets: -0.3, 0.3 (2 shelves)
- Items face outward (toward camera)
- Each item has a small floating label above it (use CSS2DRenderer or a canvas sprite)

ItemManager class:
- populateCabinet(cabinetId, scene): creates all item meshes for that cabinet, adds to scene
- Items only visible when parent cabinet is open
- On item click (raycasted): item floats up 0.3 units over 0.3s (GSAP), emits "item:picked" with itemId
- Expose: heldItems[] (items currently picked up by student), placeOnBench(itemId)
```

**Verify before next prompt:**
- Opening Cabinet A shows 4 items on shelves (bottles in blue, yellow, green, silver)
- Items are clearly visible and have label text above them
- Clicking an item causes it to float up slightly
- Console logs "item:picked" with the correct item id

---

## PROMPT 7 — Drag Items to Bench

**What this does:** After picking up an item from a cabinet, it follows the cursor to the bench. This is the core drag mechanic.

```
Update ItemManager.js to handle the full drag-to-bench flow:

When an item is clicked (picked state):
1. The item mesh detaches from cabinet and follows the mouse cursor in 3D space
   - Use a fixed z-depth of 3 units in front of the camera (raycasting onto an invisible plane at z=camera.z-3)
   - Item floats at y:1.3 (slightly above bench level) while being dragged
   - Item rotates slowly on Y axis while held (subtle, 0.5 rad/s)
2. A glowing ring appears under the item (TorusGeometry, color #00D4FF, emissive)
3. The bench area shows a subtle glowing outline when an item is being dragged (bench mesh emissive pulse)

When student clicks on the BENCH surface (while holding an item):
1. Item snaps to bench with a small bounce animation (GSAP y:-0.05 then back)
2. Item is now "placed" — stops following cursor
3. Emits "item:placed" with { itemId, benchPosition }
4. A small label appears below the item on the bench
5. Up to 4 items can be placed on the bench simultaneously

Update CabinetOverlay.jsx:
- Add a "Done" button (bottom center) that:
  - Closes the cabinet (cabinet.close())
  - Triggers labControls.returnToLab()
  - Hides the CabinetOverlay
  - Shows a HUD message: "Items on bench: [item names]"

Create src/components/HUD.jsx:
- Fixed overlay, top of screen
- Left side: current zone name (e.g., "Cabinet A — Open")
- Center: items currently on bench as pill badges (dark background, cyan text, item name)
- Right side: subtle "LabZero" logo text in orange
- Bottom center (when items on bench): "React" button — glowing orange, prominent
- Style: glassmorphism background (rgba dark with blur), monospace font, cyan/orange palette
```

**Verify before next prompt:**
- After clicking an item in cabinet, it follows mouse cursor
- Clicking on bench surface drops item there with bounce
- Item shows as pill badge in HUD
- "Done" button returns camera to lab with items shown in HUD
- "React" button visible when at least 1 item is on bench

---

## PROMPT 8 — Reaction Engine + Failure Animation

**What this does:** The "React" button triggers the reaction. If correct — gentle animation. If wrong (or wrong order) — the explosion failure animation fires.

```
Create src/lab/ReactionEngine.js.

Import reactions.json. This class handles all reaction logic.

checkReaction(benchItems: string[]): 
  - Takes array of item IDs currently on bench
  - Looks up reactions.json to find a matching reaction
  - Returns { reactionId, outcome: "success"|"failure", failureMode? }
  - If benchItems contains ["sodium", "water"] → returns na-water-01, outcome "failure" (wrong_order by default for Phase 1)
  - If no matching reaction found → returns { outcome: "no_reaction" }

triggerReaction(benchItems, scene, camera):
  - Calls checkReaction
  - If outcome is "failure": calls this.playFailureAnimation(reactionId, failureMode, scene)
  - If outcome is "success": calls this.playSuccessAnimation(reactionId, scene)
  - If "no_reaction": shakes bench slightly (GSAP shake on bench mesh x position)

Create src/lab/Particles.js:

explosionParticles(scene, position):
  - Creates 200 particles using THREE.Points with BufferGeometry
  - Particle colors: mix of #FF4400, #FF8800, #FFCC00, #FF0000
  - On trigger: particles burst outward from position with random velocities
  - Gravity applied (vy -= 0.002 per frame)
  - Particles fade out over 2 seconds then are removed from scene
  - Add 3 PointLights (red/orange) at burst position, fade out over 1 second

smokeParticles(scene, position):
  - 80 grey particles that rise and expand slowly
  - Color: #444444 to #888888
  - Rise over 3 seconds, fade out

Connect to HUD.jsx:
- When "React" button is clicked:
  - Disable the button (prevent double-click)
  - Call reactionEngine.triggerReaction()
  - Shake camera slightly: GSAP tween camera.position.x by +-0.05 rapidly 4 times (for explosion only)

Create src/components/FailurePanel.jsx:
- Appears after failure animation completes (listen to "reaction:complete" event)
- Dark panel, bottom half of screen
- Title: "What went wrong" in orange
- Body: failure explanation from reactions.json failureModes[].explanation
- Sub-text: "Try again" button (clears bench, closes panel)
- Animate in from bottom with GSAP (y: 100% → 0%)
```

**Verify before next prompt:**
- Placing sodium + water on bench and clicking "React" triggers explosion
- Red/orange particles burst from bench position
- Camera shakes on explosion
- FailurePanel slides up with explanation text
- "Try again" resets bench to empty

---

## PROMPT 9 — ElevenLabs Narration

**What this does:** Wires the ElevenLabs API so the human voice narrates the failure. Falls back to Web Speech if API unavailable.

```
Fill in server/routes/elevenlabs.js:

POST /api/narrate
  - Accepts body: { text: string, voiceId?: string }
  - Uses voiceId from env ELEVENLABS_VOICE_ID (default: "EXAVITQu4vr4xnSDxMaL" — Rachel voice)
  - Calls ElevenLabs API: POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
    Headers: xi-api-key: process.env.ELEVENLABS_KEY, Content-Type: application/json
    Body: { text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }
  - Returns the audio buffer as Content-Type: audio/mpeg
  - On any error: return { error: true, fallback: text } with status 200 (not 500)

Create src/hooks/useNarration.js:

narrate(text: string):
  - POST /api/narrate with { text }
  - On success: create Audio object from blob, play()
  - On failure OR if { error: true }: fall back to window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  - Store currently playing audio in ref so it can be stopped
  
stopNarration(): stops current audio/utterance

Create src/components/NarrationBar.jsx:
  - Fixed bar at very bottom of screen (above any other panels)
  - Shows the text currently being narrated as a subtitle
  - Cyan text on dark semi-transparent background
  - Text types in character by character (typewriter effect, 40ms per char) using GSAP or setInterval
  - Has a small speaker icon on the left, mute toggle on the right
  - Fades out 2 seconds after narration text ends

Trigger narration at these moments:
1. Lab entrance loads → narrate sensoryData.approach from any reaction in reactions.json
   Use a generic welcome: "Welcome to LabZero. Select a cabinet to begin."
2. Cabinet opens → narrate cabinet description: "Cabinet A contains reactive metals and acid-base reagents. Handle with care."
3. Item picked up → narrate item label + hazard: "You're holding sodium. Hazard level: high. Store in mineral oil away from water."
4. Reaction failure → narrate failureModes[].elevenLabsText from the matching failure mode
5. Explanation panel shown → narrate the first sentence of the explanation
```

**Verify before next prompt:**
- On lab load: voice says "Welcome to LabZero"
- On cabinet open: voice describes the cabinet
- On item pick-up: voice says the item name and hazard
- On explosion: voice narrates the failure sensory description
- NarrationBar subtitle text appears and types in character by character
- If ELEVENLABS_KEY is empty: Web Speech Synthesis fires instead (no crash)

---

## PROMPT 10 — Gemini Item Info Panel

**What this does:** When an item is picked up, a Gemini-powered info panel appears beside it with real chemistry information.

```
Fill in server/routes/gemini.js:

POST /api/iteminfo
  - Accepts body: { itemName: string, formula: string }
  - Calls Gemini API: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_KEY}
  - Prompt: "You are a chemistry tutor. For the chemical or lab item '{itemName}' (formula: {formula}), provide ONLY a JSON response with these fields: name (string), formula (string), hazardLevel ('none'|'low'|'medium'|'high'), hazardDescription (string, max 10 words), realWorldUses (array of 3 strings, each max 8 words), funFact (string, max 20 words). No markdown, no explanation, just JSON."
  - Parse the JSON from Gemini's response text
  - Return the parsed object
  - On error: return the local fallback from ITEM_FALLBACKS object (hardcoded in this file for the 16 Phase 1 items)

Create src/components/ItemInfoPanel.jsx:

Appears when activeCabinet is open AND an item is hovered (not yet picked up):
  - Position: floats to the RIGHT of the cursor, 260px wide
  - Background: dark glass (#0d0d1aee) with 1px cyan border (#00D4FF33)
  - Layout:
    - Top: item name (orange, 16px bold, monospace) + formula (cyan, 14px)
    - Hazard badge: color-coded pill (green=none, yellow=low, orange=medium, red=high)
    - "Real world uses" section: 3 bullet points, grey text 12px
    - Fun fact at bottom: italic, dim white, 11px
    - Small loading spinner while Gemini API call is in flight
  - Animate in: scale from 0.8 + fade in, 0.2s
  - Disappears when cursor leaves the item
  - On mobile/tablet: appears below the item instead of to the right

Wire to ItemManager.js:
  - On item hover (mouseover raycaster): emit "item:hover" with itemId
  - On item hover out: emit "item:hoverout"
  - React listens to these events, calls /api/iteminfo, shows ItemInfoPanel
```

**Verify before next prompt:**
- Hovering over sodium in cabinet: info panel appears to the right with name, formula, hazard
- Panel shows "Real world uses" with 3 bullet points
- Panel fades in smoothly
- Moving cursor away hides the panel
- If Gemini is unavailable: fallback local data shows (no crash, no empty panel)

---

## PROMPT 11 — Polish Pass: Visual Quality

**What this does:** Final visual polish to make the lab look like the reference images. Better lighting, reflections, sci-fi details.

```
Polish LabEngine.js and the lab visual quality:

LIGHTING IMPROVEMENTS:
- Add SpotLight (color #FF8C00, intensity 2, angle 0.3) above each bench pointing down — creates dramatic overhead spot
- Add a dim blue hemisphere light: HemisphereLight('#001133', '#000000', 0.3) for subtle ambient cool tone
- Cabinet LED strips: increase emissiveIntensity to 2.5, add a small PointLight (color #00D4FF, intensity 1.5, distance 2) at each cabinet

FLOOR:
- Replace solid floor with a MeshStandardMaterial that has:
  - color: #c8c8c8
  - roughness: 0.15
  - metalness: 0.05
  - envMapIntensity: 0.3
- The floor should look like the reflective lab floor in the reference images
- Add a subtle grid texture using canvas: 1px lines every 50px in #aaaaaa on #c8c8c8

BENCH IMPROVEMENTS:
- Bench surface: roughness 0.1, metalness 0.05 (slightly shiny, like the reference)
- Add a sink cutout on one bench: BoxGeometry(0.4, 0.05, 0.3) inset into the surface, black inside
- Add a small digital display on each bench edge: BoxGeometry(0.3, 0.06, 0.02), emissive #0044ff, emissiveIntensity 1.5 (matches the blue readouts in reference)

CABINET IMPROVEMENTS:
- The screen panel at top of each cabinet shows animated scanline effect:
  Use a canvas texture that slowly scrolls a horizontal line pattern (update texture every 3 frames)
- Add a hexagonal ceiling decoration piece (matching the cyan hexagon in image 1):
  TorusGeometry-based hex shape at ceiling center, color #00D4FF, emissive #00D4FF, emissiveIntensity 0.8

POST-PROCESSING (optional, only if performance allows at 60fps):
- Add THREE.UnrealBloomPass with threshold 0.8, strength 0.4, radius 0.5
  - This creates the glow effect around the orange and cyan elements
  - Only enable if FPS stays above 50 after adding it
  - Add FPS counter (stats.js or simple requestAnimationFrame counter) visible in dev mode

Update HUD.jsx:
- Add a small FPS counter in bottom-right corner (visible only in development)
- Style all HUD elements with the correct lab font: use Google Font "Share Tech Mono" or "VT323" — not Arial
```

**Verify before next prompt:**
- Lab looks dramatically closer to reference images
- Orange bench trim glows
- Cabinet LED strips glow cyan
- Floor has subtle reflections
- Overall atmosphere is dark, sci-fi, with warm orange and cool cyan accents
- Still runs at 30fps+ on a mid-range device

---

## PROMPT 12 — Integration Test + Offline Fallback

**What this does:** End-to-end test of the complete Phase 1 flow. Ensures offline fallbacks work so the demo never crashes.

```
Run a complete integration test and fix any issues.

Test the following flow and fix anything that does not work:
1. Load the app → lab entrance renders → welcome narration plays (or Web Speech fallback)
2. Scroll forward → camera moves into the lab
3. Click Cabinet A → camera zooms to cabinet, doors open, CabinetOverlay appears
4. Hover sodium → Gemini info panel appears
5. Click sodium → item picked up, follows cursor, narration says "You're holding sodium"
6. Click water flask → now holding 2 items
7. Click "Done" button → cabinet closes, camera returns to lab, 2 items shown in HUD
8. Click "React" button → explosion animation fires, camera shakes
9. Failure narration plays: "A violent crack echoes through the lab..."
10. FailurePanel slides up with explanation
11. Click "Try again" → bench resets, panel closes

OFFLINE FALLBACK AUDIT:
Add an OFFLINE_MODE constant at the top of src/api/client.js.
When OFFLINE_MODE = true, ALL API calls return local fallback data immediately without any network request.
Fallback data to provide:
- ElevenLabs: return null (Web Speech fires instead)
- Gemini: return hardcoded sodium info { name: "Sodium", formula: "Na", hazardLevel: "high", hazardDescription: "Reacts violently with water", realWorldUses: ["Used in street lights", "Component in soap making", "Nerve signal transmission"], funFact: "Sodium is so soft you can cut it with a butter knife." }
- Claude: return pre-written explanation from reactions.json

Add OFFLINE_MODE badge in HUD when active: small red "OFFLINE" pill top-right.

Final pre-deploy tasks:
- Verify all console.error calls have user-visible fallback behaviour
- Verify no API keys appear anywhere in /client (grep -r "sk-" client/ and grep -r "AIza" client/)
- Verify the app loads within 4 seconds on a simulated slow 3G connection (Chrome DevTools throttle)
- Add a <meta> viewport tag and test on iPad screen size (768px wide)
- Ensure canvas resizes correctly when browser window is resized
```

**Verify Phase 1 is complete:**
- [ ] Walk-in scroll navigation works
- [ ] All 4 cabinets click to open with animation
- [ ] Items visible on cabinet shelves
- [ ] Item pick-up and drag-to-bench works
- [ ] Na + H2O reaction triggers explosion
- [ ] ElevenLabs narration plays (with Web Speech fallback)
- [ ] Gemini info panel appears on hover (with local fallback)
- [ ] FailurePanel shows explanation
- [ ] Everything works in OFFLINE_MODE=true
- [ ] Deployed to labzero.app

---

## Phase 1 Complete — What to Tell Claude Code for Phase 2

When Phase 1 is done, update CLAUDE.md — change the phase section to:

```markdown
## Current Phase

**PHASE 2 — ALL FEATURES, ONE ZONE**

Phase 1 is COMPLETE. The following already exist and work:
- Walk-in scroll navigation with GSAP camera dolly
- 4 wall cabinets with open/close animation (Cabinet.js)
- Item pick-up and drag-to-bench (ItemManager.js)
- Reaction engine with failure detection (ReactionEngine.js)
- Explosion particle system (Particles.js)
- ElevenLabs narration with Web Speech fallback (useNarration.js)
- Gemini info panel with local fallback (ItemInfoPanel.jsx)
- FailurePanel with explanation (FailurePanel.jsx)
- HUD with bench items and React button (HUD.jsx)

Phase 2 goals (build in this order):
1. Scale Shift: scroll INTO bench reaction → L1 macro → L4 molecular → L5 atomic
2. Real-World Zoom-Out after every reaction
3. Full 3-phase sense narration (before / during / after)
4. Lab Passport screen (zone stamps + badges)
5. Portfolio report card auto-generation + PNG export
6. All 10 reactions in reactions.json
```

---

*Good luck. Build Phase 1 first. Ship that. Then Phase 2.*
*The demo that wins is the one that works, not the one with the most features.*
