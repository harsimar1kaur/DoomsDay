class BethBoss {
  constructor(game, player, x, y) {
    this.game = game;
    this.player = player;

    this.x = x;
    this.y = y;

    // on-screen size
    this.width = 500;
    this.height = 500;

    this.speed = 55;
    this.damage = 20;

    this.maxHealth = 220;
    this.health = 220;

    this.removeFromWorld = false;

    this.state = "idle";
    this.facing = "right";
    this.awake = false;

    this.wakeRadius = 170;
    this.attackRange = 48;
    this.attackCooldown = 0.9;
    this.attackTimer = 0;

    this.showHealthBar = true;

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

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.facing = dx < 0 ? "left" : "right";

    if (!this.awake && dist <= this.wakeRadius) {
      this.awake = true;
    }

    if (this.state === "death") {
      if (this.animations.death.isDone()) {
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
      this.x += (dx / len) * this.speed * dt;
      this.y += (dy / len) * this.speed * dt;
    }
  }

  drawHealthBar(ctx) {
    if (!this.showHealthBar || this.removeFromWorld) return;
    if (this.state === "death") return;

    const width = 80;
    const height = 8;
    const x = this.x + (this.width - width) / 2;
    const y = this.y - 18;
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

    ctx.fillStyle = "#7a1111";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "#5cff5c";
    ctx.fillRect(x, y, width * ratio, height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Beth", this.x + this.width / 2, y - 6);
    ctx.restore();
  }

draw(ctx) {
  const anim = this.animations[this.state] || this.animations.idle;
  const tick = this.game.clockTick;

  const frameW = anim.width;
  const frameH = anim.height;

  const scaleX = this.width / frameW;
  const scaleY = this.height / frameH;

  ctx.save();

  if (this.facing === "left") {
    // keep feet anchored better when flipped
    ctx.translate(this.x + this.width, this.y + this.height);
    ctx.scale(-scaleX, scaleY);
    anim.drawFrame(tick, ctx, 0, -frameH);
  } else {
    ctx.translate(this.x, this.y + this.height);
    ctx.scale(scaleX, scaleY);
    anim.drawFrame(tick, ctx, 0, -frameH);
  }

  ctx.restore();

  this.drawHealthBar(ctx);
}
}