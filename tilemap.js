// Resolves tileset image paths relative to a map file.
function resolveMapAssetPath(mapPath, assetPath) {
  if (!assetPath) return assetPath;
  if (/^(?:https?:)?\/\//.test(assetPath)) return assetPath;
  if (assetPath.startsWith("/")) return assetPath;

  const slashIndex = mapPath.lastIndexOf("/");
  if (slashIndex === -1) return assetPath;
  const mapDir = mapPath.slice(0, slashIndex + 1);

  if (assetPath.startsWith("PostApocalypse_AssetPack_v1.1.2/")) {
    return mapDir + "../" + assetPath;
  }

  return mapDir + assetPath;
}

// Resolves map-to-map links (portals) relative to the current map.
function resolveMapPath(mapPath, relativePath) {
  if (!relativePath) return relativePath;
  if (/^(?:https?:)?\/\//.test(relativePath)) return relativePath;
  if (relativePath.startsWith("/")) return relativePath;

  const slashIndex = mapPath.lastIndexOf("/");
  if (slashIndex === -1) return relativePath;
  return mapPath.slice(0, slashIndex + 1) + relativePath;
}

//Helper function to resolve path issues in map generation
function resolveMapAssetPath(mapPath, assetPath) {
  if (!assetPath) return assetPath;

  assetPath = assetPath.replace(/\\/g, "/");
 
  if (/^(?:https?:)?\/\//.test(assetPath)) return assetPath;
  if (assetPath.startsWith("/")) return assetPath;

  
  
  const slashIndex = mapPath.lastIndexOf("/");
  const mapDir = slashIndex === -1 ? "" : mapPath.slice(0, slashIndex + 1);
  
  const pack = "PostApocalypse_AssetPack_v1.1.2/";
  const packIdx = assetPath.indexOf(pack);
   if (packIdx !== -1) {
    let cleaned = assetPath.slice(packIdx);

    // Removes -copy -copy issue in path so that map loads correctly
    cleaned = cleaned.replace(/\s-\sCopy.*(?=\.png)/i, "");

    return mapDir + "../" + cleaned;
  }
  const mapsImages = "Maps/images/";
  const mIdx = assetPath.indexOf(mapsImages);
  if (mIdx !== -1) {
    const fileName = assetPath.slice(mIdx + mapsImages.length); // "Garbage_TileSet.png"
    return mapDir + fileName; // matches your correct file style
  }

  return mapDir + assetPath;
}




// Returns map width/height in pixels.
function getMapPixelSize(mapData, scale) {
  const mapScale = scale || 1;
  return {
    width: mapData.width * mapData.tilewidth * mapScale,
    height: mapData.height * mapData.tileheight * mapScale
  };
}

// Finds the default PlayerSpawn object.
function findPlayerSpawn(mapData) {
  if (!mapData || !Array.isArray(mapData.layers)) return null;

  for (const layer of mapData.layers) {
    if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;

    const layerTypeProp = (layer.properties || []).find(
      (prop) => prop.name === "type" && prop.value === "spawn"
    );

    for (const obj of layer.objects) {
      if (obj.name === "PlayerSpawn") return obj;
      if (layerTypeProp && obj.type === "PlayerSpawn") return obj;
    }
  }

  return null;
}

// Finds a spawn object by name or spawn properties.
function findSpawnByName(mapData, spawnName) {
  if (!mapData || !Array.isArray(mapData.layers)) return null;

  for (const layer of mapData.layers) {
    if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;
    for (const obj of layer.objects) {
      if (obj.name === spawnName) return obj;
      if (getObjectProperty(obj, "spawn_od") === spawnName) return obj;
      if (getObjectProperty(obj, "spawn") === spawnName) return obj;
    }
  }

  return null;
}

// Returns spawn position in world pixels (scaled).
function getSpawnPosition(mapData, scale, spawnName) {
  let spawn = spawnName ? findSpawnByName(mapData, spawnName) : findPlayerSpawn(mapData);
  if (!spawn) {
    for (const layer of mapData.layers || []) {
      if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;
      spawn = layer.objects.find((obj) => getObjectProperty(obj, "entity") === "player");
      if (spawn) break;
    }
  }
  if (!spawn) {
    console.warn("Spawn not found:", spawnName || "PlayerSpawn");
    return { x: 0, y: 0 };
  }

  const mapScale = scale || 1;
  return {
    x: spawn.x * mapScale,
    y: spawn.y * mapScale
  };
}

// Helper to read custom object properties from Tiled.
function getObjectProperty(obj, name) {
  if (!obj || !Array.isArray(obj.properties)) return null;
  const prop = obj.properties.find((p) => p.name === name);
  return prop ? prop.value : null;
}

// Detects portal objects based on properties or class/type.
function isPortalObject(obj) {
  const typeProp = getObjectProperty(obj, "type");
  if (typeProp === "portal") return true;
  if (obj.type === "portal") return true;
  if (obj.class === "portal") return true;
  if (getObjectProperty(obj, "targetMap")) return true;
  if (getObjectProperty(obj, "targetSpawn")) return true;
  return false;
}

// Detects dialog trigger objects.
function isDialogObject(obj) {
  const typeProp = getObjectProperty(obj, "type");
  if (typeProp === "dialog") return true;
  if (obj.type === "dialog") return true;
  if (obj.class === "dialog") return true;
  if (getObjectProperty(obj, "text")) return true;
  return false;
}

// Collects all portal objects from every object layer.
function getPortalObjects(mapData) {
  if (!mapData || !Array.isArray(mapData.layers)) return [];
  const portals = [];

  for (const layer of mapData.layers) {
    if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;
    for (const obj of layer.objects) {
      if (isPortalObject(obj)) portals.push(obj);
    }
  }

  return portals;
}

// Collects all dialog trigger objects from every object layer.
function getDialogObjects(mapData) {
  if (!mapData || !Array.isArray(mapData.layers)) return [];
  const dialogs = [];

  for (const layer of mapData.layers) {
    if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;
    for (const obj of layer.objects) {
      if (isDialogObject(obj)) dialogs.push(obj);
    }
  }

  return dialogs;
}

function isFinalExitObject(obj) {
  const name = String(obj && obj.name || "").toLowerCase();
  const type = String(obj && obj.type || "").toLowerCase();
  const klass = String(obj && obj.class || "").toLowerCase();
  return name === "finalexit" && (type === "exit" || klass === "exit");
}

function getFinalExitObjects(mapData) {
  if (!mapData || !Array.isArray(mapData.layers)) return [];
  const exits = [];

  walkLayers(mapData.layers, (layer) => {
    if (layer.type !== "objectgroup") return;
    for (const obj of layer.objects || []) {
      if (isFinalExitObject(obj)) exits.push(obj);
    }
  });

  return exits;
}
// Collects all tileset image paths used by a map.
function collectTilesetImagePaths(mapData, mapPath) {
  if (!mapData || !Array.isArray(mapData.tilesets)) return [];
  const paths = new Set();

  for (const tileset of mapData.tilesets) {
    const tilesetPath = resolveMapAssetPath(mapPath, tileset.image);
    if (tilesetPath) paths.add(tilesetPath);

    for (const tile of tileset.tiles || []) {
      const tilePath = resolveMapAssetPath(mapPath, tile.image);
      if (tilePath) paths.add(tilePath);
    }
  }

  return [...paths];
}

// Preloads images and stores them in the asset cache.
function preloadImages(paths) {
  const uniquePaths = [...new Set(paths)].filter(Boolean);
  if (uniquePaths.length === 0) return Promise.resolve({ loaded: 0, failed: 0 });

  let loaded = 0;
  let failed = 0;

  return Promise.all(
    uniquePaths.map(
      (path) =>
        new Promise((resolve) => {
          const img = new Image();
          img.addEventListener("load", () => {
            ASSET_MANAGER.cache[path] = img;
            loaded += 1;
            resolve();
          });
          img.addEventListener("error", () => {
            failed += 1;
            console.warn("Failed to load image:", path);
            resolve();
          });
          img.src = path;
        })
    )
  ).then(() => ({ loaded, failed }));
}

function getCollisionObjects(mapData) {
  if (!mapData || !Array.isArray(mapData.layers)) return [];

  const objects = [];

  for (const layer of mapData.layers) {
    if (layer.type !== "objectgroup") continue;
    if (String(layer.name || "").toLowerCase() !== "collisionobjects") continue;

    for (const obj of layer.objects || []) {
      objects.push(obj);
    }
  }

  return objects;
}

// Collision grid built from the map's Collision layer.
class CollisionGrid {
constructor(mapData, scale, collisionLayerName) {
  this.mapData = mapData;
  this.scale = scale || 1;
  this.collisionLayerName = collisionLayerName || "Collision";
  this.collisionLayer = this.findCollisionLayer();
  this.collisionObjects = getCollisionObjects(mapData);
}

  // Finds the tile layer named "Collision".
  findCollisionLayer() {
    if (!this.mapData || !Array.isArray(this.mapData.layers)) return null;
    return this.mapData.layers.find(
      (layer) => layer.type === "tilelayer" && layer.name === this.collisionLayerName
    );
  }

  isBlockedRect(x, y, width, height) {
  let blockedByTile = false;

  if (this.collisionLayer && Array.isArray(this.collisionLayer.data)) {
    const tileWidth = this.mapData.tilewidth * this.scale;
    const tileHeight = this.mapData.tileheight * this.scale;

    const left = Math.floor(x / tileWidth);
    const right = Math.floor((x + width - 1) / tileWidth);
    const top = Math.floor(y / tileHeight);
    const bottom = Math.floor((y + height - 1) / tileHeight);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (this.isBlockedTile(tx, ty)) {
          blockedByTile = true;
          break;
        }
      }
      if (blockedByTile) break;
    }
  }

  if (blockedByTile) return true;

  return this.isBlockedByObject(x, y, width, height);
}

isBlockedByObject(x, y, width, height) {
  const rect = { x, y, width, height };

  for (const obj of this.collisionObjects || []) {
    if (this.objectBlocksRect(obj, rect)) return true;
  }

  return false;
}

objectBlocksRect(obj, rect) {
  // polygon object
  if (Array.isArray(obj.polygon) && obj.polygon.length > 0) {
    const points = obj.polygon.map((p) => ({
      x: (obj.x + p.x) * this.scale,
      y: (obj.y + p.y) * this.scale
    }));

    return polygonIntersectsRect(points, rect);
  }

  // rectangle object
  const objRect = {
    x: (obj.x || 0) * this.scale,
    y: (obj.y || 0) * this.scale,
    width: (obj.width || 0) * this.scale,
    height: (obj.height || 0) * this.scale
  };

  return rectsOverlap(rect, objRect);
}
  // Checks a single tile for collision.
  isBlockedTile(tx, ty) {
    if (!this.collisionLayer) return false;
    if (tx < 0 || ty < 0 || tx >= this.collisionLayer.width || ty >= this.collisionLayer.height) {
      return true;
    }
    const index = ty * this.collisionLayer.width + tx;
    return this.collisionLayer.data[index] !== 0;
  }
}

// Draws tile layers from a Tiled map.
class TiledMapRenderer {
  constructor(game, mapData, mapPath, scale) {
    this.game = game;
    this.mapData = mapData;
    this.mapPath = mapPath;
    this.game.currentMapPath = mapPath;
    this.scale = scale || 1;
    this.missingImages = new Set();
    this.tilesets = (mapData.tilesets || []).map((tileset) => ({
      ...tileset,
      imagePath: resolveMapAssetPath(mapPath, tileset.image),
      tileImageMap: (tileset.tiles || []).reduce((acc, tile) => {
        if (tile.image) {
          acc[tile.id] = {
            imagePath: resolveMapAssetPath(mapPath, tile.image),
            width: tile.imagewidth,
            height: tile.imageheight
          };
        }
        return acc;
      }, {})
    }));

    this.animatedTiles = new Map();
    this.buildAnimatedTiles();
  }

    buildAnimatedTiles() {
    for (const tileset of this.tilesets) {
      for (const tile of (tileset.tiles || [])) {
        if (!tile.animation || tile.animation.length === 0) continue;

        const animatedGid = tileset.firstgid + tile.id;

        const frames = tile.animation.map(frame => ({
          gid: tileset.firstgid + frame.tileid,
          duration: frame.duration / 1000
        }));

        const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);

        this.animatedTiles.set(animatedGid, {
          frames,
          totalDuration
        });
      }
    }
  }

  getAnimatedGid(gid) {
    const anim = this.animatedTiles.get(gid);
    if (!anim) return gid;

    const total = anim.totalDuration;
    if (!total || total <= 0) return gid;

    let t = this.game.timer ? (this.game.timer.gameTime % total) : 0;

    for (const frame of anim.frames) {
      if (t < frame.duration) return frame.gid;
      t -= frame.duration;
    }

    return anim.frames[anim.frames.length - 1].gid;
  }


  update() {}

  // Draws all visible tile layers.
  // Draws only the tiles visible in the camera view (culling).
draw(ctx) {
  const game = this.game;

  const tileW = this.mapData.tilewidth * this.scale;
  const tileH = this.mapData.tileheight * this.scale;

  // Camera/view rectangle in WORLD coordinates
  const viewLeft = game.camera?.x || 0;
  const viewTop = game.camera?.y || 0;
  const viewRight = viewLeft + ctx.canvas.width;
  const viewBottom = viewTop + ctx.canvas.height;

  // Draw a small buffer to avoid popping at edges
  const bufferTiles = 1;

  // Convert view rect -> tile indices
  const startCol = Math.max(0, Math.floor(viewLeft / tileW) - bufferTiles);
  const endCol = Math.min(this.mapData.width - 1, Math.floor(viewRight / tileW) + bufferTiles);

  const startRow = Math.max(0, Math.floor(viewTop / tileH) - bufferTiles);
  const endRow = Math.min(this.mapData.height - 1, Math.floor(viewBottom / tileH) + bufferTiles);


  for (const layer of this.mapData.layers) {
    if (layer.type !== "tilelayer" || !layer.visible) continue;
    if (!Array.isArray(layer.data)) continue;

    // If a layer has its own width/height, use it; otherwise map size
    const layerW = layer.width || this.mapData.width;

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const i = row * layerW + col;
        const rawGid = layer.data[i];              // may include rotate/flip bits
        const baseGid = rawGid & 0x1FFFFFFF;       // strip Tiled flags
        if (baseGid === 0) continue;

        const gid = this.getAnimatedGid(baseGid);

        const tileset = this.getTilesetForGid(gid);
        if (!tileset) continue;

        const tileIndex = gid - tileset.firstgid;

        
        const destX = col * tileW;
        const destY = row * tileH;

        const flipH = (rawGid & 0x80000000) !== 0;
        const flipV = (rawGid & 0x40000000) !== 0;
        const flipD = (rawGid & 0x20000000) !== 0;

        // --- Normal tileset image (spritesheet)
        if (tileset.imagePath) {
          const columns = tileset.columns;
          const srcX = (tileIndex % columns) * tileset.tilewidth;
          const srcY = Math.floor(tileIndex / columns) * tileset.tileheight;

          const image = ASSET_MANAGER.getAsset(tileset.imagePath);
          if (!image) {
            if (!this.missingImages.has(tileset.imagePath)) {
              console.warn("Missing tileset image:", tileset.imagePath);
              this.missingImages.add(tileset.imagePath);
            }
            continue;
          }

          const dw = tileset.tilewidth * this.scale;
          const dh = tileset.tileheight * this.scale;

          ctx.save();
          ctx.translate(destX + dw / 2, destY + dh / 2);

          // Tiled: apply diagonal first, then H/V
          if (flipD) {
            ctx.rotate(Math.PI / 2);
            ctx.scale(-1, 1);
          }
          if (flipH) ctx.scale(-1, 1);
          if (flipV) ctx.scale(1, -1);

          ctx.drawImage(
            image,
            srcX,
            srcY,
            tileset.tilewidth,
            tileset.tileheight,
            -dw / 2,
            -dh / 2,
            dw,
            dh
          );

          ctx.restore();


        // --- Per-tile images (image collection tileset)
        } else if (tileset.tileImageMap && tileset.tileImageMap[tileIndex]) {
        const tileImage = tileset.tileImageMap[tileIndex];
        const image = ASSET_MANAGER.getAsset(tileImage.imagePath);

        if (!image) {
          if (!this.missingImages.has(tileImage.imagePath)) {
            console.warn("Missing tile image:", tileImage.imagePath);
            this.missingImages.add(tileImage.imagePath);
          }
          continue;
        }

        const dw = tileImage.width * this.scale;
        const dh = tileImage.height * this.scale;

        // IMPORTANT: anchor the bottom of the image to the bottom of the tile cell
        const drawY = destY - (dh - tileH);

        ctx.save();
        ctx.translate(destX + dw / 2, drawY + dh / 2);

        if (flipD) {
          ctx.rotate(Math.PI / 2);
          ctx.scale(-1, 1);
        }
        if (flipH) ctx.scale(-1, 1);
        if (flipV) ctx.scale(1, -1);

        ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }

      }
    }
  }
}


  getTilesetForGid(gid) {
    let selected = null;
    for (const tileset of this.tilesets) {
      if (gid >= tileset.firstgid) selected = tileset;
    }
    return selected;
  }
}

function walkLayers(layers, fn) {
  if (!Array.isArray(layers)) return;
  for (const layer of layers) {
    fn(layer);
    // Tiled group layers store children in `layers`
    if (layer.type === "group" && Array.isArray(layer.layers)) {
      walkLayers(layer.layers, fn);
    }
  }
}

function collectDialogueTriggers(mapData, mapScale) {
  const triggers = [];

  walkLayers(mapData.layers, (layer) => {
    if (layer.type !== "objectgroup") return;

    for (const obj of layer.objects || []) {
      const isDialogue =
        getObjectProperty(obj, "type") === "dialogue" ||
        obj.type === "dialogue" ||
        obj.class === "dialogue";

      if (!isDialogue) continue;

      triggers.push({
        group: getObjectProperty(obj, "group") || obj.name || "(no group)",
        text: getObjectProperty(obj, "text") || "",
        once: !!getObjectProperty(obj, "once"),
        rect: {
          x: obj.x * mapScale,
          y: obj.y * mapScale,
          width: (obj.width || mapData.tilewidth) * mapScale,
          height: (obj.height || mapData.tileheight) * mapScale
        }
      });
    }
  });

  return triggers;
}


class MapManager {
  constructor(game, player, mapScale) {
    this.game = game;
    this.player = player;
    this.mapScale = mapScale || 1;
    this.mapData = null;
    this.mapPath = "";
    this.renderer = null;
    this.collisionGrid = null;
    this.portals = [];
    this.finalExits = [];
    this.dialogs = [];
    this.usedTriggers = new Set();
    this.activeDialog = null;
    this.portalCooldown = 0;
    this.activePortalId = null;
    this.isTransitioning = false;
    if (!this.game.seenDialogTriggers) this.game.seenDialogTriggers = new Set();
    if (!this.game.seenDialogueMessages) this.game.seenDialogueMessages = new Set();
    if (!this.game.dialogueUsedGroupsGlobal) this.game.dialogueUsedGroupsGlobal = new Set();
  }

  isBethHouseDoorPortal(portal) {
    const portalName = String(portal.name || "").toLowerCase();
    const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
    const onMainForest = String(this.mapPath || "").toLowerCase().includes("mainforest");
    return onMainForest && portalName === "backtohouse" && targetMap.includes("bethhouse");
  }

  isBedroomExitPortal(portal) {
    const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
    const onBedroom = String(this.mapPath || "").toLowerCase().includes("bedroom");
    return onBedroom && targetMap.includes("mainforest");
  }

  canLeaveBedroom() {
    const hasWeapon =
      !!(this.player && this.player.hasItem && (this.player.hasItem("bat") || this.player.hasItem("knife")));
    return !!this.game.checkedWindow && hasWeapon;
  }

  isDoorInteractPressed() {
    return !!(this.player && (this.player.interactPressed || this.game.keys[" "]));
  }

  parseBoolProp(value) {
    if (typeof value === "boolean") return value;
    const raw = String(value || "").trim().toLowerCase();
    return raw === "true" || raw === "1" || raw === "yes";
  }

  getNonSewerEnemyProgress() {
    const spawnIds = this.game.enemySpawnIds instanceof Set ? [...this.game.enemySpawnIds] : [];
    const defeatedIds = this.game.defeatedEnemyIds instanceof Set ? this.game.defeatedEnemyIds : new Set();
    const objectiveIds = spawnIds.filter((id) => !String(id).toLowerCase().includes("sewer"));
    let defeated = 0;
    for (const id of objectiveIds) {
      if (defeatedIds.has(id)) defeated += 1;
    }
    const total = objectiveIds.length;
    const alive = Math.max(0, total - defeated);
    return { total, defeated, alive };
  }

  isFinalExitUnlocked(exitObj) {
    const requiresBethDefeated = this.parseBoolProp(getObjectProperty(exitObj, "requiresBethDefeated"));
    const requiredKey = String(getObjectProperty(exitObj, "requiresKey") || "").trim();
    const progress = this.getNonSewerEnemyProgress();
    const isAreaCleared = progress.total > 0 && progress.alive <= 0;

    const hasBethDefeated = !requiresBethDefeated || !!this.game.bossDefeated;
    const hasRequiredKey = !requiredKey || !!(this.player && this.player.hasItem && this.player.hasItem(requiredKey));

    return hasBethDefeated && hasRequiredKey && isAreaCleared;
  }

  setLayerVisibilityByName(layerName, visible) {
    if (!this.mapData || !layerName) return;
    const target = String(layerName).toLowerCase();
    walkLayers(this.mapData.layers, (layer) => {
      if (String(layer.name || "").toLowerCase() === target && layer.type === "tilelayer") {
        layer.visible = !!visible;
      }
    });
  }

  updateFinalExitDoorLayers() {
    if (!Array.isArray(this.finalExits) || this.finalExits.length === 0) return;
    const unlocked = this.isFinalExitUnlocked(this.finalExits[0]);
    this.setLayerVisibilityByName("lockeddoor", !unlocked);
    this.setLayerVisibilityByName("unlockeddoor", unlocked);
  }

  getDialogTriggerKey(dialog) {
    const mapKey = String(this.mapPath || "").toLowerCase();
    const idPart =
      dialog && Number.isFinite(dialog.id)
        ? String(dialog.id)
        : `${Math.round(dialog.x || 0)}:${Math.round(dialog.y || 0)}:${String(dialog.name || "")}`;
    return `${mapKey}:dialog:${idPart}`;
  }

  showDialogueOnce(key, text, durationMs = 2000) {
    if (!key || !text) return false;
    if (!this.game.seenDialogueMessages) this.game.seenDialogueMessages = new Set();
    if (this.game.seenDialogueMessages.has(key)) return false;
    this.game.seenDialogueMessages.add(key);
    this.game.showDialogue(text, durationMs);
    return true;
  }

  // Applies a new map, builds collisions/portals, and moves the player.
  setMap(mapData, mapPath, spawnName) {
    console.log("MAP LOADED NAME:", mapData?.properties);
    console.log(
  "LAYER NAMES:",
  mapData.layers.map(l => `${l.name} (${l.type})`)
);

    this.mapData = mapData;
    this.mapPath = mapPath;
    const mapPathLower = String(mapPath || "").toLowerCase();
    const inBethDownstairs = mapPathLower.includes("bethhouse");
    const inBethUpstairs = mapPathLower.includes("bethroom");
    const inBethArea = inBethDownstairs || inBethUpstairs;
    if (inBethUpstairs) {
      this.game.visitedBethUpstairs = true;
    }
    if (
      this.game.visitedBethUpstairs &&
      !inBethArea &&
      this.game.bossDefeated &&
      this.game.enemyObjectiveTotal > 0 &&
      this.game.enemyObjectiveDefeated >= this.game.enemyObjectiveTotal
    ) {
      this.game.bethEscapeComplete = true;
    }
    this.lastSpawnName = spawnName || "PlayerSpawn";
    this.renderer = new TiledMapRenderer(this.game, mapData, mapPath, this.mapScale);
    this.collisionGrid = new CollisionGrid(mapData, this.mapScale, "Collision");
    this.portals = getPortalObjects(mapData);
    this.finalExits = getFinalExitObjects(mapData);
    this.dialogs = getDialogObjects(mapData);
    this.updateFinalExitDoorLayers();

// SWIM ZONES FROM TILE LAYERS
this.swimZones = [];
this.lessDeepZones = [];

for (const layer of mapData.layers) {
  if (layer.type !== "tilelayer") continue;

  const name = (layer.name || "").toLowerCase();
  if (name !== "swimzone" && name !== "lessdep") continue;

  const tileW = mapData.tilewidth * this.mapScale;
  const tileH = mapData.tileheight * this.mapScale;

  for (let row = 0; row < layer.height; row++) {
    for (let col = 0; col < layer.width; col++) {
      const index = row * layer.width + col;
      const tile = layer.data[index];
      if (!tile) continue;

      const zone = {
        x: col * tileW,
        y: row * tileH,
        width: tileW,
        height: tileH
      };

      if (name === "swimzone") this.swimZones.push(zone);
      if (name === "lessdep") this.lessDeepZones.push(zone);
    }
  }
}

this.game.swimZones = this.swimZones;
this.game.lessDeepZones = this.lessDeepZones;

this.usedTriggers = new Set();
this.activeDialog = null;
this.game.activeDialog = null;



    this.usedTriggers = new Set();
    this.activeDialog = null;
    this.game.activeDialog = null;

  
  // --- Zombies ---
    if (this.spawnedZombies) {
      for (const z of this.spawnedZombies) z.removeFromWorld = true;
    }
    this.spawnedZombies = [];

    // Spawn from map markers; defeated spawns are skipped by spawn manager.
    this.spawnedZombies = spawnZombiesFromMap(this.game, mapData, this.mapScale, mapPath);

    console.log("ZOMBIES SPAWNED:", this.spawnedZombies.length, "on", mapPath);

    const idx = this.game.entities.indexOf(this);
    if (idx !== -1) {
      this.game.entities.splice(idx, 1);
      this.game.entities.push(this);
    }

    const mapSize = getMapPixelSize(mapData, this.mapScale);
    this.game.worldWidth = mapSize.width;
    this.game.worldHeight = mapSize.height;
    this.game.collisionGrid = this.collisionGrid;

    const spawn = getSpawnPosition(mapData, this.mapScale, spawnName);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    if (typeof this.game.onMapChanged === "function") {
      this.game.onMapChanged(this.mapPath, this.mapData, this.player);
    }

    console.log("Map loaded:", mapPath);
    console.log("Spawn:", spawnName || "PlayerSpawn", spawn);
    this.logObjectLayers();
    this.logPortals();
    this.logDialogs();
    this.logSpawns();
  }

  // Loads the next map from a portal object.
  async transitionTo(portal) {
    if (this.isTransitioning) return;
    const targetMap = getObjectProperty(portal, "targetMap");
    const targetSpawn = getObjectProperty(portal, "targetSpawn");
    if (!targetMap) return;

    this.isTransitioning = true;
    console.log("Portal triggered:", portal.name || "(unnamed)", targetMap, targetSpawn);

    const nextMapPath = resolveMapPath(this.mapPath, targetMap);
    const fetchPath = encodeURI(nextMapPath);
    try {
      console.log("Fetching map:", fetchPath);
      const response = await fetch(fetchPath + "?v=" + Date.now());
      if (!response.ok) throw new Error(`Map fetch failed: ${response.status}`);
      const mapData = await response.json();

      const tilePaths = collectTilesetImagePaths(mapData, nextMapPath);
      const result = await preloadImages(tilePaths);
      console.log("Tileset images loaded:", result.loaded, "failed:", result.failed);

      this.setMap(mapData, nextMapPath, targetSpawn);
      this.portalCooldown = 1.0;

      // Prevent immediate re-prompt if spawn lands on a portal in the NEW map
      this.activePortalId = null;

      const playerBounds = this.player.getBounds();
      for (const newPortal of this.portals) {
        const portalRect = this.getPortalRect(newPortal);
        if (rectsOverlap(playerBounds, portalRect)) {
          this.activePortalId = newPortal.id;
          break;
        }
      }
    } catch (error) {
      const altMap = targetMap.includes("_") ? targetMap.replace(/_/g, " ") : null;
      if (altMap) {
        const altPath = resolveMapPath(this.mapPath, altMap);
        const altFetchPath = encodeURI(altPath);
        try {
          console.warn("Retrying map with spaces:", altFetchPath);
          const retry = await fetch(altFetchPath);
          if (!retry.ok) throw new Error(`Map fetch failed: ${retry.status}`);
          const mapData = await retry.json();
          const tilePaths = collectTilesetImagePaths(mapData, altPath);
          const result = await preloadImages(tilePaths);
          console.log("Tileset images loaded:", result.loaded, "failed:", result.failed);
          this.setMap(mapData, altPath, targetSpawn);
          this.portalCooldown = 1.0;

          // Prevent immediate re-prompt if spawn lands on a portal in the NEW map
          this.activePortalId = null;

          const playerBounds = this.player.getBounds();
          for (const newPortal of this.portals) {
            const portalRect = this.getPortalRect(newPortal);
            if (rectsOverlap(playerBounds, portalRect)) {
              this.activePortalId = newPortal.id;
              break;
            }
          }
        } catch (retryError) {
          console.error("Failed to load map:", nextMapPath, retryError);
        }
      } else {
        console.error("Failed to load map:", nextMapPath, error);
      }
    } finally {
      this.isTransitioning = false;
    }
  }

update() {
  if (!this.mapData) return;
  if (this.isTransitioning) return;

  if (this.portalCooldown > 0) {
    this.portalCooldown -= this.game.clockTick;
  }

  const playerBounds = this.player.getBounds();
  this.updateFinalExitDoorLayers();

  // --- final exit trigger logic ---
  for (const exitObj of this.finalExits || []) {
    const exitRect = this.getTriggerRect(exitObj);
    if (!rectsOverlap(playerBounds, exitRect)) continue;
    if (this.portalCooldown > 0) break;

    const requiresBethDefeated = this.parseBoolProp(getObjectProperty(exitObj, "requiresBethDefeated"));
    const requiredKey = String(getObjectProperty(exitObj, "requiresKey") || "").trim();
    const progress = this.getNonSewerEnemyProgress();

    if (requiresBethDefeated && !this.game.bossDefeated) {
      this.game.showDialogue("I can't leave yet.", 1800);
      this.portalCooldown = 0.45;
      return;
    }

    if (requiredKey && !(this.player && this.player.hasItem && this.player.hasItem(requiredKey))) {
      this.game.showDialogue("I need a key.", 1800);
      this.portalCooldown = 0.45;
      return;
    }

    if (!(progress.total > 0 && progress.alive <= 0)) {
      this.game.showDialogue("I need to clear the area first.", 1800);
      this.portalCooldown = 0.45;
      return;
    }

    this.updateFinalExitDoorLayers();
    if (typeof this.game.winGame === "function") {
      this.game.winGame();
    } else {
      this.game.gameWon = true;
    }
    this.portalCooldown = 0.45;
    return;
  }

  if (this.game.pendingTeleport) return;
  // --- portal logic ---
for (const portal of this.portals) {
  const portalRect = this.getPortalRect(portal);
  const overlap = rectsOverlap(playerBounds, portalRect);

  if (!overlap && this.activePortalId === portal.id) {
    this.activePortalId = null;
  }

  if (overlap && this.portalCooldown <= 0 && this.activePortalId !== portal.id) {
    if (this.isBedroomExitPortal(portal) && !this.canLeaveBedroom()) {
      if (this.isDoorInteractPressed()) {
        this.showDialogueOnce(`${this.mapPath}:bedroom_exit_locked`, "I should check the window and grab a weapon first.", 2400);
      }
      this.portalCooldown = 0.35;
      continue;
    }

    if (this.isBethHouseDoorPortal(portal)) {
      const hasBethKey = !!(this.player && this.player.hasItem && this.player.hasItem("beth_house_key"));
      const unlocked = !!this.game.bethDoorUnlocked;
      const interactPressed = this.isDoorInteractPressed();

      if (!hasBethKey && !unlocked) {
        if (interactPressed) {
          this.game.hasTriedBethDoor = true;
          this.showDialogueOnce(`${this.mapPath}:beth_door_locked`, "The door is locked. I need a key.", 2300);
          this.portalCooldown = 0.4;
        }
        continue;
      }

      if (hasBethKey && !unlocked) {
        this.game.bethDoorUnlocked = true;
      }

      // Require explicit interaction (E or Space) for Beth's door.
      if (!interactPressed) {
        continue;
      }

      // Beth's door transitions immediately after interaction (no extra mouse prompt).
      this.activePortalId = portal.id;
      this.portalCooldown = 0.4;
      this.transitionTo(portal);
      break;
    }

    console.log("Portal overlap detected:", portal.name || "(unnamed)", portalRect);

    const isInSewer = String(this.mapPath || "").toLowerCase().includes("sewer");

    if (isInSewer) {
      const alive = this.game.notebook ? this.game.notebook.getAliveZombies(4) : 0;
      const hasKey = this.game.hasSewerKey;

      if (alive > 0 || !hasKey) {
        this.showDialogueOnce(`${this.mapPath}:sewer_exit_blocked`, "I have to finish both objectives before leaving.", 2000);
        this.portalCooldown = 0.4;
        return;
      }
    }

    if (!this.game.pendingTeleport) {
      this.game.pendingTeleport = {
        mapManager: this,
        portal: portal
      };
    }

    break;
  }
}

  // --- dialog object logic ---
  for (const dialog of this.dialogs) {
    const dialogKey = this.getDialogTriggerKey(dialog);
    if (this.usedTriggers.has(dialog.id)) continue;
    if (this.game.seenDialogTriggers && this.game.seenDialogTriggers.has(dialogKey)) continue;

    const dialogRect = this.getTriggerRect(dialog);
    const overlap = rectsOverlap(playerBounds, dialogRect);

    if (overlap) {
      const text = getObjectProperty(dialog, "text") || "...";
      const durationMs = getObjectProperty(dialog, "duration") || 5000;

      this.activeDialog = { text, timeLeftMs: durationMs };
      this.game.activeDialog = this.activeDialog;
      this.usedTriggers.add(dialog.id);
      if (!this.game.seenDialogTriggers) this.game.seenDialogTriggers = new Set();
      this.game.seenDialogTriggers.add(dialogKey);

      // mark window task complete
      const dialogName = String(dialog.name || "").toLowerCase();
      if (dialogName.includes("chair")) {
        this.game.checkedWindow = true;
      }

      if (dialogName.includes("door")) {
      this.game.foundBeth = true;
      // Move objective to sewer as soon as Beth's locked-door dialog is discovered.
      if (!this.game.hasSewerKey) {
        this.game.hasTriedBethDoor = true;
      }
      }



      console.log("Dialog triggered:", dialog.name || "(unnamed)", text);
      break;
    }
  }

  // --- extra dialogueTriggers logic ---
  for (const trigger of this.dialogueTriggers || []) {
    const groupKey = `${String(this.mapPath || "").toLowerCase()}:group:${trigger.group}`;
    if (trigger.once && this.game.dialogueUsedGroupsGlobal && this.game.dialogueUsedGroupsGlobal.has(groupKey)) continue;

    if (rectsOverlap(playerBounds, trigger.rect)) {
      this.game.activeDialog = { text: trigger.text, timeLeftMs: 5000 };

      if (trigger.once) {
        if (!this.game.dialogueUsedGroupsGlobal) this.game.dialogueUsedGroupsGlobal = new Set();
        this.game.dialogueUsedGroupsGlobal.add(groupKey);
      }
      break;
    }
  }
}



    

    


  // Draws the map (behind entities).
  draw(ctx) {
    if (!this.renderer) return;
    this.renderer.draw(ctx);
  }

  // Converts a portal object into a screen-space rectangle.
  getPortalRect(portal) {
    return this.getTriggerRect(portal);
  }

  // Converts any trigger object into a rectangle.
  getTriggerRect(trigger) {
    const tileWidth = this.mapData.tilewidth;
    const tileHeight = this.mapData.tileheight;
    const width = trigger.width || tileWidth;
    const height = trigger.height || tileHeight;
    return {
      x: trigger.x * this.mapScale,
      y: trigger.y * this.mapScale,
      width: width * this.mapScale,
      height: height * this.mapScale
    };
  }

  // Debug: log object layer counts.
  logObjectLayers() {
    if (!this.mapData || !Array.isArray(this.mapData.layers)) return;
    const objectLayers = this.mapData.layers.filter((l) => l.type === "objectgroup");
    const objectCount = objectLayers.reduce((sum, l) => sum + (l.objects ? l.objects.length : 0), 0);
    console.log("Object layers:", objectLayers.length, "objects:", objectCount);
  }

  // Debug: log portal objects.
  logPortals() {
    if (!this.portals) return;
    console.log("Portals found:", this.portals.length);
    for (const portal of this.portals) {
      console.log("Portal:", {
        name: portal.name,
        x: portal.x,
        y: portal.y,
        width: portal.width,
        height: portal.height,
        properties: portal.properties || []
      });
    }
  }

  // Debug: log dialog objects.
  logDialogs() {
    if (!this.dialogs) return;
    console.log("Dialog triggers found:", this.dialogs.length);
    for (const dialog of this.dialogs) {
      console.log("Dialog:", {
        name: dialog.name,
        x: dialog.x,
        y: dialog.y,
        width: dialog.width,
        height: dialog.height,
        properties: dialog.properties || []
      });
    }
  }

  // Debug: log spawn objects.
  logSpawns() {
    if (!this.mapData || !Array.isArray(this.mapData.layers)) return;
    const spawns = [];
    for (const layer of this.mapData.layers) {
      if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;
      for (const obj of layer.objects) {
        if (obj.name && obj.name.toLowerCase().includes("spawn")) {
          spawns.push(obj.name);
        } else if (getObjectProperty(obj, "entity") === "player") {
          spawns.push(obj.name || "(unnamed player spawn)");
        }
      }
    }
    console.log("Spawn objects:", spawns.length ? spawns : "none found");
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


function pointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 0.00001) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

function polygonIntersectsRect(polygon, rect) {
  // rect corners inside polygon
  const rectPoints = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height }
  ];

  for (const p of rectPoints) {
    if (pointInPolygon(p, polygon)) return true;
  }

  // polygon points inside rect
  for (const p of polygon) {
    if (
      p.x >= rect.x &&
      p.x <= rect.x + rect.width &&
      p.y >= rect.y &&
      p.y <= rect.y + rect.height
    ) {
      return true;
    }
  }

  return false;
}