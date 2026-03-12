class BethBoss {
  constructor(game, player, x, y) {
    this.game = game;
    this.player = player;

    this.x = x;
    this.y = y;

    // Real gameplay hitbox
    this.width = 90;
    this.height = 120;

    // Visual scale only
    this.drawScale = 1.8;

    this.speed = 55;
    this.damage = 5;

    this.maxHealth = 220;
    this.health = 220;

    this.removeFromWorld = false;

    this.state = "idle";
    this.facing = "right";
    this.awake = false;

    this.wakeRadius = 260;
    this.attackRange = 90;
    this.attackCooldown = 0.9;
    this.attackTimer = 0;

    this.showHealthBar = true;
    this.droppedKey = false;

    this.animations = {
      idle: new Animator(
        ASSET_MANAGER.getAsset("./Room/ZombieWoman/Zombie - Idle.png"),
        0, 0,
        128, 128,
        9,
        0.14,
        true
      ),

      walk: new Animator(
        ASSET_MANAGER.getAsset("./Room/ZombieWoman/Zombie - Walk.png"),
        0, 0,
        128, 128,
        9,
        0.11,
        true
      ),

      attack: new Animator(
        ASSET_MANAGER.getAsset("./Room/ZombieWoman/Zombie - Attack.png"),
        0, 0,
        128, 120,
        16,
        0.08,
        false
      ),

      hurt: new Animator(
        ASSET_MANAGER.getAsset("./Room/ZombieWoman/Zombie - Hit.png"),
        0, 0,
        128, 128,
        4,
        0.10,
        false
      ),

      death: new Animator(
        ASSET_MANAGER.getAsset("./Room/ZombieWoman/Zombie - Death.png"),
        0, 0,
        128, 128,
        15,
        0.10,
        false
      )
    };
  }

  canMoveTo(x, y) {
    if (!this.game.collisionGrid) return true;
    return !this.game.collisionGrid.isBlockedRect(x, y, this.width, this.height);
  }

  takeDamage(amount) {
    if (this.state === "death") return false;

    this.health = Math.max(0, this.health - amount);

    if (this.health <= 0) {
      this.state = "death";
      this.animations.death.reset();
      return true;
    }

    this.state = "hurt";
    this.animations.hurt.reset();
    this.awake = true;
    return true;
  }

  update() {
    if (!this.player || this.player.isDead) return;
    if (this.game.paused || this.game.gameOver) return;
    if (this.removeFromWorld) return;

    const dt = this.game.clockTick;
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const bethCenterX = this.x + this.width / 2;
    const bethCenterY = this.y + this.height / 2;

    const dx = playerCenterX - bethCenterX;
    const dy = playerCenterY - bethCenterY;
    const dist = Math.hypot(dx, dy);

    this.facing = dx < 0 ? "left" : "right";

    if (!this.awake && dist <= this.wakeRadius) {
      this.awake = true;
    }

    // Death logic + key drop
    if (this.state === "death") {
      if (this.animations.death.isDone()) {
        if (!this.droppedKey) {
          this.droppedKey = true;

          const keyX = this.x + this.width / 2 - 16;
          const keyY = this.y + this.height - 40;

          this.game.addEntity(new ItemPickup(this.game, this.player, {
            x: keyX,
            y: keyY,
            width: 32,
            height: 32,
            itemId: "escape_key",
            spritePath: "./KeyFly/KeyFly1.png",
            collectedKey: "bethboss:escape_key",
            animationFrames: [
              "./KeyFly/KeyFly1.png",
              "./KeyFly/KeyFly2.png",
              "./KeyFly/KeyFly3.png",
              "./KeyFly/KeyFly4.png"
            ],
            frameDuration: 0.12
          }));
        }

        this.removeFromWorld = true;
      }
      return;
    }

    if (this.state === "hurt") {
      if (this.animations.hurt.isDone()) {
        this.state = this.awake ? "walk" : "idle";
      }
      return;
    }

    if (!this.awake) {
      this.state = "idle";
      return;
    }

    if (this.state === "attack") {
      if (this.animations.attack.isDone()) {
        this.state = "walk";
      }
      return;
    }

    if (dist <= this.attackRange) {
      this.state = "attack";
      this.animations.attack.reset();

      if (this.attackTimer <= 0 && typeof this.player.takeDamage === "function") {
        this.player.takeDamage(this.damage, this, dist);
        this.attackTimer = this.attackCooldown;
      }
    } else {
      this.state = "walk";

      const len = dist || 1;
      const moveX = (dx / len) * this.speed * dt;
      const moveY = (dy / len) * this.speed * dt;

      const nextX = this.x + moveX;
      const nextY = this.y + moveY;

      if (this.canMoveTo(nextX, this.y)) {
        this.x = nextX;
      }
      if (this.canMoveTo(this.x, nextY)) {
        this.y = nextY;
      }

      const worldWidth = this.game.worldWidth || 800;
      const worldHeight = this.game.worldHeight || 600;

      this.x = Math.max(0, Math.min(worldWidth - this.width, this.x));
      this.y = Math.max(0, Math.min(worldHeight - this.height, this.y));
    }
  }

  drawHealthBar(ctx) {
    if (!this.showHealthBar || this.removeFromWorld) return;
    if (this.state === "death") return;

    const visualWidth = 128 * this.drawScale;
    const barWidth = 80;
    const barHeight = 8;

    const x = this.x + visualWidth / 2 - barWidth / 2;
    const y = this.y - 14;

    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

    ctx.fillStyle = "#7a1111";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#5cff5c";
    ctx.fillRect(x, y, barWidth * ratio, barHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Beth", x + barWidth / 2, y - 6);
    ctx.restore();
  }

  draw(ctx) {
    const anim = this.animations[this.state] || this.animations.idle;
    const tick = this.game.clockTick;
    const frameH = anim.height;

    ctx.save();

    if (this.facing === "left") {
      ctx.translate(this.x + 128 * this.drawScale, this.y + frameH * this.drawScale);
      ctx.scale(-this.drawScale, this.drawScale);
      anim.drawFrame(tick, ctx, 0, -frameH);
    } else {
      ctx.translate(this.x, this.y + frameH * this.drawScale);
      ctx.scale(this.drawScale, this.drawScale);
      anim.drawFrame(tick, ctx, 0, -frameH);
    }

    ctx.restore();

    this.drawHealthBar(ctx);
  }
}