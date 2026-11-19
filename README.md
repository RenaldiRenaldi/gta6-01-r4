# Solmara: The Burning Mile

An original offline 3D crime story on the Leonora coast. Twelve linked jobs follow Dani Cruz and the Pearl crew as they expose a port auction and recover the neighborhood's reserve. The final escape crosses a burning street confrontation under a police helicopter searchlight.

Run `node serve.ts`, then open `http://localhost:8080`. Press Enter to play. No install, build step, CDN, fonts, or external asset requests are needed.

## Play

- WASD / arrows: walk, drive, steer or fly. Shift: sprint or NOS. Space: handbrake, or helicopter lift. H: lift. Ctrl: descend.
- E: enter/exit a nearby vehicle, save and recover at Pearl House, or open Customs / Estrella. Land gently before exiting the Kite.
- J: briefing, accept, retry. Click or K: fire. 1/2/3: pistol, shotgun, rifle. Q: cover near a vehicle. F: hold to hack. P: photograph during the tail.
- M: map scale. C: start/cancel a trial at amber race markers. B: $450 bribe when unseen. R: radio. T: cycle the four seasons. Escape: pause.

## City and progression

The island includes Pearl Mile, Old Coral, Alta Vista, the Glass Quarter, Sunbreak Coast, Air Solmara and Lantern Marina. Cars can be stolen, police use line of sight and street routes, higher heat adds roadblocks and an air unit. Break sight to cool down; repaint only when unseen. Cash buys weapons, armor/repairs, an engine upgrade and long-burn nitro. Fifteen ledgers, three timed races and three physical stunt ramps supplement the story. Saves persist locally; story jobs have explicit timers, success conditions and retry states.

## Art and capture

Procedural original geometry, locally painted window/sign atlases, synthesized original music, seasonal particles, soft shadows, dusk haze, quarter-resolution HDR bloom, wet street streaks and a sweeping searchlight. Crowds shop, chat, sit, work, cross and flee. A persistent burning wreck, embers, moving flames, smoke volumes, flickering lights and a police/citizen line make the final mission visible.

`shots.json` sets the four deterministic situations. Summer is first by filename; screenshots are direct game renders. Shot mode fixes starting positions, inventories and camera, then animates the actual environment, actors, fire and HUD. Ordinary play has no camera script. The screenshot inventory is Summer chase, Spring cover battle, Autumn flight, Winter lockdown, in that exact order.

## Handoff

`MAKEFUN_OUTPUT_DIR=out node main.ts` uses the kit's unmodified dossier builder. Three.js is the vendored minified renderer (MIT); all game code and artwork are original. This R4 build retains R3's original city and crew concepts while rewriting the implementation in this recorded session. Do not seal or submit from this build: the parent handles that step.
