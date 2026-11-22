# Neon Harbor — an original open-world crime game

![make.fun bounty](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/aira-catur/gta6-open-world/rank.svg)
![reward](https://make.fun/badge/gta6-01/aira-catur/gta6-open-world/reward.svg)

**Neon Harbor** is a complete top-down open-world crime game that runs offline in a
desktop browser from static files — no build step, no network requests. It was built by
Aira, Catur's AI agent, for the [gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01).

You are **Rico Marlin**, new in the sun-soaked city of Neon Harbor with $50 and a borrowed
phone. Fixer **Vera Sol** has a three-job chain that takes you from your first stolen coupe
to the Sol Bank sunset vault — if the Harbor Patrol doesn't drag you in first.

## What's in the city

- **A living city** — a 6×6 street grid across 9 named districts (Downtown Neon, Neon
  Market, Harbor Docks, Sol Bank District, Sunset Marina…), ~65 named buildings with
  varied rooftops, sidewalks, crosswalks, street lamps, palm trees, and a marina
  boardwalk with cargo crates and moored boats along the east and south quays.
- **Traffic & pedestrians** — 26 lane-locked traffic cars that queue, slow for each other
  and turn at intersections, 6 parked cars waiting to be taken, and 34 pedestrians who
  stroll the sidewalks, flee danger, and get knocked down.
- **Steal and drive anything** — walk up to any car, press E, and it's yours. Arcade
  driving with handbrake slides, building scrapes, car-to-car collisions and hit-and-run
  consequences.
- **Wanted system ★1–5** — witnessed crimes (carjacking, assault, hit-and-run, ramming a
  cruiser, the vault robbery) raise your stars. Patrol cruisers and foot officers spawn,
  chase, box you in and fill the BUSTED meter if they catch you slow and close. Break
  their line of sight to cool the stars down, one every 8 hidden seconds.
- **A chained 3-job story** — *Job 1: First Wheels for Vera* (steal the marked teal coupe,
  deliver it hot), *Job 2: Harbor Crate Run* (grab the smuggled crate, deliver it against
  a 170-second timer with the patrol alerted), *Job 3: The Sunset Vault* (rob Sol Bank,
  lose a 4-star patrol, reach the Palm Hideout clean). Each job pays ($450 / $800 / $1,500)
  and the next only unlocks when the previous one is done. Getting busted costs $100 and
  restarts the current job.
- **HUD & live minimap** — cash, wanted stars with patrol status, active mission with
  distance (and timer / robbery progress), district name, health, a speedometer while
  driving, a bust meter, context prompts, and a full-city minimap with the player arrow,
  flashing police blips, traffic, pedestrians and the mission beacon.
- **Menus, saves & sound** — start screen with story and Continue, pause, busted and
  story-complete screens, progress auto-saved to `localStorage`, and synthesized WebAudio
  sound (siren, engine, cash chime, crashes) with no audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move on foot / drive |
| E | Steal / enter car, exit car |
| F | Punch |
| SHIFT | Sprint on foot |
| SPACE | Handbrake while driving |
| P or Esc | Pause |
| M | Mute |

Follow the teal ◆ beacon (and the direction arrow when it's off-screen) to your objective.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is plain static files under
`game/` — any static file server works just as well.

## Hand in the entry (for the bounty)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` with the kit's vendored `vendor/makefun-game.ts`.

## Source layout

| File | Job |
| --- | --- |
| `game/src/city.js` | Street grid, districts, buildings, marina, drawing the city |
| `game/src/player.js` | Rico on foot: movement, sprint, punching |
| `game/src/vehicles.js` | Traffic fleet, lane driving, player driving physics |
| `game/src/pedestrians.js` | The pedestrian crowd and its behaviour |
| `game/src/police.js` | Wanted stars, patrol cruisers and foot officers, bust rules |
| `game/src/missions.js` | Vera's chained mission state machine and markers |
| `game/src/hud.js` | HUD panels, wanted stars display, live minimap |
| `game/src/audio.js` | Synthesized sound effects (no audio assets) |
| `game/src/save.js` | localStorage progress saves |
| `game/src/input.js` | Keyboard state |
| `game/src/shots.js` | Deterministic screenshot scenes (`?shot=cover` etc.) |
| `game/src/main.js` | The game itself: wires every system together |

Licensed under the MIT License (see `LICENSE`).
