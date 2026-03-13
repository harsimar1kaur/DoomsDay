class ItemPickup {
  constructor(game, player, options = {}) {
    this.game = game;
    this.player = player;

    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 32;
    this.height = options.height || 32;

    this.itemId = options.itemId || "";
    this.spritePath = options.spritePath || "";
    this.collectedKey = options.collectedKey || this.itemId;

    // Separate image frames (used by Beth key)
    this.animationFrames = options.animationFrames || null;

    // Sprite-sheet animation (used by sewer key / other pickups)
    this.frameCount = options.frameCount || 1;
    this.frameDuration = options.frameDuration || 0.12;
    this.frameWidth = options.frameWidth || this.width;
    this.frameHeight = options.frameHeight || this.height;

    this.pickupRadius = options.pickupRadius || 42;
    this.pickupDelay = options.pickupDelay || 0;

    this.animTime = 0;
    this.showHint = false;
    this.warnedMissingSprite = false;
    this.removeFromWorld = false;
  }

  pickup() {
    if (this.removeFromWorld) return;

    if (this.player && typeof this.player.addItem === "function") {
      this.player.addItem(this.itemId);
    }

    if (!this.game.collectedItems) {
      this.game.collectedItems = new Set();
    }
    this.game.collectedItems.add(this.collectedKey);

    if (typeof this.game.onStoryItemCollected === "function") {
      this.game.onStoryItemCollected(this.itemId);
    }

    this.removeFromWorld = true;
  }

  update() {
    if (!this.player || this.removeFromWorld) return;
    if (this.game.paused || this.game.gameOver) return;

    this.animTime += this.game.clockTick;
    this.pickupDelay = Math.max(0, this.pickupDelay - this.game.clockTick);

    if (this.game.collectedItems && this.game.collectedItems.has(this.collectedKey)) {
      this.removeFromWorld = true;
      return;
    }

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    const itemCenterX = this.x + this.width / 2;
    const itemCenterY = this.y + this.height / 2;

    const dist = Math.hypot(itemCenterX - playerCenterX, itemCenterY - playerCenterY);
    this.showHint = dist <= this.pickupRadius;

    const autoPickup = this.pickupDelay <= 0 && dist <= this.pickupRadius;
    const manualPickup = this.pickupDelay <= 0 && this.showHint && this.player.interactPressed;

    if (autoPickup || manualPickup) {
      this.pickup();
    }
  }

  drawHint(ctx) {
    if (!this.showHint) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const screenX = this.x - this.game.camera.x + this.width / 2;
    const screenY = this.y - this.game.camera.y - 18;

    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText("E", screenX, screenY);
    ctx.fillText("E", screenX, screenY);

    ctx.restore();
  }

  draw(ctx) {
    let sprite = null;

    // 1) Separate frame images (Beth key)
    if (this.animationFrames && this.animationFrames.length > 0) {
      const frameIndex =
        Math.floor(this.animTime / this.frameDuration) % this.animationFrames.length;

      const framePath = this.animationFrames[frameIndex];
      sprite = ASSET_MANAGER.getAsset(framePath);

      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
      } else {
        if (!this.warnedMissingSprite) {
          console.warn("Pickup sprite missing, using fallback:", framePath);
          this.warnedMissingSprite = true;
        }

        ctx.save();
        ctx.fillStyle = "#f4d03f";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      }

      this.drawHint(ctx);
      return;
    }

    // 2) Single image or sprite-sheet animation
    sprite = this.spritePath ? ASSET_MANAGER.getAsset(this.spritePath) : null;
    const spriteReady = !!(sprite && sprite.complete && sprite.naturalWidth > 0);

    if (spriteReady) {
      if (this.frameCount <= 1) {
        ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
      } else {
        const frameIndex =
          Math.floor(this.animTime / this.frameDuration) % this.frameCount;

        const sx = frameIndex * this.frameWidth;
        const sy = 0;

        ctx.drawImage(
          sprite,
          sx,
          sy,
          this.frameWidth,
          this.frameHeight,
          this.x,
          this.y,
          this.width,
          this.height
        );
      }
    } else {
      if (!this.warnedMissingSprite) {
        console.warn("Pickup sprite missing, using fallback:", this.spritePath);
        this.warnedMissingSprite = true;
      }

      ctx.save();
      ctx.fillStyle = "#f4d03f";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }

    this.drawHint(ctx);
  }
}