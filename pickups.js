// Health pickup entity (medkit/healthpack)
class HealthPickup {
  constructor(game, player, x, y, w, h, options = {}) {
    this.game = game;
    this.player = player;

    this.x = x;
    this.y = y;
    this.width = w || 32;
    this.height = h || 32;

    this.healAmount = options.healAmount ?? 25;
    this.spritePath = options.spritePath || null;

    this.removeFromWorld = false;
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  update() {
    if (this.removeFromWorld) return;
    if (!this.player || this.player.isDead) return;
    if (this.game.paused || this.game.gameOver) return;

    const p = this.player.getBounds();
    const me = this.getBounds();

    if (rectsOverlap(p, me)) {
      const healed = this.player.heal(this.healAmount);
      if (healed) {
        this.removeFromWorld = true;
      }
    }
  }

  draw(ctx) {
  if (this.removeFromWorld) return;

  const img = this.spritePath ? ASSET_MANAGER.getAsset(this.spritePath) : null;
  const ready = !!(img && img.complete && img.naturalWidth > 0);

  if (ready) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    //ctx.drawImage(img, this.x, this.y, this.width, this.height);
    ctx.drawImage(
    img,
    16, 0, 16, 16,   // crop the medkit icon
    this.x, this.y,
    this.width, this.height
    );
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = "lime";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText("MEDKIT", this.x, this.y - 6);
    ctx.restore();
  }

}
}

function spawnHealthPickupsFromMap(game, player, mapData, mapScale) {
  const spawned = [];

  const getMarker = (obj) => {
    const markerRaw =
      getObjectProperty(obj, "kind") ||
      getObjectProperty(obj, "type") ||
      getObjectProperty(obj, "entity") ||
      obj.class ||
      obj.type ||
      obj.name ||
      "";
    return String(markerRaw).trim().toLowerCase();
  };

  console.log("[MEDKIT] current map layers:", (mapData.layers || []).map(l => l.name));

  const walk = (layers) => {
    for (const layer of layers || []) {
      if (layer.type === "group" && layer.layers) {
        walk(layer.layers);
        continue;
      }

      if (layer.type !== "objectgroup") continue;

      const layerName = String(layer.name || "").toLowerCase();
      console.log("[MEDKIT] checking layer:", layer.name);

      for (const obj of layer.objects || []) {
        console.log("[MEDKIT] raw object:", {
          layer: layer.name,
          id: obj.id,
          name: obj.name,
          class: obj.class,
          type: obj.type,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          point: obj.point,
          properties: obj.properties
        });

        const marker = getMarker(obj);

        const isPickup =
          layerName.includes("medkit") ||
          marker.includes("medkit") ||
          marker.includes("healthpack") ||
          marker.includes("bandage");

        if (!isPickup) continue;

        const defaultW = Math.max(8, mapData.tilewidth || 16);
        const defaultH = Math.max(8, mapData.tileheight || 16);

        const w = 24;
        const h = 24;

        const rawX = (obj.x || 0) * mapScale;
        const rawY = (obj.y || 0) * mapScale;

        const isPoint = !!obj.point || (!obj.width && !obj.height);

        const x = isPoint ? rawX - w / 2 : rawX;
        const y = isPoint ? rawY - h / 2 : rawY;

        const healProp = getObjectProperty(obj, "heal");
        const healAmount = typeof healProp === "number" ? healProp : 50;

        const spritePath = getObjectProperty(obj, "sprite") || "./sprites/character/medkit/medkit.png";

        const pickup = new HealthPickup(game, player, x, y, w, h, {
          healAmount,
          spritePath
        });

        game.addEntity(pickup);
        spawned.push(pickup);

        console.log("[MEDKIT SPAWNED]", {
          layer: layer.name,
          marker,
          x,
          y,
          w,
          h,
          healAmount,
          isPoint
        });
      }
    }
  };

  walk(mapData.layers);

  console.log("[MEDKIT TOTAL]", spawned.length);
  return spawned;
}