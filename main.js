// Entry point: loads assets, then starts the game.
const DEBUG_MODE = false;
const DEBUG_WEAPON = false;
const gameEngine = new GameEngine({ cameraDebug: true, debugging: DEBUG_MODE });
gameEngine.debug = DEBUG_MODE;
gameEngine.debugWeapon = DEBUG_WEAPON;
const ASSET_MANAGER = new AssetManager();

// Starting map + player config.
const MAP_PATH = "./maps/mainForest.tmj";
const BAT_SPRITE_PATH = "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Bat.png";
const KNIFE_SPRITE_PATH = "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Knife.png";
const KEY_SPRITE_PATH = "./Room/sewerkey.png";
const MEDKIT_SPRITE_PATH = "./sprites/character/medkit/medkit.png";
const TITLE_BG_PATH = "./sprites/ui/title-bg.png";
const SAVE_KEY = "doomsday_save";
const MAP_SCALE = 4;
const START_SPAWN = "PlayerSpawn";
const PLAYER_SPEED = 140; // pixels per second
const ZOMBIE_COUNT = 1;

let currentPlayer = null;
let currentMapManager = null;

function normalizeItemId(itemId) {
  if (itemId === "key") return "beth_house_key";
  return itemId;
}

function removeZombies() {
  gameEngine.entities = gameEngine.entities.filter(
   (e) =>
  !(
    e &&
    e.constructor &&
    (e.constructor.name === "Zombie" || e.constructor.name === "BethBoss")
  )
  );
}

function getAliveZombieCount() {
  return (gameEngine.entities || []).filter(
    (e) =>
      e &&
      e.constructor &&
      e.constructor.name === "Zombie" &&
      !e.removeFromWorld &&
      e.state !== "death"
  ).length;
}

function removePickups() {
  gameEngine.entities = gameEngine.entities.filter(
    (e) => !(e && e.constructor && e.constructor.name === "ItemPickup")
  );
}
function removeHealthPickups() {
  gameEngine.entities = gameEngine.entities.filter(
    (e) => !(e && e.constructor && e.constructor.name === "HealthPickup")
  );
}

function keepMapManagerLast() {
  const entities = gameEngine.entities || [];
  const idx = entities.findIndex((e) => e && e.constructor && e.constructor.name === "MapManager");
  if (idx < 0) return;
  const mapManager = entities.splice(idx, 1)[0];
  entities.push(mapManager);
}

function getMapObjectLayers(mapData) {
  return (mapData && mapData.layers || []).filter((layer) => layer.type === "objectgroup");
}

function resolvePickupType(obj) {
  const fromProp = getObjectProperty(obj, "itemId");
  const raw = String(fromProp || obj.name || obj.type || obj.class || "").toLowerCase();

  if (raw.includes("bat")) return "bat";
  if (raw.includes("knife")) return "knife";
  if (raw.includes("beth_house_key") || raw.includes("house_key") || raw === "key" || raw.includes("key")) return "beth_house_key";

  return null;
}

function getPickupSpritePath(itemId) {
  if (itemId === "bat") return BAT_SPRITE_PATH;
  if (itemId === "knife") return KNIFE_SPRITE_PATH;
  if (itemId === "beth_house_key") return KEY_SPRITE_PATH;
  if (itemId === "escape_key") return "./KeyFly/KeyFly1.png";
  
  return "";
}

function restoreCollectedItemsToPlayer(player) {
  if (!player || !gameEngine.collectedItems) return;

  for (const key of gameEngine.collectedItems) {
    const parts = String(key || "").split(":");
    const itemId = normalizeItemId(parts[parts.length - 1]);
    if (!itemId) continue;

    if (!player.inventory[itemId]) {
      player.addItem(itemId);
    }
  }

  // Keep bat equipped across restart if it was previously collected.
  if (player.hasItem && player.hasItem("bat")) {
    player.equippedWeapon = "bat";
  }
}

function spawnPickupsForMap(player, mapData, mapPath) {
  removePickups();
  removeHealthPickups();
  if (!mapData) return;

  const mapPathLower = String(mapPath || "").toLowerCase();
  const objectLayers = getMapObjectLayers(mapData);
  const pickupObjects = [];

  for (const layer of objectLayers) {
    const layerName = String(layer.name || "").toLowerCase();

    // Only read layers named like "items" or "pickup"
    if (!layerName.includes("item") && !layerName.includes("pickup")) continue;

    for (const obj of layer.objects || []) {
      const itemType = resolvePickupType(obj);
      if (!itemType) continue;
      pickupObjects.push({ obj, itemType });
    }
  }

  for (const { obj, itemType } of pickupObjects) {
    const rawX = (obj.x || 0) * MAP_SCALE;
    const rawY = (obj.y || 0) * MAP_SCALE;
    let width = Math.max(24, (obj.width || 8) * MAP_SCALE);
    let height = Math.max(24, (obj.height || 8) * MAP_SCALE);
    const isPoint = !!obj.point || (!obj.width && !obj.height);

    // Bedroom map currently has a Knife marker; treat it as Bat so weapon flow stays consistent.
    const mappedType =
      mapPathLower.includes("bedroom") && itemType === "knife"
        ? "bat"
        : itemType;
    const itemId = normalizeItemId(mappedType);
    if (itemId === "bat") {
      // Make bat on table clearly visible.
      width = Math.max(width, 33);
      height = Math.max(height, 33);
    }
    const x = isPoint ? rawX - width / 2 : rawX;
    const y = isPoint ? rawY - height / 2 : rawY;
    const spritePath = getPickupSpritePath(itemId);
    const collectedKey = `${mapPathLower}:${itemId}`;
    const isAnimatedKey = itemId === "beth_house_key";

    if (gameEngine.collectedItems.has(collectedKey)) continue;

    gameEngine.addEntity(new ItemPickup(gameEngine, player, {
  x,
  y,
  width,
  height,
  itemId,
  spritePath,
  collectedKey,
frameCount: isAnimatedKey ? 8 : 1,
frameDuration: isAnimatedKey ? 0.12 : 0.12,
frameWidth: isAnimatedKey ? 16 : width,
frameHeight: isAnimatedKey ? 16 : height
}));
  }

  // Bedroom safety fallback: always ensure a bat pickup exists unless already collected.
  // This keeps bat available even if the map currently only has non-bat pickups (like Knife).
  const hasBatPickupObject = pickupObjects.some((p) => {
    const mappedType =
      mapPathLower.includes("bedroom") && p.itemType === "knife"
        ? "bat"
        : p.itemType;
    return normalizeItemId(mappedType) === "bat";
  });
  if (mapPathLower.includes("bedroom") && !hasBatPickupObject) {
    const fallbackKey = `${mapPathLower}:bat`;

    if (!gameEngine.collectedItems.has(fallbackKey)) {
      gameEngine.addEntity(new ItemPickup(gameEngine, player, {
        x: 64,
        y: 320,
        width: 33,
        height: 33,
        itemId: "bat",
        spritePath: BAT_SPRITE_PATH,
        collectedKey: fallbackKey
      }));
    }
  }
  spawnHealthPickupsFromMap(gameEngine, player, mapData, MAP_SCALE);
  keepMapManagerLast();
}

function onStoryItemCollected(itemId) {
  const normalized = normalizeItemId(itemId);

  if (normalized === "beth_house_key") {
    gameEngine.hasSewerKey = true;
    gameEngine.showDialogue("Found Beth's house key.", 2200);
  }

  if (normalized === "escape_key") {
    gameEngine.hasEscapeKey = true;
    gameEngine.showDialogue("Found the escape key.", 2200);
  }
}

function isMapZombieEnabled(mapPath, mapData) {
  const mapProp = (mapData && mapData.properties || []).find((p) => p.name === "zombiesEnabled");
  if (mapProp) return !!mapProp.value;

  const path = (mapPath || "").toLowerCase();

  // Bedroom/inside map is always safe.
  if (path.includes("bedroom")) return false;
  if (path.includes("bethhouse")) return false;

  return true;
}

function isZombieSpawnValid(x, y, zombieWidth, zombieHeight, player) {
  if (x < 0 || y < 0) return false;
  if (x + zombieWidth > gameEngine.worldWidth || y + zombieHeight > gameEngine.worldHeight) return false;
  if (gameEngine.collisionGrid && gameEngine.collisionGrid.isBlockedRect(x, y, zombieWidth, zombieHeight)) return false;

  if (player) {
    const dx = x - player.x;
    const dy = y - player.y;
    if (Math.hypot(dx, dy) < 80) return false;
  }

  return true;
}

function spawnZombies(player, mapPath, mapData) {
  removeZombies();

  const enabled = isMapZombieEnabled(mapPath, mapData);
  gameEngine.zombiesEnabled = enabled;

  if (!enabled) {
    keepMapManagerLast();
    return;
  }

  // Spawn zombies from Tiled object markers (type/name includes "zombie")
  const spawned = spawnZombiesFromMap(gameEngine, mapData, MAP_SCALE, mapPath);

  if (DEBUG_MODE) {
    console.log("Zombies spawned from map:", spawned.length, "on map:", mapPath || "(unknown)");
  }

  keepMapManagerLast();
}

async function loadMapData(mapPath) {
  const mapResponse = await fetch(mapPath);
  if (!mapResponse.ok) {
    throw new Error(`Map fetch failed: ${mapResponse.status}`);
  }
  return mapResponse.json();
}

async function setupWorld(mapPath, spawnName) {
  let mapData = null;

  try {
    mapData = await loadMapData(mapPath);
  } catch (error) {
    console.error("Map failed to load, starting without map.", error);
  }

  gameEngine.entities = [];
  gameEngine.activeDialog = null;
  gameEngine.checkedWindow = false;
  gameEngine.foundBeth = false;
  gameEngine.hasCarKey = false;
  gameEngine.paused = false;
  gameEngine.gameOver = false;
  gameEngine.keys = {};
  gameEngine.pendingTeleport = null;
  gameEngine.zombiesEnabled = false;
  gameEngine.bossDefeated = false;
  gameEngine.zombieObjectiveTotal = 0;
  gameEngine.enemySpawnIds = new Set();
  gameEngine.defeatedEnemyIds = new Set();
  gameEngine.enemyObjectiveTotal = 0;
  gameEngine.enemyObjectiveDefeated = 0;
  gameEngine.visitedBethUpstairs = false;
  gameEngine.bethEscapeComplete = false;

  if (!gameEngine.collectedItems) {
    gameEngine.collectedItems = new Set();
  }

  if (mapData) {
    const tilePaths = collectTilesetImagePaths(mapData, mapPath);
    const result = await preloadImages(tilePaths);
    console.log("Tileset images loaded:", result.loaded, "failed:", result.failed);

    const spawn = getSpawnPosition(mapData, MAP_SCALE, spawnName);
    const player = new Player(gameEngine, spawn.x, spawn.y, PLAYER_SPEED);
    restoreCollectedItemsToPlayer(player);

    const mapManager = new MapManager(gameEngine, player, MAP_SCALE);

    gameEngine.onMapChanged = (newMapPath, newMapData) => {
      gameEngine.zombiesEnabled = isMapZombieEnabled(newMapPath, newMapData);
      spawnZombies(player, newMapPath, newMapData);
      spawnPickupsForMap(player, newMapData, newMapPath);
      if (gameEngine.bossDefeated && gameEngine.zombiesEnabled) {
        gameEngine.zombieObjectiveTotal = Math.max(
          gameEngine.zombieObjectiveTotal || 0,
          getAliveZombieCount()
        );
      }
    };
    gameEngine.onStoryItemCollected = onStoryItemCollected;

    mapManager.setMap(mapData, mapPath, spawnName);

    const notebook = new Notebook(gameEngine);
    const teleportPrompt = new TeleportPrompt(gameEngine);
    const hintArrow = new HintArrow(gameEngine);
    const inventory = new Inventory(gameEngine);

    gameEngine.notebook = notebook;
    gameEngine.teleportPrompt = teleportPrompt;
    gameEngine.hintArrow = hintArrow;
    gameEngine.inventory = inventory;

    gameEngine.entities.unshift(notebook);
    gameEngine.entities.unshift(teleportPrompt);
    gameEngine.entities.unshift(hintArrow);
    gameEngine.entities.unshift(inventory);

    gameEngine.cameraTarget = player;
    gameEngine.addEntity(player);

    // Map manager is added last because engine draws in reverse order.
    // This makes the map draw first (background), then zombies, then player.
    gameEngine.addEntity(mapManager);

    currentPlayer = player;
    currentMapManager = mapManager;
    gameEngine.currentMapPath = mapPath;

    spawnPickupsForMap(player, mapData, mapPath);
  } else {
    const player = new Player(gameEngine, 400, 300, PLAYER_SPEED);
    const teleportPrompt = new TeleportPrompt(gameEngine);

    restoreCollectedItemsToPlayer(player);

    gameEngine.teleportPrompt = teleportPrompt;
    gameEngine.entities.unshift(teleportPrompt);

    gameEngine.cameraTarget = player;
    gameEngine.addEntity(player);
    gameEngine.zombiesEnabled = false;

    currentPlayer = player;
    currentMapManager = mapManager;
  }
}
function saveGame() {
    console.log("SAVE BUTTON CLICKED");

    const player = gameEngine.cameraTarget;
    if (!player) {
        console.log("No player found");
        return;
    }

    const aliveZombies = (gameEngine.entities || [])
        .filter(e =>
            e &&
            e.constructor &&
            e.constructor.name === "Zombie" &&
            !e.removeFromWorld &&
            e.state !== "death"
        )
        .map(z => ({
            x: z.x,
            y: z.y,
            width: z.width,
            height: z.height,
            speed: z.speed,
            damage: z.damage,
            maxHealth: z.maxHealth,
            health: z.health,
            variant: z.variant,
            facing: z.lastDirection || "down"
        }));

    const remainingMedkits = (gameEngine.entities || [])
        .filter(e =>
            e &&
            e.constructor &&
            e.constructor.name === "HealthPickup" &&
            !e.removeFromWorld
        )
        .map(m => ({
            x: m.x,
            y: m.y,
            width: m.width,
            height: m.height,
            healAmount: m.healAmount,
            spritePath: m.spritePath
        }));

    const saveData = {
        map: gameEngine.currentMapPath || MAP_PATH,
        player: {
            x: player.x,
            y: player.y,
            health: player.health,
            maxHealth: player.maxHealth
        },
        zombies: aliveZombies,
        medkits: remainingMedkits
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    console.log("Game saved", saveData);
}

function loadSavedGame() {
    console.log("LOAD BUTTON CLICKED");

    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
        console.log("No save found");
        return;
    }

    const saveData = JSON.parse(raw);
    const player = gameEngine.cameraTarget;

    if (!player) {
        console.log("No player found");
        return;
    }

    // Restore player
    player.x = saveData.player.x;
    player.y = saveData.player.y;
    player.health = saveData.player.health;
    player.maxHealth = saveData.player.maxHealth;

    // Remove all current zombies
    gameEngine.entities = gameEngine.entities.filter(
        e => !(e && e.constructor && e.constructor.name === "Zombie")
    );

    // Remove all current medkits
    gameEngine.entities = gameEngine.entities.filter(
        e => !(e && e.constructor && e.constructor.name === "HealthPickup")
    );

    // Restore zombies from save
    if (Array.isArray(saveData.zombies)) {
        saveData.zombies.forEach(z => {
            const zombie = new Zombie(gameEngine, player, z.x, z.y, {
                width: z.width,
                height: z.height,
                speed: z.speed,
                damage: z.damage,
                maxHealth: z.maxHealth,
                variant: z.variant,
                facing: z.facing
            });

            zombie.health = z.health;
            gameEngine.addEntity(zombie);
        });
    }

    // Restore medkits from save
    if (Array.isArray(saveData.medkits)) {
        saveData.medkits.forEach(m => {
            const medkit = new HealthPickup(
                gameEngine,
                player,
                m.x,
                m.y,
                m.width,
                m.height,
                {
                    healAmount: m.healAmount,
                    spritePath: m.spritePath
                }
            );

            gameEngine.addEntity(medkit);
        });
    }

    // Keep map manager drawn correctly
    keepMapManagerLast();

    console.log("Game loaded", saveData);
}

// Loads the map JSON, preloads tiles, then starts the game loop.
async function loadGame() {
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_down_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_up_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side-left_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side_run-Sheet6.png");

  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_down_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_up_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side_punch-Sheet4.png");

  ASSET_MANAGER.queueDownload("./KeyFly/KeyFly1.png");
  ASSET_MANAGER.queueDownload("./KeyFly/KeyFly2.png");
  ASSET_MANAGER.queueDownload("./KeyFly/KeyFly3.png");
  ASSET_MANAGER.queueDownload("./KeyFly/KeyFly4.png");

  ASSET_MANAGER.queueDownload("./Room/ZombieWoman/Zombie - Idle.png");
  ASSET_MANAGER.queueDownload("./Room/ZombieWoman/Zombie - Walk.png");
  ASSET_MANAGER.queueDownload("./Room/ZombieWoman/Zombie - Run.png");
  ASSET_MANAGER.queueDownload("./Room/ZombieWoman/Zombie - Attack.png");
  ASSET_MANAGER.queueDownload("./Room/ZombieWoman/Zombie - Hit.png");
  ASSET_MANAGER.queueDownload("./Room/ZombieWoman/Zombie - Death.png");

  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_down_idle-and-run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_up_idle-and-run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side-left_idle-and-run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side_idle-and-run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_down_attack-Sheet4.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_up_attack-Sheet4.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side-left_attack-Sheet4.png");
  ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side_attack-Sheet4.png");

  ASSET_MANAGER.queueDownload(BAT_SPRITE_PATH);
  ASSET_MANAGER.queueDownload(KNIFE_SPRITE_PATH);
  ASSET_MANAGER.queueDownload(KEY_SPRITE_PATH);
  ASSET_MANAGER.queueDownload(MEDKIT_SPRITE_PATH);
  ASSET_MANAGER.queueDownload("./sprites/ui/title-bg.png");



  // Queue all zombie variants
  queueZombieSkins(ASSET_MANAGER);

  console.log("[ASSET QUEUE] zombie path:", Zombie.SPRITE_PATH);

  ASSET_MANAGER.downloadAll(async () => {
    console.log("Game starting");

    const canvas = document.getElementById("gameWorld");
    const ctx = canvas.getContext("2d");

    gameEngine.init(ctx);
    canvas.focus();

    async function hardRestartGame() {
      gameEngine.entities = [];
      gameEngine.activeDialog = null;
      gameEngine.checkedWindow = false;
      gameEngine.foundBeth = false;
      gameEngine.hasCarKey = false;
      gameEngine.hasTriedBethDoor = false;
      gameEngine.hasSewerKey = false;
      gameEngine.bethDoorUnlocked = false;
      gameEngine.bossDefeated = false;
      gameEngine.zombieObjectiveTotal = 0;
      gameEngine.enemySpawnIds = new Set();
      gameEngine.defeatedEnemyIds = new Set();
      gameEngine.enemyObjectiveTotal = 0;
      gameEngine.enemyObjectiveDefeated = 0;
      gameEngine.visitedBethUpstairs = false;
      gameEngine.bethEscapeComplete = false;
      gameEngine.collectedItems = new Set();
      gameEngine.pendingTeleport = null;
      gameEngine.gameOver = false;
      gameEngine.gameWon = false;
      gameEngine.paused = false;
      gameEngine.keys = {};

      if (typeof AudioEngine !== "undefined") {
        AudioEngine.init();
        AudioEngine.playMusic();
      }

      await setupWorld(MAP_PATH, START_SPAWN);
    }

    function showTitleScreen() {
      // reset engine state
      gameEngine.entities = [];
      gameEngine.gameOver = false;
      gameEngine.gameWon = false;
      gameEngine.paused = false;
      gameEngine.keys = {};
      gameEngine.cameraTarget = null;
      gameEngine.onMapChanged = null;
      gameEngine.hasTriedBethDoor = false;
      gameEngine.hasSewerKey = false;
      gameEngine.bethDoorUnlocked = false;
      gameEngine.bossDefeated = false;
      gameEngine.zombieObjectiveTotal = 0;
      gameEngine.enemySpawnIds = new Set();
      gameEngine.defeatedEnemyIds = new Set();
      gameEngine.enemyObjectiveTotal = 0;
      gameEngine.enemyObjectiveDefeated = 0;
      gameEngine.visitedBethUpstairs = false;
      gameEngine.bethEscapeComplete = false;
      gameEngine.collectedItems = new Set();

      // optional: stop music on main screen
      if (typeof AudioEngine !== "undefined") {
        AudioEngine.stopMusic();
      }

      const title = new TitleScreen(gameEngine, async () => {
        // audio must start after click
        AudioEngine.init();
        AudioEngine.playMusic();

        await setupWorld(MAP_PATH, START_SPAWN);
      });

      gameEngine.addEntity(title);
    }

    // first boot -> title screen
    showTitleScreen();

    // restart button -> back to title screen
    gameEngine.restart = async () => {
      await hardRestartGame();
    };

    gameEngine.start();
  });
}
const saveBtn = document.getElementById("saveBtn");
if (saveBtn) {
    saveBtn.addEventListener("click", saveGame);
}
const loadBtn = document.getElementById("loadBtn");
if (loadBtn) {
    loadBtn.addEventListener("click", loadSavedGame);
}

loadGame().catch((error) => {
  console.error("Failed to load game assets", error);
});