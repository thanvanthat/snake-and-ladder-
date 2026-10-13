# Snakes & Ladders 3D

**Play it live:** https://snakes-and-ladders-3d-psi.vercel.app

A complete 3D Snakes & Ladders tabletop game for the browser. It has animated human characters, snakes that bite, ladders you can climb, and a real 3D die. It runs fully offline: there is no backend, every asset is generated procedurally, and nothing is downloaded from remote URLs at runtime.

## Tech stack

React 18 · TypeScript (strict) · Vite 5 · Three.js · React Three Fiber · Drei · Tailwind CSS · Framer Motion · Lucide React · Vitest + React Testing Library · ESLint

## Features

- **3D board**: 100 bevelled cells (a single instanced draw call), serpentine numbering, wooden frame, start pad, finish flag, a decorated environment, and soft shadows.
- **Human characters**: stylised humanoids with a head, face, hair, torso, arms, hands, legs and shoes. They use a joint hierarchy animated procedurally: idle breathing, walking, turning, climbing, recoiling when bitten, sliding and celebrating. There are six distinct looks, and each one matches its player card.
- **Snakes**: tapered tube bodies on Catmull-Rom curves with procedural skin textures, a flexible neck, a hinged jaw, fangs, slit-pupil eyes and a forked tongue. They have an idle animation.
- **The bite**: notice → turn → rear back with the jaw open → strike at the character's actual position → impact (camera shake, sparks, sound, recoil) → retract → slide down the snake's real body curve → land on the tail square.
- **Ladders**: rails, rungs and support posts. The character turns, steps on and climbs rung by rung along the rails, then hops onto the top square.
- **3D die**: rounded, with correct pips. It tumbles and always settles on the value the rules engine generated (crypto RNG with rejection sampling).
- **Modes**: 2–4 local players, or 1 player against the computer. The computer uses the same die and the same rules.
- **Optional house rules** (chosen in setup, on by default): *roll a 1 to start* and *a 6 rolls again*. Turn both off for the strict traditional rules.
- **UI**: home screen with a live 3D preview, setup with validation, player cards, move history, toast notifications, pause, restart, camera reset, settings and a victory screen with confetti.
- **Sound**: procedural Web Audio effects (no files), with mute and volume controls.
- **Persistence**: settings, setup and game progress are saved to localStorage and validated on load. A game interrupted mid-animation resumes at the end of that turn.
- **Accessibility**: keyboard shortcuts (Space to roll, P to pause, C to reset the camera), visible focus rings, ARIA labels, reduced-motion support, a WebGL fallback and a loading screen.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run unit and component tests (Vitest) |
| `npm run typecheck` | Run the strict TypeScript check |
| `npm run lint` | Run ESLint |
| `npm run build` | Typecheck and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Run all of the above in sequence |

> On Windows, if `npm install` fails with `'node' is not recognized` during esbuild's install script, run it from PowerShell or cmd (not Git Bash) so `node` is on the PATH.

## Deploying to Vercel

The repo includes `vercel.json` (framework `vite`, build `npm run build`, output `dist`, SPA rewrite).

**Auto-deploy (set up for this repo):** the Vercel project is connected to this GitHub repository. Every push to `main` deploys to production at https://snakes-and-ladders-3d-psi.vercel.app, and pushes to other branches or pull requests get their own preview URL.

**Dashboard (for a fresh fork):** push the project to GitHub → Vercel → *Add New Project* → import the repo → keep the detected settings → *Deploy*.

**CLI:**

```bash
npm i -g vercel
vercel
vercel --prod
```

No environment variables or backend are needed.

## Architecture

```
src/
  app/App.tsx                 screen routing (home / setup / game)
  game/                       pure rules: no React, no rendering
    gameTypes.ts              types: players, plans, state, rules, stages
    boardConfig.ts            snake/ladder layout + validation
    boardCoordinates.ts       THE square -> 3D world mapping (used everywhere)
    gameEngine.ts             turn state machine (pure functions)
    dice.ts                   fair die + face/rotation tables
    aiPlayer.ts               when the computer rolls
    setup.ts / storage.ts     setup validation, localStorage with validation
  animation/
    animationController.ts    delta-time task sequences: walk, bite, slide, climb
    characterAnimations.ts    procedural pose library for the humanoid rig
    paths.ts                  snake curves / ladder lines shared by render + animation
    easing.ts
  components/                 R3F scene (board, characters, snakes, ladders, dice, effects, camera) + UI
  hooks/useGame.ts            app store (useSyncExternalStore) + actions
  audio/soundEngine.ts        procedural Web Audio
```

**Turn flow.** The engine decides each roll's full outcome up front (a `TurnPlan`), and each stage advances only on an explicit signal:

```
READY ─roll→ ROLLING_DICE ─diceSettled→ MOVING_CHARACTER ─movementFinished→
   (SNAKE_BITE | CLIMBING_LADDER ─transitionFinished→) READY | GAME_OVER
```

Each signal carries the `rollId` (and the store checks a per-game key), so duplicate, stale or out-of-order callbacks are ignored. Turns cannot overlap, and restarting cannot be corrupted by a running animation. The animation controller reports finer-grained stages (`SNAKE_TURNING`, `SNAKE_PREPARING_BITE`, `SNAKE_STRIKING`, `CHARACTER_REACTING`, `SLIDING_DOWN_SNAKE`, `RESTORING_CHARACTER`, …) for the UI. Per-frame animation mutates Three.js objects directly inside `useFrame`; React state only changes when a stage changes.

## Rules

- 10×10 board, squares 1–100. Everyone starts off the board (position 0).
- Roll one six-sided die and move that many squares.
- Only the landing square counts. Finishing on a snake's head sends you to its tail; finishing on a ladder's foot takes you to its top. Passing over either does nothing.
- You must reach 100 exactly. If the roll overshoots, you stay where you are.
- The first player to reach 100 wins.
- House rules (optional, set per game): a player needs a **1** to enter the board, and rolling a **6** gives another roll (but not after winning).

## Known limitations

- Characters and snakes are procedural low-poly models with procedural animation, not rigged artist-made assets.
- No ambient-occlusion post-processing, to keep the bundle small and the frame rate high on mobile.
- Local multiplayer only (one device); there is no online play.
- The three.js chunk is about 680 kB minified (about 176 kB gzipped). It is split from the app code and the 3D scene is lazy-loaded.
