// inventory.js
class Inventory {
  constructor(game) {
    this.game = game;

    this.slotCount = 4;
    this.slotSize = 40;
    this.spacing = 6;
    this.padding = 8;

    this.x = 450;
    this.y = 580; // above HP bar
  }

  update() {
    const player = this.game.cameraTarget;
    if (!player) return;

    if (!this.game.click) return;

    const items = this.getItems();
    const click = this.game.click;

    for (let i = 0; i < this.slotCount; i++) {
      const slotRect = this.getSlotRect(i);

      if (this.pointInRect(click, slotRect)) {
        const itemId = items[i];

        if (!itemId) {
          player.equippedWeapon = null;
        } else if (player.equippedWeapon === itemId) {
          player.equippedWeapon = null;
        } else {
          player.equippedWeapon = itemId;
        }

        this.game.click = null;
        return;
      }
    }
  }

  getItems() {
    const player = this.game.cameraTarget;
    if (!player || !player.inventory) return [];

    const items = [];

    if (player.inventory.bat) items.push("bat");
    if (player.inventory.knife) items.push("knife");
    if (player.inventory.beth_house_key) items.push("beth_house_key");
    if (player.inventory.escape_key) items.push("escape_key");

    return items;
  }

  getSpritePath(itemId) {
    if (itemId === "bat") {
      return "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Bat.png";
    }
    if (itemId === "knife") {
      return "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Knife.png";
    }
    if (itemId === "beth_house_key") {
      return "./Room/sewerkey.png";
    }
    if (itemId === "escape_key") {
      return "./KeyFly/KeyFly1.png";
    }
    return null;
  }

  getSlotRect(index) {
    const sx = this.x + this.padding + index * (this.slotSize + this.spacing);
    const sy = this.y + this.padding;

    return {
      x: sx,
      y: sy,
      w: this.slotSize,
      h: this.slotSize
    };
  }

  pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w &&
           p.y >= r.y && p.y <= r.y + r.h;
  }

 drawAnimatedKey(ctx, img, dx, dy, dw, dh) {
  const frameCount = 8;
  const frameWidth = 16;
  const frameHeight = 16;
  const frameDuration = 0.12;

  const frameIndex =
    Math.floor(this.game.timer.gameTime / frameDuration) % frameCount;

  const sx = 0;
  const sy = frameIndex * frameHeight;

  ctx.drawImage(
    img,
    sx,
    sy,
    frameWidth,
    frameHeight,
    dx,
    dy,
    dw,
    dh
  );
}

  draw(ctx) {
    const totalWidth =
      this.slotCount * this.slotSize +
      (this.slotCount - 1) * this.spacing +
      this.padding * 2;

    const totalHeight = this.slotSize + this.padding * 2;

    const x = this.x;
    const y = this.y;

    const items = this.getItems();
    const player = this.game.cameraTarget;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // outer background
    ctx.fillStyle = "rgba(80,80,80,0.85)";
    ctx.fillRect(x, y, totalWidth, totalHeight);

    ctx.strokeStyle = "rgba(40,40,40,1)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, totalWidth, totalHeight);

    for (let i = 0; i < this.slotCount; i++) {
      const sx = x + this.padding + i * (this.slotSize + this.spacing);
      const sy = y + this.padding;

      // slot background
      ctx.fillStyle = "rgba(120,120,120,0.9)";
      ctx.fillRect(sx, sy, this.slotSize, this.slotSize);

      // highlight equipped weapon
      const itemId = items[i];
      const isEquipped =
        player &&
        itemId &&
        player.equippedWeapon &&
        player.equippedWeapon === itemId;

      ctx.strokeStyle = isEquipped ? "#ffd54f" : "rgba(30,30,30,1)";
      ctx.lineWidth = isEquipped ? 3 : 2;
      ctx.strokeRect(sx, sy, this.slotSize, this.slotSize);

      // draw item sprite
      if (itemId) {
        const spritePath = this.getSpritePath(itemId);
        const img = spritePath ? ASSET_MANAGER.getAsset(spritePath) : null;

        if (img) {
          const iconPadding = 4;
          const drawX = sx + iconPadding;
          const drawY = sy + iconPadding;
          const drawW = this.slotSize - iconPadding * 2;
          const drawH = this.slotSize - iconPadding * 2;

          if (itemId === "beth_house_key") {
            this.drawAnimatedKey(ctx, img, drawX, drawY, drawW, drawH);
          } else {
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }
        } else {
          // fallback text if image missing
          ctx.fillStyle = "white";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(itemId, sx + this.slotSize / 2, sy + this.slotSize / 2);
        }
      }
    }

    ctx.restore();
  }
}