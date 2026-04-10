# DoomsDay

A 2D top-down survival game built with HTML5 Canvas + JavaScript.  
You can move around tiled maps, collide with walls, and transition through portals.  
The project is structured with a simple game engine loop (update/draw), a player entity, and a tilemap/map manager.

---

## How to Run

### Option 1: VS Code Live Server (Recommended)
1. Open the project folder in VS Code
2. Install the "Live Server" extension
3. Right-click `index.html` -> **Open with Live Server**

### Option 2: Local HTTP Server (Terminal)
From the project folder:
- Python:
  - `python3 -m http.server 8000`
  - Open `http://localhost:8000`

> Don't open the HTML by double-clicking it. Some browsers block loading local JSON/assets unless you use a server.

---

## Controls

- Move: **W A S D** or **Arrow Keys**
- Punch/Attack: **Space**
- Pause: **(your key/button here)**
- Restart: **(your button/menu here)**

---

## Project Structure (Core Files)

- `index.html`
  - Sets up the canvas and loads the scripts.

- `main.js`
  - Game entry point: loads the first map, preloads assets, creates the player + map manager, starts the engine.

- `gameengine.js`
  - Main loop (update -> camera -> draw), input tracking, entity list, camera follow/clamp.

- `player.js`
  - Player movement, animation state, collision checks, action input.

- `tilemap.js`
  - Tiled map parsing, collision grid, tile rendering, portals, dialog triggers, map transitions.

- `assetmanager.js`
  - Image preloader/cache.

- `animator.js`
  - Sprite-sheet animation helper.

- `util.js`, `timer.js`
  - Helpers + delta-time.

- `Zombie.js`
  - Zombie entity logic (spawn, draw, attack) - currently under development.

---

## Maps

Maps live in `maps/` and are Tiled `.tmj` files.
Example:
- `maps/bedroom.tmj` (starting map)

Map objects can include:
- Player spawn points (ex: `PlayerSpawn`)
- Portals (ex: object with `targetMap` / `targetSpawn`)
- Dialog triggers

---

## Current Known Issues (Work In Progress)

### 1) Health drains when standing still
- Health should only decrease when a zombie successfully attacks.
- If health drains without zombies present, damage logic is firing without a valid zombie hit check.

### 2) Zombie not visible / not spawning
Common causes:
- Script filename mismatch: `zombie.js` vs `Zombie.js` (case-sensitive environments)
- Zombie entity not added to the engine's entity list
- Zombie spawn coordinates off-screen
- Zombie draw method not being called or sprite not loaded

### 3) Pause only blurs the screen
- Pause should stop updates (player movement, zombies, collision checks).
- Right now it's visual-only (blur overlay) while update loop still runs.

---

## Debug Tips

If you add a debug flag (example: `game.debug = true`), useful debug displays:
- Current player health value on screen
- Zombie count
- Damage event logs: who hit, how much, cooldown
- Bounding boxes around player/zombie to verify collisions

---

## Credits
Built by Harsimar Kaur, MD Sumsuzzaman Khan, & Tahmid Rafi
