// Entry point: loads assets, then starts the game.
const DEBUG_MODE = true;
const DEBUG_WEAPON = false;
const gameEngine = new GameEngine({ cameraDebug: true, debugging: DEBUG_MODE });
gameEngine.debug = DEBUG_MODE;
gameEngine.debugWeapon = DEBUG_WEAPON;
const ASSET_MANAGER = new AssetManager();

// Starting map + player config.
const MAP_PATH = "./maps/bedroom.tmj";
const BAT_SPRITE_PATH = "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Bat.png";
const KNIFE_SPRITE_PATH = "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Knife.png";
const MAP_SCALE = 4;
const START_SPAWN = "PlayerSpawn";
const PLAYER_SPEED = 140; // pixels per second
const ZOMBIE_COUNT = 1;

let currentPlayer = null;
let currentMapManager = null;

function removeZombies() {
  gameEngine.entities = gameEngine.entities.filter(
    (e) => !(e && e.constructor && e.constructor.name === "Zombie")
  );
}

function removePickups() {
  gameEngine.entities = gameEngine.entities.filter(
    (e) => !(e && e.constructor && e.constructor.name === "ItemPickup")
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
  return null;
}

function getPickupSpritePath(itemId) {
  if (itemId === "bat") return BAT_SPRITE_PATH;
  if (itemId === "knife") return KNIFE_SPRITE_PATH;
  return "";
}

function restoreCollectedItemsToPlayer(player) {
  if (!player || !gameEngine.collectedItems) return;
  for (const key of gameEngine.collectedItems) {
    const parts = String(key || "").split(":");
    const itemId = parts[parts.length - 1];
    if (!itemId) continue;
    if (!player.inventory[itemId]) player.addItem(itemId);
  }
  // Keep bat equipped across restart if it was previously collected.
  if (player.hasItem && player.hasItem("bat")) {
    player.equippedWeapon = "bat";
  }
}

function spawnPickupsForMap(player, mapData, mapPath) {
  removePickups();
  if (!mapData) return;

  const mapPathLower = String(mapPath || "").toLowerCase();
  const objectLayers = getMapObjectLayers(mapData);
  const pickupObjects = [];
  for (const layer of objectLayers) {
    const layerName = String(layer.name || "").toLowerCase();
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
    const width = Math.max(24, (obj.width || 8) * MAP_SCALE);
    const height = Math.max(24, (obj.height || 8) * MAP_SCALE);
    const isPoint = !!obj.point || (!obj.width && !obj.height);
    const x = isPoint ? rawX - width / 2 : rawX;
    const y = isPoint ? rawY - height / 2 : rawY;
     const pickedAsBat = itemType === "knife";
    const itemId = pickedAsBat ? "bat" : itemType;
   //const itemId = itemType;
    const spritePath = getPickupSpritePath(itemId);
    const collectedKey = `${mapPathLower}:${itemId}`;
    if (gameEngine.collectedItems.has(collectedKey)) continue;

    gameEngine.addEntity(new ItemPickup(gameEngine, player, {
      x,
      y,
      width,
      height,
      itemId,
      spritePath,
      collectedKey
    }));
  }

  // Fallback spawn for bedroom if no pickups detected.
  if (pickupObjects.length === 0 && mapPathLower.includes("bedroom")) {
    const fallbackKey = `${mapPathLower}:bat`;
    if (!gameEngine.collectedItems.has(fallbackKey)) {
      gameEngine.addEntity(new ItemPickup(gameEngine, player, {
        x: 64,
        y: 320,
        width: 30,
        height: 30,
        itemId: "bat",
        spritePath: BAT_SPRITE_PATH,
        collectedKey: fallbackKey
      }));
    }
  }

  keepMapManagerLast();
}

function isMapZombieEnabled(mapPath, mapData) {
  const mapProp = (mapData && mapData.properties || []).find((p) => p.name === "zombiesEnabled");
  if (mapProp) return !!mapProp.value;
  const path = (mapPath || "").toLowerCase();
  // Bedroom/inside map is always safe.
  if (path.includes("bedroom")) return false;
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
  const spawned = spawnZombiesFromMap(gameEngine, mapData, MAP_SCALE);

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
  if (!gameEngine.collectedItems) gameEngine.collectedItems = new Set();

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
    };

    mapManager.setMap(mapData, mapPath, spawnName);
    const notebook = new Notebook(gameEngine);
    const teleportPrompt = new TeleportPrompt(gameEngine);
    const hintArrow = new HintArrow(gameEngine);

    gameEngine.notebook = notebook;
    gameEngine.teleportPrompt = teleportPrompt;
    gameEngine.hintArrow = hintArrow;
    

    gameEngine.entities.unshift(notebook);
    gameEngine.entities.unshift(teleportPrompt);
    gameEngine.entities.unshift(hintArrow);

   gameEngine.cameraTarget = player;
   gameEngine.addEntity(player);

    // Map manager is added last because engine draws in reverse order.
    // This makes the map draw first (background), then zombies, then player.
    gameEngine.addEntity(mapManager);
    currentPlayer = player;
    currentMapManager = mapManager;
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
  currentMapManager = null;
}
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
  

  // Queue all zombie variants
queueZombieSkins(ASSET_MANAGER);

console.log("[ASSET QUEUE] zombie path:", Zombie.SPRITE_PATH);

ASSET_MANAGER.downloadAll(async () => {
  console.log("Game starting");

  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");

  gameEngine.init(ctx);
  canvas.focus();

  function showTitleScreen() {
    // reset engine state
    gameEngine.entities = [];
    
    gameEngine.gameOver = false;
    gameEngine.gameWon = false;
    gameEngine.paused = false;
    gameEngine.keys = {};
    gameEngine.cameraTarget = null;
    gameEngine.onMapChanged = null;
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
  gameEngine.restart = () => {
    showTitleScreen();
  };
  gameEngine.start();
});
}



loadGame().catch((error) => {
  console.error("Failed to load game assets", error);
});