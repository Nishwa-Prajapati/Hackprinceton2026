# LabZero — AI Chemistry Lab
## Claude Code Project Context

> Read this file before every single task. This is the single source of truth for the project.

---

## What This Project Is

LabZero is a **first-person walk-in 3D virtual chemistry lab** that runs in the browser.
Students scroll/use trackpad to physically navigate through a sci-fi styled lab environment.
They approach cabinets, open them, drag chemicals and tools onto bench areas, run experiments,
see animated reactions (correct AND wrong ones), hear a human AI voice narrate the experience,
and build a shareable portfolio of everything they learned.

**The core philosophy:** Failure is the curriculum. Students learn more from breaking things than from always succeeding.

---

## Visual Style (Critical — Never Deviate)

Reference: sci-fi modern chemistry lab aesthetic.
- **Color palette:** Dark grey (#1a1a2e) base, orange accents (#FF8C00), cyan glows (#00D4FF), white bench surfaces (#E8E8E8)
- **Lighting:** Overhead fluorescent panel lights, cyan hexagonal ceiling accent lights, warm orange trim lighting on bench edges
- **Benches:** Grey/white surface tops with orange trim edges, blue diagonal hazard stripes on bases
- **Cabinets:** Wall-mounted, dark grey with glowing blue/cyan LED edge strips and small digital display screens
- **Floor:** Light grey/white with subtle reflections
- **Overall feel:** Clean, futuristic, slightly intimidating but exciting — like a real research facility

---

## Current Phase

**PHASE 1 — THE PLAYABLE SKELETON**

Goal for this phase:
1. Student opens browser → sees the lab entrance
2. Scroll/trackpad → camera walks forward through the lab
3. 3-4 wall cabinets visible along the lab
4. Click a cabinet → it opens (drawer slides out OR doors swing open)
5. Inside cabinet: 3-4 chemical bottles and tools visible in 3D
6. Student drags an item out → it follows mouse to bench area
7. Press "Done" or click bench → exits cabinet view, back to roaming
8. Student can pick up items from different cabinets and combine them on bench
9. Press "React" button → reaction animation plays
10. ONE reaction working end-to-end: Na + H2O → explosion failure animation
11. ElevenLabs voice narrates: "A sharp hiss fills the air..."

**Do NOT build Phase 2 features yet:**
- Scale Shift (macro to nano zoom)
- Real-World Zoom-Out
- Mistake Engine sub-modes (Sabotage, Fix the Lab)
- Lab Passport / Portfolio
- Danger Simulator hero animations
- Multiple zones with different themes

---

## Tech Stack (Locked — Do Not Change)

| Layer | Technology | Notes |
|-------|-----------|-------|
| 3D Engine | Three.js r165+ | All lab rendering, camera, raycasting |
| Camera Movement | Three.js + GSAP 3 | Smooth scroll-based dolly, cabinet zoom-in |
| Frontend | React 18 + Vite 5 | UI overlays, panels, HUD elements |
| Styling | Tailwind CSS v3 | UI only — never applied to Three.js canvas |
| 3D Animations | GSAP 3 (gsap/three) | Cabinet open/close, item float, reaction effects |
| Narration Audio | ElevenLabs API | Human-quality voice, single consistent mentor character |
| Chemical Info | Google Gemini API | Info panel when item is picked up |
| Explanations | Anthropic Claude API | Failure explanations + portfolio summaries |
| API Protection | Node.js + Express | Proxy server — ALL API keys live server-side only |
| Data | reactions.json | Single source of truth for all reactions |
| Persistence | Browser localStorage | Portfolio and progress data |
| Deployment | DigitalOcean App Platform | Domain: labzero.app via GoDaddy |

---

## File Structure (Exact — Follow This Always)

```
labzero/
├── CLAUDE.md                    ← this file
├── package.json                 ← root (workspaces: client + server)
├── .env.example                 ← template, never commit real .env
│
├── client/                      ← React + Vite frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.jsx             ← React entry point
│   │   ├── App.jsx              ← root component, mounts canvas + UI
│   │   │
│   │   ├── lab/                 ← ALL Three.js logic lives here
│   │   │   ├── LabEngine.js     ← Three.js scene init, renderer, camera, loop
│   │   │   ├── LabControls.js   ← scroll navigation, camera dolly positions
│   │   │   ├── Cabinet.js       ← cabinet open/close, item placement
│   │   │   ├── ItemManager.js   ← drag-and-drop of 3D items to bench
│   │   │   ├── ReactionEngine.js ← reaction trigger, animation, failure logic
│   │   │   ├── Particles.js     ← explosion, smoke, bubble particle systems
│   │   │   └── zones/
│   │   │       ├── ZoneA.js     ← Acid-Base bench (Phase 2)
│   │   │       ├── ZoneB.js     ← Combustion bench (Phase 1 focus)
│   │   │       ├── ZoneC.js     ← Synthesis bench (Phase 2)
│   │   │       └── ZoneD.js     ← Electrochemistry bench (Phase 2)
│   │   │
│   │   ├── components/          ← React UI components (overlays on canvas)
│   │   │   ├── HUD.jsx          ← top-left: current zone, hint text
│   │   │   ├── ItemInfoPanel.jsx ← Gemini-powered info card on item pick-up
│   │   │   ├── ReactionPanel.jsx ← React button + equation display
│   │   │   ├── NarrationBar.jsx ← bottom subtitle strip for ElevenLabs text
│   │   │   ├── FailurePanel.jsx  ← explanation after a failed reaction
│   │   │   └── CabinetOverlay.jsx ← UI when inside cabinet view
│   │   │
│   │   ├── hooks/
│   │   │   ├── useLabEngine.js  ← initialises LabEngine, exposes ref
│   │   │   ├── useNarration.js  ← ElevenLabs API calls + audio playback
│   │   │   └── useGemini.js     ← Gemini API calls for item info
│   │   │
│   │   ├── data/
│   │   │   └── reactions.json   ← all reactions, failure modes, sensory data
│   │   │
│   │   └── api/
│   │       └── client.js        ← axios instance pointing to /api proxy
│   │
└── server/                      ← Node.js Express API proxy
    ├── index.js                 ← server entry, mounts all routes
    ├── routes/
    │   ├── elevenlabs.js        ← POST /api/narrate
    │   ├── gemini.js            ← POST /api/iteminfo
    │   └── claude.js            ← POST /api/explain and /api/portfolio
    └── .env                     ← ELEVENLABS_KEY, GEMINI_KEY, ANTHROPIC_KEY
```

---

## reactions.json Schema (Never Change This Shape)

Every reaction must follow this exact schema:

```json
{
  "id": "na-water-01",
  "zone": "B",
  "name": "Sodium + Water",
  "equation": "2Na + 2H₂O → 2NaOH + H₂↑",
  "correctReagents": ["sodium", "water"],
  "conditions": { "temp": 25, "pressure": 1.0 },
  "dangerLevel": "high",
  "cabinet": "cabinet-B1",
  "correctAnimation": "gentle_fizz",
  "failureModes": [
    {
      "type": "wrong_order",
      "trigger": "sodium_dropped_fast",
      "animation": "explosion_red",
      "elevenLabsText": "A violent crack echoes through the lab. The flask shatters. Acrid smoke fills the air around you. You can feel the heat on your face.",
      "explanation": "You dropped sodium into water too quickly. The reaction rate exceeded the heat dissipation rate, causing a runaway exothermic event.",
      "claudePrompt": "Student caused a sodium-water explosion by dropping sodium too quickly. Explain what went wrong at the molecular level in 3 sentences for a 14-year-old."
    }
  ],
  "realWorldContexts": ["car_battery", "soap_manufacturing"],
  "sensoryData": {
    "approach": "The sodium cabinet has a bright hazard sticker. You can almost smell the mineral oil it's stored in.",
    "before": "The sodium sits in mineral oil, silvery and soft. The water flask is clear and still.",
    "during": "A sharp hiss. Bubbles erupt violently. The flask warms instantly in your hands.",
    "after": "The solution is now basic. A faint alkaline smell. The flask is warm to the touch.",
    "failure": "A violent crack echoes through the lab. The flask shatters. Acrid smoke fills the air."
  }
}
```

---

## Three.js Camera Architecture (Critical)

The lab uses a **fixed waypoint dolly system** — NOT free-roam mouse look.

```
WAYPOINTS (camera positions):
  ENTRANCE     → position: (0, 1.7, 12)   lookAt: (0, 1.7, 0)
  CENTER       → position: (0, 1.7, 4)    lookAt: (0, 1.7, -4)
  CABINET_A    → position: (-6, 1.7, 0)   lookAt: (-8, 1.5, 0)
  CABINET_B    → position: (-2, 1.7, -2)  lookAt: (-4, 1.5, -2)
  CABINET_C    → position: (2, 1.7, -2)   lookAt: (4, 1.5, -2)
  BENCH_FOCUS  → position: (0, 1.4, -1)   lookAt: (0, 0.9, -3)

NAVIGATION RULES:
  - Scroll DOWN → move camera toward CENTER, then toward benches
  - Scroll UP → move camera back toward ENTRANCE
  - Click cabinet → GSAP tween camera to CABINET_X waypoint in 0.8s
  - Click "Back" / press Escape → GSAP tween back to previous waypoint
  - NO mouse-drag rotation — camera always faces forward or toward clicked object
```

---

## Cabinet System Architecture

```
Each cabinet has:
  - State: CLOSED | OPENING | OPEN | CLOSING
  - 3D mesh: dark grey box with orange trim, glowing blue LED strip
  - On click when CLOSED: play open animation (doors swing out 120° in 0.5s)
  - Camera GSAP tweens to CABINET_X waypoint when opening
  - Items inside rendered as small 3D objects on cabinet shelves
  - Each item is raycaster-clickable
  - On item click: item floats up, follows cursor toward bench area
  - "Done" button appears in UI → camera returns to CENTER waypoint, cabinet closes

Cabinet contents (Phase 1):
  Cabinet A (left wall):  sodium, water flask, HCl bottle, NaOH bottle
  Cabinet B (back left):  ethanol, copper sulphate, zinc plate, beaker
  Cabinet C (back right): Bunsen burner, tongs, test tubes, indicator paper
  Cabinet D (right wall): conical flask, pipette, pH meter, safety goggles
```

---

## State Management Rules

Use React Context for global lab state. Shape:

```javascript
{
  cameraWaypoint: "ENTRANCE",        // current camera position name
  activeCabinet: null,               // cabinet ID currently open, or null
  heldItems: [],                     // items student has picked up
  benchItems: [],                    // items placed on bench for reaction
  isReacting: false,                 // true while animation plays
  lastReactionResult: null,          // "success" | "failure" | null
  narrationText: "",                 // current subtitle text
  phase: 1                           // build phase (1, 2, or 3)
}
```

---

## API Proxy Routes

```
POST /api/narrate
  Body: { text: string, voiceId: string }
  Returns: audio buffer (mp3)
  Fallback: client plays pre-written text via Web Speech Synthesis

POST /api/iteminfo
  Body: { itemName: string, formula: string }
  Returns: { name, formula, hazardLevel, realWorldUses, commonReactions }
  Fallback: return local description from reactions.json

POST /api/explain
  Body: { reactionId: string, failureType: string, studentAge: number }
  Returns: { explanation: string (3 sentences max) }
  Fallback: use pre-written explanation from reactions.json failureModes

POST /api/portfolio
  Body: { experiments: [], mistakes: [], badges: [] }
  Returns: { summary: string (2 sentences) }
  Fallback: generic "You completed X experiments" template
```

---

## Absolute Rules (Never Break These)

1. **Never expose API keys client-side.** All ElevenLabs, Gemini, and Claude calls go through `/server`. If a key would appear in `/client`, it's wrong.
2. **Never block item pick-up.** Students must always be able to pick up any item regardless of whether it's "correct". This is the core philosophy.
3. **Every API call has a local fallback.** If ElevenLabs fails → Web Speech Synthesis. If Gemini fails → local JSON description. If Claude fails → pre-written explanation. The lab NEVER crashes due to API failure.
4. **reactions.json is the single source of truth.** Never hardcode reaction logic inside components. Always read from the JSON.
5. **Three.js and React are separate concerns.** Three.js renders to a canvas. React renders UI overlays on top. They communicate through the LabEngine event emitter and React Context only — never direct DOM manipulation.
6. **GSAP handles all 3D transitions.** Never use requestAnimationFrame manually for camera moves or object animations. Use GSAP for anything with a duration.
7. **One component = one responsibility.** Cabinet.js manages cabinet state. ItemManager.js manages dragging. ReactionEngine.js manages reactions. Never mix concerns.
8. **Test offline before every phase ends.** At least 3 reactions must work with zero API calls (all fallbacks active).

---

## Phase Completion Checklist

### Phase 1 Done When:
- [ ] Lab loads in browser, 3D scene visible
- [ ] Scroll moves camera from entrance toward benches
- [ ] At least 3 cabinets visible and clickable
- [ ] Cabinet opens with animation, camera zooms in
- [ ] Items visible inside cabinet on shelves
- [ ] At least 2 items draggable to bench
- [ ] Combining sodium + water triggers reaction animation
- [ ] Failure animation plays (explosion particle effect)
- [ ] ElevenLabs narration plays on failure (with Web Speech fallback)
- [ ] Gemini info panel appears on item click (with local fallback)
- [ ] "Back" button returns camera to lab roaming
- [ ] Deployed and accessible at labzero.app

### Phase 2 Done When:
- [ ] All 4 cabinets populated with correct items
- [ ] All 10 reactions in reactions.json with failure modes
- [ ] Scale Shift: scroll into reaction → L1 → L4 molecular → L5 atomic
- [ ] Real-World Zoom-Out transition works for 5 reactions
- [ ] Full 3-phase sense narration (before / during / after)
- [ ] Lab Passport screen with zone stamps and badges
- [ ] Portfolio report card auto-generates after each experiment
- [ ] PNG export from portfolio works on Chrome and Firefox

### Phase 3 Done When:
- [ ] Danger Simulator: Na+H2O and thermite hero animations
- [ ] Sabotage Challenge mode working
- [ ] Slow-Motion Molecular Replay after failures
- [ ] Shareable portfolio card URLs working
- [ ] Full accessibility mode (keyboard navigation)
- [ ] All features work offline with fallbacks
- [ ] Backup demo video recorded (2 minutes)
- [ ] Devpost submission complete
- [ ] Telora startup pitch rehearsed

---

## The 90-Second Judge Demo Flow

When demoing to judges, follow this exact sequence:
1. Open labzero.app → lab entrance loads (5s)
2. Scroll forward → camera walks into lab (8s)
3. Click Cabinet A → it opens, zoom in (5s)
4. Click sodium bottle → it floats up, Gemini panel appears (8s)
5. Drag sodium to bench, also grab water flask (10s)
6. Press "React" → explosion animation + ElevenLabs narration (10s)
7. Explanation panel: "Here's what went wrong at the molecular level" (8s)
8. Run correct reaction → zoom out to real-world car battery scene (10s)
9. Scroll into beaker → molecular view → atomic orbitals (10s)
10. Show portfolio card auto-generated, PNG export (8s)
11. "This runs at labzero.app. 300M students have no lab access. This is theirs." (8s)

---

## Prizes Being Targeted

| Prize | How We Win It |
|-------|--------------|
| Best Education Hack (Meta Glasses) | Primary track — every feature is educational |
| ElevenLabs Best Use | Sense Narration Layer — human voice throughout entire lab |
| Google Gemini Best Use | Item info panels + real-world context explanations |
| GoDaddy Best Domain | labzero.app — registered, deployed, live at demo |
| Telora Startup Track ($40K) | 2-min pitch: 300M students, $8/student/month SaaS |

---

*LabZero — The lab that every school wishes it had.*
*HackPrinceton 2026 | Education Track | SRS v4.0*
