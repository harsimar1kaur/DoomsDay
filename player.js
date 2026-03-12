// Player character: input, movement, and animation.
class Player {
  constructor(game, x, y, speed) {
    this.game = game;
    this.x = x;
    this.y = y;

    this.scale = 4;            // make pixel art bigger
    this.speed = speed || 180; // pixels per second
    this.direction = "down";   // "up" | "down" | "left" | "right"
    this.width = 14 * this.scale;
    this.height = 17 * this.scale;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.invincibilityDuration = 0.75;
    this.hitCooldown = 0;
    this.isDead = false;

    // Turn off blur for pixel art
    this.game.ctx.imageSmoothingEnabled = false;

    // RUN sheets
    this.downSheet  = ASSET_MANAGER.getAsset("./sprites/character/run/Character_down_run-Sheet6.png");
    this.upSheet    = ASSET_MANAGER.getAsset("./sprites/character/run/Character_up_run-Sheet6.png");
    this.leftSheet  = ASSET_MANAGER.getAsset("./sprites/character/run/Character_side-left_run-Sheet6.png");
    this.rightSheet = ASSET_MANAGER.getAsset("./sprites/character/run/Character_side_run-Sheet6.png");

    // PUNCH sheets
    this.downPunchSheet  = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_down_punch-Sheet4.png");
    this.upPunchSheet    = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_up_punch-Sheet4.png");
    this.leftPunchSheet  = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
    this.rightPunchSheet = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_side_punch-Sheet4.png");

    // Animators
    // Run (loops)
    this.downAnim  = new Animator(this.downSheet,  0, 0, 13, 17, 6, 0.10, true);
    this.upAnim    = new Animator(this.upSheet,    0, 0, 13, 17, 6, 0.10, true);
    this.leftAnim  = new Animator(this.leftSheet,  0, 0, 14, 17, 6, 0.10, true);
    this.rightAnim = new Animator(this.rightSheet, 0, 0, 14, 17, 6, 0.10, true);

    // Punch 
    this.downPunchAnim  = new Animator(this.downPunchSheet,  0, 0, 13, 17, 4, 0.10, false);
    this.upPunchAnim    = new Animator(this.upPunchSheet,    0, 0, 13, 17, 4, 0.10, false);
    this.leftPunchAnim  = new Animator(this.leftPunchSheet,  0, 0, 14, 17, 4, 0.10, false);
    this.rightPunchAnim = new Animator(this.rightPunchSheet, 0, 0, 14, 17, 4, 0.10, false);

    this.batSheets = {
      hold: {
        down: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_down_idle-and-run-Sheet6.png"),
        up: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_up_idle-and-run-Sheet6.png"),
        left: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side-left_idle-and-run-Sheet6.png"),
        right: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side_idle-and-run-Sheet6.png")
      },
      attack: {
        down: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_down_attack-Sheet4.png"),
        up: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_up_attack-Sheet4.png"),
        left: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side-left_attack-Sheet4.png"),
        right: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side_attack-Sheet4.png")
      }
    };
    this.loggedBatLoadState = false;
    this.missingBatSheetWarnings = new Set();

    // BAT animators (calculated from real sheet sizes)
    // Hold sheets: down 102x11 (17x11 x6), up 96x14 (16x14 x6), side 96x13 (16x13 x6)
    this.batDownHoldAnim  = new Animator(this.batSheets.hold.down,  0, 0, 17, 11, 6, 0.10, true);
    this.batUpHoldAnim    = new Animator(this.batSheets.hold.up,    0, 0, 16, 14, 6, 0.10, true);
    this.batLeftHoldAnim  = new Animator(this.batSheets.hold.left,  0, 0, 16, 13, 6, 0.10, true);
    this.batRightHoldAnim = new Animator(this.batSheets.hold.right, 0, 0, 16, 13, 6, 0.10, true);
    // Attack sheets: down/up 80x25 (20x25 x4), side 112x16 (28x16 x4)
    this.batDownAttackAnim  = new Animator(this.batSheets.attack.down,  0, 0, 20, 25, 4, 0.10, false);
    this.batUpAttackAnim    = new Animator(this.batSheets.attack.up,    0, 0, 20, 25, 4, 0.10, false);
    this.batLeftAttackAnim  = new Animator(this.batSheets.attack.left,  0, 0, 28, 16, 4, 0.10, false);
    this.batRightAttackAnim = new Animator(this.batSheets.attack.right, 0, 0, 28, 16, 4, 0.10, false);


    // State
    this.moving = false;
    this.punching = false;
    this.punchDamage = 18;
    this.punchRange = 62;
    this.punchCooldown = 0.35;
    this.punchCooldownTimer = 0;
    this.punchTimer = 0;
    this.punchActiveWindowStart = 0.08;
    this.punchActiveWindowEnd = 0.24;
    this.batSwingDuration = 0.30;
    this.batHitWindowStart = 0.08;
    this.batHitWindowEnd = 0.20;
    this.punchHitIds = new Set();
    this.inventory = {};
    this.equippedWeapon = null;
    this.weapons = {
      bat: {
        id: "bat",
        damage: 32,
        range: 92,
        update: () => {},
        draw: (ctx, behindPlayer) => this.drawBat(ctx, behindPlayer),
        attack: (zombie) => zombie.takeDamage(32, this)
      }
    };
    this.weaponStats = {
      punch: { damage: this.punchDamage, range: this.punchRange },
      knife: { damage: 24, range: 76 },
      bat: { damage: 32, range: 92 }
    };
    this.batSpritePath = "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Bat.png";
    this.batSprite = ASSET_MANAGER.getAsset(this.batSpritePath);
    this.batHoldFrameElapsed = 0;
    this.weaponDebugState = {
      attacking: false,
      attackTimer: 0,
      facingDirection: this.direction,
      swingFrameIndex: 0,
      anchorX: 0,
      anchorY: 0
    };
    this.loggedBatHandOffsets = {};
    this.lastWeaponAttackDebugKey = "";
    this.loggedBatSheetState = false;
    if (this.game.debug) {
      const holdDown = this.batSheets.hold.down;
      const attackDown = this.batSheets.attack.down;
      console.log("[PLAYER SHEET INIT]", {
        downRunLoaded: !!(this.downSheet && this.downSheet.complete && this.downSheet.naturalWidth > 0),
        batHoldDownLoaded: !!(holdDown && holdDown.complete && holdDown.naturalWidth > 0),
        batAttackDownLoaded: !!(attackDown && attackDown.complete && attackDown.naturalWidth > 0)
      });
    }
    // Used to detect "press once" for Space
    this.prevSpaceDown = false;
    this.prevEDown = false;
    this.interactPressed = false;
  }

  logBatSheetStatusOnce(sourceTag) {
    if (this.loggedBatLoadState) return;
    const holdDown = this.batSheets && this.batSheets.hold && this.batSheets.hold.down;
    const attackDown = this.batSheets && this.batSheets.attack && this.batSheets.attack.down;
    const runDown = this.downSheet;
    console.log(`[BAT LOAD CHECK:${sourceTag}]`, {
      holdDownImage: holdDown,
      attackDownImage: attackDown,
      runDownImage: runDown,
      holdDownLoaded: !!(holdDown && holdDown.complete && holdDown.naturalWidth > 0),
      attackDownLoaded: !!(attackDown && attackDown.complete && attackDown.naturalWidth > 0),
      runDownLoaded: !!(runDown && runDown.complete && runDown.naturalWidth > 0),
      holdDownSize: holdDown ? `${holdDown.naturalWidth}x${holdDown.naturalHeight}` : "missing",
      attackDownSize: attackDown ? `${attackDown.naturalWidth}x${attackDown.naturalHeight}` : "missing"
    });
    if (!(holdDown && holdDown.complete && holdDown.naturalWidth > 0) ||
        !(attackDown && attackDown.complete && attackDown.naturalWidth > 0)) {
      console.warn("Bat sheet missing/invalid, using safe fallback body + overlay.");
    }
    this.loggedBatLoadState = true;
  }

  update() {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - this.game.clockTick);
    this.punchCooldownTimer = Math.max(0, this.punchCooldownTimer - this.game.clockTick);
    this.batHoldFrameElapsed += this.game.clockTick;

    const keys = this.game.keys;

    // SPACE -> start punch (once per press)
    const spaceDown = !!keys[" "];
    const spacePressed = spaceDown && !this.prevSpaceDown;
    this.prevSpaceDown = spaceDown;
    const eDown = !!keys["e"];
    this.interactPressed = eDown && !this.prevEDown;
    this.prevEDown = eDown;

    if (spacePressed && !this.punching && this.punchCooldownTimer <= 0) {
      AudioEngine.playPunch();
      this.punching = true;
      this.punchTimer = 0;
      this.punchHitIds.clear();
      this.punchCooldownTimer = this.punchCooldown;

      // Reset punch-body animation only when unarmed.
      // if (this.equippedWeapon !== "bat") {
      //   if (this.direction === "up") this.upPunchAnim.reset();
      //   else if (this.direction === "left") this.leftPunchAnim.reset();
      //   else if (this.direction === "right") this.rightPunchAnim.reset();
      //   else this.downPunchAnim.reset();
      // }
      // Reset the correct attack animation every time we start an attack.
    if (this.equippedWeapon === "bat") {
      if (this.direction === "up") this.batUpAttackAnim.reset();
      else if (this.direction === "left") this.batLeftAttackAnim.reset();
      else if (this.direction === "right") this.batRightAttackAnim.reset();
      else this.batDownAttackAnim.reset();
    } else {
      if (this.direction === "up") this.upPunchAnim.reset();
      else if (this.direction === "left") this.leftPunchAnim.reset();
      else if (this.direction === "right") this.rightPunchAnim.reset();
      else this.downPunchAnim.reset();
    }
    
    }

    // If punching, don't move; end when animation finishes
    if (this.punching) {
      this.punchTimer += this.game.clockTick;
      const hitStart = this.equippedWeapon === "bat" ? this.batHitWindowStart : this.punchActiveWindowStart;
      const hitEnd = this.equippedWeapon === "bat" ? this.batHitWindowEnd : this.punchActiveWindowEnd;
      const inHitWindow = this.punchTimer >= hitStart && this.punchTimer <= hitEnd;
      if (inHitWindow) {
        this.applyPunchDamage();
      }
      const weapon = this.getEquippedWeaponDef();
      if (weapon && typeof weapon.update === "function") {
        weapon.update();
      }

      if (this.equippedWeapon === "bat") {
        if (this.punchTimer >= this.batSwingDuration) this.punching = false;
      } else {
        let pAnim = this.downPunchAnim;
        if (this.direction === "up") pAnim = this.upPunchAnim;
        else if (this.direction === "left") pAnim = this.leftPunchAnim;
        else if (this.direction === "right") pAnim = this.rightPunchAnim;
        if (pAnim.isDone()) this.punching = false;
      }

      this.moving = false;
      return; // skip movement while punching
    }

    // WASD movement input.
    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["ArrowUp"]) dy -= 1;
    if (keys["s"] || keys["ArrowDown"]) dy += 1;
    if (keys["a"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["d"] || keys["ArrowRight"]) dx += 1;

    // Update facing direction based on input
    if (dx > 0) this.direction = "right";
    else if (dx < 0) this.direction = "left";
    else if (dy < 0) this.direction = "up";
    else if (dy > 0) this.direction = "down";

    // Normalize diagonal movement.
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const dt = this.game.clockTick;
    const proposedX = this.x + dx * this.speed * dt;
    const proposedY = this.y + dy * this.speed * dt;

    // Check collisions separately on each axis.
    if (this.canMoveTo(proposedX, this.y)) {
      this.x = proposedX;
    }
    if (this.canMoveTo(this.x, proposedY)) {
      this.y = proposedY;
    }

    // Keep within map/world bounds
    const worldWidth = this.game.worldWidth || 800;
    const worldHeight = this.game.worldHeight || 600;
    this.x = Math.max(0, Math.min(worldWidth - this.width, this.x));
    this.y = Math.max(0, Math.min(worldHeight - this.height, this.y));

    this.moving = len > 0;
  }

  // Axis-aligned bounding box for collisions and portals.
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // Ask the collision grid if the next position is blocked.
  canMoveTo(x, y) {
    if (!this.game.collisionGrid) return true;
    const blocked = this.game.collisionGrid.isBlockedRect(x, y, this.width, this.height);
    if (blocked && this.game.debug) {
      console.log("Collision blocked:", { x, y, width: this.width, height: this.height });
    }
    return !blocked;
  }

  applyPunchDamage() {
  // Allow ALL attack types (punch / bat / knife) to deal damage.
  const zombies = (this.game.entities || []).filter(
  (e) =>
    e &&
    e.constructor &&
    (e.constructor.name === "Zombie" || e.constructor.name === "BethBoss") &&
    !e.removeFromWorld
);

  const attack = this.getAttackProfile();          // { id, damage, range }
  const weapon = this.getEquippedWeaponDef();      // may be null

  for (const zombie of zombies) {
    if (this.punchHitIds.has(zombie.id)) continue;
    if (!this.isZombieInAttackRange(zombie, attack.range)) continue;

    // If a weapon has a custom attack() use it, otherwise do normal damage.
    const applied =
      weapon && typeof weapon.attack === "function"
        ? weapon.attack(zombie)
        : zombie.takeDamage(attack.damage, this);

    if (applied) {
      this.punchHitIds.add(zombie.id);
    }
  }
}

  getAttackProfile() {
  if (this.equippedWeapon && this.weaponStats[this.equippedWeapon]) {
    return { id: this.equippedWeapon, ...this.weaponStats[this.equippedWeapon] };
  }
  return { id: "punch", ...this.weaponStats.punch };
}

  getEquippedWeaponDef() {
    if (!this.equippedWeapon) return null;
    return this.weapons[this.equippedWeapon] || null;
  }

  isZombieInAttackRange(zombie, attackRange) {
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;
    const zombieCenterX = zombie.x + zombie.width / 2;
    const zombieCenterY = zombie.y + zombie.height / 2;
    const dx = zombieCenterX - playerCenterX;
    const dy = zombieCenterY - playerCenterY;
    const dist = Math.hypot(dx, dy);
    if (dist > attackRange) return false;

    // Keep temporary combat modular: this directional check can be swapped later for weapon arcs.
    if (this.direction === "right") return dx >= -6;
    if (this.direction === "left") return dx <= 6;
    if (this.direction === "up") return dy <= 6;
    return dy >= -6;
  }

  addItem(itemId) {
    if (!itemId) return;
    this.inventory[itemId] = true;
    if (!this.equippedWeapon && this.weaponStats[itemId]) {
      this.equippedWeapon = itemId;
    }
  }

  hasItem(itemId) {
    return !!this.inventory[itemId];
  }

  removeItem(itemId) {
    delete this.inventory[itemId];
    if (this.equippedWeapon === itemId) this.equippedWeapon = null;
  }

  takeDamage(amount, attacker, distanceFromAttacker) {
    if (this.isDead) return false;
    if (this.hitCooldown > 0) return false;
    if (!this.game.zombiesEnabled) return false;

    // Safety guards: health can only drop from a real zombie attack.
    const zombies = (this.game.entities || []).filter(
    (e) =>
      e &&
      e.constructor &&
      (e.constructor.name === "Zombie" || e.constructor.name === "BethBoss")
    );
    if (zombies.length === 0) return false;
    if (!attacker || (attacker.constructor.name !== "Zombie" && attacker.constructor.name !== "BethBoss")) return false;
        if (!zombies.includes(attacker)) return false;

    const dx = this.x - attacker.x;
    const dy = this.y - attacker.y;
    const dist = typeof distanceFromAttacker === "number" ? distanceFromAttacker : Math.hypot(dx, dy);
    if (dist > attacker.attackRange) return false;

    this.health = Math.max(0, Math.min(this.maxHealth, this.health - amount));
    this.hitCooldown = this.invincibilityDuration;

    if (typeof AudioEngine !== "undefined") {
    AudioEngine.init();          // safe to call (it early-returns if already inited)
    AudioEngine.playPlayerHurt();
}

    if (this.health <= 0) {
      this.isDead = true;
      this.game.gameOver = true;
      this.game.paused = true;
      this.game.keys = {};
    }
    return true;
  }

draw(ctx) {
  ctx.imageSmoothingEnabled = false;
  this.logBatSheetStatusOnce("draw");

  let anim;

  // Keep player body visible while bat swing overlay handles the weapon animation.
  if (this.punching) {
    if (this.equippedWeapon === "bat") {
      anim = this.downAnim;
      if (this.direction === "up") anim = this.upAnim;
      else if (this.direction === "left") anim = this.leftAnim;
      else if (this.direction === "right") anim = this.rightAnim;
    } else {
      anim = this.downPunchAnim;
      if (this.direction === "up") anim = this.upPunchAnim;
      else if (this.direction === "left") anim = this.leftPunchAnim;
      else if (this.direction === "right") anim = this.rightPunchAnim;
    }
  } else {
    anim = this.downAnim;
    if (this.direction === "up") anim = this.upAnim;
    else if (this.direction === "left") anim = this.leftAnim;
    else if (this.direction === "right") anim = this.rightAnim;
  }

  if (!anim || !anim.spriteSheet) {
    console.error("Invalid animator:", anim);
    anim = this.downAnim;
    if (!anim || !anim.spriteSheet) return;
  }

  const tick = (this.moving || this.punching) ? this.game.clockTick : 0;

  // Bat layer behind body only when facing up.
  if (this.equippedWeapon === "bat" && this.direction === "up") {
    this.drawBat(ctx, true);
  }
  
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.scale(this.scale, this.scale);

  if (!this.punching && !this.moving) {
    const old = anim.elapsedTime;
    anim.elapsedTime = 0;          // force frame 0
    anim.drawFrame(0, ctx, 0, 0);  // don't advance
    anim.elapsedTime = old;        // restore
  } else {
    anim.drawFrame(tick, ctx, 0, 0);
  }

  ctx.restore();

  if (this.equippedWeapon === "bat" && this.direction !== "up") {
    this.drawBat(ctx, false);
  }

  if (this.game.debug) {
    ctx.save();
    ctx.strokeStyle = "#33c5ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }

  // Draw a simple speech bubble when a dialog is active.
  if (this.game.activeDialog && this.game.activeDialog.timeLeftMs > 0) {
    const text = this.game.activeDialog.text || "";
    if (text) {
      const padding = 6;
      ctx.save();
      ctx.font = "12px monospace";
      const textWidth = ctx.measureText(text).width;
      const bubbleWidth = textWidth + padding * 2;
      const bubbleHeight = 20;
      const bubbleX = this.x + this.width / 2 - bubbleWidth / 2;
      const bubbleY = this.y - bubbleHeight - 8;

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
      ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);

      ctx.fillStyle = "#111";
      ctx.fillText(text, bubbleX + padding, bubbleY + 14);
      ctx.restore();
    }
  }
}

drawBat(ctx, behindPlayer) {
  if (this.equippedWeapon !== "bat") return;
  const dirProfile = {
    down: {
      // Down/up are centered to reduce shoulder-crossing and keep forward feel.
      anchorOffset: { x: 7, y: 11 },
      rightHandOffset: { x: 8, y: 11 },
      leftHandOffset: { x: 5, y: 11 },
      layer: "front",
      holdOffset:   { x: -10, y: -8 },
      attackOffset: { x: -11, y: -9},
      flipX: false
    },
    up: {
      anchorOffset: { x: 7, y: 8 },
      rightHandOffset: { x: 6, y: 8 },
      leftHandOffset: { x: 8, y: 8 },
      layer: "back",
      holdOffset: { x: -6, y: -6 },
      attackOffset: { x: -7, y: -7 },
      flipX: false
    },
    left: {
      anchorOffset: { x: 5, y: 10 },
      rightHandOffset: { x: 5, y: 10 },
      leftHandOffset: { x: 8, y: 10 },
      layer: "front",
      holdOffset: { x: -4, y: -6 },
      attackOffset: { x: -5, y: -7 },
      flipX: false
    },
    right: {
      anchorOffset: { x: 8, y: 10 },
      rightHandOffset: { x: 8, y: 10 },
      leftHandOffset: { x: 5, y: 10 },
      layer: "front",
      holdOffset:   { x: -12, y: -6},
      attackOffset: { x: -13, y: -7 },
      flipX: false
    }
  }[this.direction] || {
    anchorOffset: { x: 7, y: 10 },
    rightHandOffset: { x: 8, y: 10 },
    leftHandOffset: { x: 5, y: 10 },
    layer: "front",
    holdOffset: { x: -4, y: -4 },
    attackOffset: { x: -2, y: -6 },
    flipX: false
  };

  const shouldDrawBehind = dirProfile.layer === "back";
  if (behindPlayer !== shouldDrawBehind) return;

  let holdAnim = this.batDownHoldAnim;
  let attackAnim = this.batDownAttackAnim;
  if (this.direction === "up") {
    holdAnim = this.batUpHoldAnim;
    attackAnim = this.batUpAttackAnim;
  } else if (this.direction === "left") {
    holdAnim = this.batLeftHoldAnim;
    attackAnim = this.batLeftAttackAnim;
  } else if (this.direction === "right") {
    holdAnim = this.batRightHoldAnim;
    attackAnim = this.batRightAttackAnim;
  }

  const useAttackAnim = this.punching;
  const batAnim = useAttackAnim ? attackAnim : holdAnim;
  const batSheet = batAnim && batAnim.spriteSheet;
  const hasValidBatSheet = !!(batSheet && batSheet.complete && batSheet.naturalWidth > 0);
  const selectedHand = dirProfile.anchorOffset || dirProfile.rightHandOffset;
  const bob = this.moving ? Math.sin(this.batHoldFrameElapsed * 20) * 0.25 : 0;
  const handLocal = { x: selectedHand.x, y: selectedHand.y + bob };
  const drawOffset = useAttackAnim ? dirProfile.attackOffset : dirProfile.holdOffset;
  const drawX = handLocal.x + drawOffset.x;
  const drawY = handLocal.y + drawOffset.y;
  const rotationSign = (this.direction === "left" || this.direction === "up") ? -1 : 1;

  const attackProgress = Math.max(0, Math.min(1, this.punchTimer / Math.max(0.001, this.batSwingDuration)));
  let swingFrameIndex = 0;
  if (this.punching) {
    swingFrameIndex = Math.min(3, Math.floor(attackProgress * 4));
  }

  if (this.game.debugWeapon && !this.loggedBatHandOffsets[this.direction]) {
    this.loggedBatHandOffsets[this.direction] = true;
    console.log("[BAT HAND OFFSET]", this.direction, {
      using: "anchorOffset",
      anchorOffset: dirProfile.anchorOffset,
      leftHandOffset: dirProfile.leftHandOffset,
      rightHandOffset: dirProfile.rightHandOffset,
      flipX: dirProfile.flipX
    });
  }

  if (this.game.debugWeapon && this.punching) {
    const frameBucket = Math.floor(this.punchTimer / 0.05);
    const debugKey = `${this.direction}:${frameBucket}`;
    if (debugKey !== this.lastWeaponAttackDebugKey) {
      this.lastWeaponAttackDebugKey = debugKey;
      console.log("[BAT ATTACK DEBUG]", {
        direction: this.direction,
        anchor: selectedHand,
        flipApplied: !!dirProfile.flipX,
        rotationSign,
        mode: "sheet"
      });
    }
  }

  const tick = (this.moving || this.punching) ? this.game.clockTick : 0;
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.scale(this.scale, this.scale);
  ctx.imageSmoothingEnabled = false;

  if (hasValidBatSheet && batAnim && typeof batAnim.drawFrame === "function") {
    if (dirProfile.flipX) {
      ctx.translate(drawX + batAnim.width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(drawX + batAnim.width / 2), 0);
    }
    const frameTick = (!this.punching && !this.moving) ? 0 : tick;
    batAnim.drawFrame(frameTick, ctx, drawX, drawY);
  } else {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(handLocal.x - 1, handLocal.y - 9, 2, 9);
    if (this.game.debugWeapon) {
      console.warn("[BAT SHEET MISSING]", this.direction, useAttackAnim ? "attack" : "hold");
    }
  }
  ctx.restore();

  const boxW = hasValidBatSheet ? batAnim.width * this.scale : 4 * this.scale;
  const boxH = hasValidBatSheet ? batAnim.height * this.scale : 11 * this.scale;
  const boxX = this.x + drawX * this.scale;
  const boxY = this.y + drawY * this.scale;
  this.weaponDebugState = {
    attacking: this.punching,
    attackTimer: this.punchTimer,
    facingDirection: this.direction,
    swingFrameIndex,
    anchorX: this.x + handLocal.x * this.scale,
    anchorY: this.y + handLocal.y * this.scale
  };

  if (this.game.debugWeapon) {
    ctx.save();
    ctx.fillStyle = "#00d4ff";
    ctx.beginPath();
    ctx.arc(this.weaponDebugState.anchorX, this.weaponDebugState.anchorY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Forward direction indicator to verify "attack forward" by facing.
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;
    const forward = { x: 0, y: 1 };
    if (this.direction === "up") forward.y = -1;
    else if (this.direction === "left") { forward.x = -1; forward.y = 0; }
    else if (this.direction === "right") { forward.x = 1; forward.y = 0; }
    const lineLen = 18;
    ctx.strokeStyle = "#ff5aa5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerCenterX, playerCenterY);
    ctx.lineTo(playerCenterX + forward.x * lineLen, playerCenterY + forward.y * lineLen);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,0,0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.restore();
  }
}

}