// zombie.js
// Simple zombie that chases and attacks the player.
// Supports different sprite sheets via options.spritePath (Sheet6 / Sheet8 etc.)

class Zombie {
  constructor(game, player, x, y, options = {}) {
    this.game = game;
    this.player = player;

    this.x = x;
    this.y = y;

    // Size (can be overridden per variant)
    this.width = options.width || 52;
    this.height = options.height || 68;

    // Combat/movement stats
    this.speed = options.speed || 70;
    this.damage = options.damage || 10;
    this.chaseRadius = options.chaseRadius || 320;
    this.attackRange = options.attackRange || 24;
    this.attackCooldown = options.attackCooldown || 0.8;
    this.attackTimer = 0;

    // Health
    this.maxHealth = options.maxHealth || 45;
    this.health = this.maxHealth;
    this.showHealthBar = false;

    // ID/debug
    this.id = Zombie.nextId++;
    this.warnedMissingSprite = false;
    this.loggedAssetDebug = false;
    this.lazyLoadRequested = false;

    // Facing / direction (for later)
    this.lastDirection = options.facing || "down";

    // Sprite + animation
    this.variant = options.variant || "small";
    this.skin = ZOMBIE_SKINS[this.variant];

    this.state = "walk"; // walk | attack | idle
    this.attackType = Math.random() < 0.5 ? "first" : "second";
    this.deathType = Math.random() < 0.5 ? "death1" : "death2";
    this.corpseTimer = 0;      // seconds remaining after death anim finishes
    this.corpseDuration = 5;   // keep body for 5 seconds
    this.frozenDeathFrame = 0; // last frame index to freeze on

    this.frameWidth = 12;   // will be recalculated
    this.frameHeight = 16;  // will be recalculated
    this.frameCount = 6;    // will be recalculated
    this.animElapsed = 0;

    this.loadAnimatorInfo();
  }

  getSpritePath() {
  if (!this.skin) return Zombie.SPRITE_PATH;

  // DEATH: only side sheets exist in your assets, so map up/down to left/right.
  if (this.state === "death") {
    const dir = (this.lastDirection === "left" || this.lastDirection === "right")
      ? this.lastDirection
      : "right";

    // Some variants only have death1 (or only left has death2). Fallback safely.
    const d = this.skin[dir];
    return (d && d[this.deathType]) || (d && d.death1) || this.skin[dir].walk;
  }

  if (this.state === "attack") {
    return this.skin[this.lastDirection][this.attackType];
  }

  return this.skin[this.lastDirection].walk;
}

  loadAnimatorInfo() {
  const spritePath = this.getSpritePath();
  const sprite = ASSET_MANAGER.getAsset(spritePath);
  if (!sprite) return;

  let frames = 6;
  const m = String(spritePath).match(/Sheet(\d+)\.png$/i);
  if (m) frames = parseInt(m[1], 10) || 6;

  this.frameCount = frames;
  this.frameWidth = Math.floor(sprite.width / frames);
  this.frameHeight = sprite.height;
}

tryLazyLoadSprite(spritePath) {
  if (!spritePath) return;
  if (this.lazyLoadRequested && this.lazyLoadRequested === spritePath) return;
  this.lazyLoadRequested = spritePath;

  const img = new Image();
  img.addEventListener("load", () => {
    ASSET_MANAGER.cache[spritePath] = img;
    this.loadAnimatorInfo();
    if (this.game.debug) console.log("[ZOMBIE SPRITE LAZY LOAD OK]", spritePath);
  });
  img.addEventListener("error", () => {
    console.warn("[ZOMBIE SPRITE LAZY LOAD FAILED]", spritePath);
  });
  img.src = spritePath;
}

  takeDamage(amount, source) {
    if (this.removeFromWorld) return false;
    const dmg = Math.max(0, amount || 0);
    if (dmg > 0) AudioEngine.playHit();
    this.health = Math.max(0, this.health - dmg);
    if (this.health < this.maxHealth) this.showHealthBar = true;

   if (this.health <= 0) {
    // Start death animation once
    AudioEngine.playZombieDie();
    this.health = 0;
    this.state = "death";
    this.animElapsed = 0;
    this.attackTimer = 9999; // stop attacking

    // First zombie defeated in Beth room is treated as the boss defeat milestone.
    const mapPath = String(this.game && this.game.currentMapPath || "").toLowerCase();
    if (this.game && mapPath.includes("bethroom") && !this.game.bossDefeated) {
      this.game.bossDefeated = true;
      const aliveNow = (this.game.entities || []).filter(
        (e) =>
          e &&
          e.constructor &&
          e.constructor.name === "Zombie" &&
          !e.removeFromWorld &&
          e.state !== "death"
      ).length;
      this.game.zombieObjectiveTotal = Math.max(this.game.zombieObjectiveTotal || 0, aliveNow);
      if (typeof this.game.showDialogue === "function") {
        this.game.showDialogue("Boss down. Clear the remaining zombies.", 2600);
      }
    }
  }
    return true;
  }

  update() {

  
    if (!this.player || this.player.isDead) return;
    if (this.game.paused || this.game.gameOver) return;
    if (this.removeFromWorld) return;

    if (this.state === "death") {
  const dt = this.game.clockTick;

  // Once death animation is finished, count down corpse timer
  if (this.deathFinished) {
    this.corpseTimer = Math.max(0, this.corpseTimer - dt);
    if (this.corpseTimer <= 0) this.removeFromWorld = true;
  }

  return;
}


    const dt = this.game.clockTick;

    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.state === "attack") {
    } else {
    }
        if (dist > this.chaseRadius) return;

    // Update direction for future (if you later swap sprites by direction)
    if (Math.abs(dx) >= Math.abs(dy)) this.lastDirection = dx >= 0 ? "right" : "left";
    else this.lastDirection = dy >= 0 ? "down" : "up";
    // If currently attacking, let animation finish
    if (this.state === "attack") {
      const attackDuration = this.frameCount * 0.10; // matches draw frameDuration
      if (this.animElapsed >= attackDuration) {
        this.state = "walk";
        this.animElapsed = 0;
      }
    } 
    // Start a new attack only if cooldown ready
    else if (dist <= this.attackRange && this.attackTimer <= 0) {
      this.state = "attack";
      this.animElapsed = 0;
    }
    else {
      this.state = "walk";
    }

    if (this.state === "walk" && dist > this.attackRange) {
    const len = dist || 1;
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * dt;
    }
    
    else if (this.attackTimer <= 0) {
      if (this.player && typeof this.player.takeDamage === "function") {
        this.player.takeDamage(this.damage, this, dist);
      }
      this.attackTimer = this.attackCooldown;
    }
  }

draw(ctx) {
  const spritePath = this.getSpritePath();

  // If the animation switched sheets (walk -> attack -> walk), recalc frames
  if (this.currentSpritePath !== spritePath) {
    this.currentSpritePath = spritePath;
    this.loadAnimatorInfo();
    this.animElapsed = 0; // optional: restart animation on switch
  }

  const sprite = ASSET_MANAGER.getAsset(spritePath);
  const spriteReady = !!(sprite && sprite.complete && sprite.naturalWidth > 0);

  if (spriteReady) {
    if (!this.frameWidth || !this.frameHeight) this.loadAnimatorInfo();

    this.animElapsed += this.game.clockTick;

    const frameDuration = 0.10;
    const frameCount = this.frameCount || 6;
    let frame = Math.floor(this.animElapsed / frameDuration);

    if (this.state === "death") {
      // If we've reached the end of the death animation, freeze on last frame
      if (frame >= frameCount) {
        frame = frameCount - 1;

        if (!this.deathFinished) {
          this.deathFinished = true;
          this.corpseTimer = this.corpseDuration; // start 5s countdown
          this.frozenDeathFrame = frame;
        }
      }
    } else {
      frame = frame % frameCount;
    }
    const sx = frame * this.frameWidth;

    ctx.drawImage(
      sprite,
      sx, 0,
      this.frameWidth, this.frameHeight,
      this.x, this.y,
      this.width, this.height
    );

    this.drawHealthBar(ctx);
    return;
  }

  if (!this.warnedMissingSprite) {
    console.warn("Zombie sprite missing, using fallback rectangle:", spritePath);
    this.warnedMissingSprite = true;
  }

  // Don't try to lazy load undefined anymore—lazy load the actual spritePath
  this.tryLazyLoadSprite(spritePath);

  ctx.save();
  ctx.fillStyle = "#5d8f3e";
  ctx.strokeStyle = "#1e3811";
  ctx.lineWidth = 2;
  ctx.fillRect(this.x, this.y, this.width, this.height);
  ctx.strokeRect(this.x, this.y, this.width, this.height);
  ctx.restore();

  this.drawHealthBar(ctx);
}

  drawHealthBar(ctx) {
    if (!this.showHealthBar || this.removeFromWorld) return;
    if (this.state === "death") return;
    const width = 30;
    const height = 4;
    const x = this.x + (this.width - width) / 2;
    const y = this.y - 8;
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

    ctx.fillStyle = "#7a1111";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "#5cff5c";
    ctx.fillRect(x, y, Math.max(0, width * ratio), height);
    ctx.restore();
  }
}

Zombie.nextId = 1;

// Default sprite (small zombie down walk sheet)
Zombie.SPRITE_PATH =
  "./PostApocalypse_AssetPack_v1.1.2/Enemies/Zombie_Small/Zombie_Small_Down_walk-Sheet6.png";