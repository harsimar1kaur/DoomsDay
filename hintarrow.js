class HintArrow {
  constructor(game) {
    this.game = game;
    this.active = true;
    this.target = null;
    this.showZombieRadar = false;
    this.prevZDown = false;
  }

  setTarget(x, y, label = "Objective") {
    this.target = { x, y, label };
  }

  clearTarget() {
    this.target = null;
    this.active = true;
  }

  getMapManager() {
    return (this.game.entities || []).find(
      (e) => e && e.constructor && e.constructor.name === "MapManager"
    ) || null;
  }

  getPortalWorldPoint(mapManager, predicate) {
    if (!mapManager || !Array.isArray(mapManager.portals)) return null;
    const portal = mapManager.portals.find(predicate);
    if (!portal) return null;
    const scale = mapManager.mapScale || 1;
    return {
      x: (portal.x || 0) * scale,
      y: (portal.y || 0) * scale
    };
  }

  getKeyPickupWorldPoint() {
    const keyPickup = (this.game.entities || []).find(
      (e) =>
        e &&
        e.constructor &&
        e.constructor.name === "ItemPickup" &&
        !e.removeFromWorld &&
        e.itemId === "beth_house_key"
    );
    if (!keyPickup) return null;
    return {
      x: keyPickup.x + keyPickup.width / 2,
      y: keyPickup.y + keyPickup.height / 2
    };
  }

  getPortalToMainForest(mapManager) {
    return this.getPortalWorldPoint(mapManager, (portal) => {
      const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
      return targetMap.includes("mainforest");
    });
  }

  getBethDoorPoint(mapManager) {
    return this.getPortalWorldPoint(mapManager, (portal) => {
      const portalName = String(portal.name || "").toLowerCase();
      const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
      return portalName === "backtohouse" && targetMap.includes("bethhouse");
    });
  }

  getSewerPortalPoint(mapManager) {
    return this.getPortalWorldPoint(mapManager, (portal) => {
      const portalName = String(portal.name || "").toLowerCase();
      const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
      return portalName === "sewer" || targetMap.includes("sewer");
    });
  }

  getAliveEnemies() {
    return (this.game.entities || []).filter(
      (e) =>
        e &&
        e.constructor &&
        (e.constructor.name === "Zombie" || e.constructor.name === "BethBoss") &&
        !e.removeFromWorld &&
        e.state !== "death"
    );
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

  getFinalExitPoint(mapManager) {
    if (!mapManager || !Array.isArray(mapManager.finalExits) || mapManager.finalExits.length === 0) return null;
    const exitObj = mapManager.finalExits[0];
    const scale = mapManager.mapScale || 1;
    const tileW = (mapManager.mapData && mapManager.mapData.tilewidth) || 16;
    const tileH = (mapManager.mapData && mapManager.mapData.tileheight) || 16;
    const width = ((exitObj.width || tileW) * scale);
    const height = ((exitObj.height || tileH) * scale);
    return {
      x: (exitObj.x || 0) * scale + width / 2,
      y: (exitObj.y || 0) * scale + height / 2
    };
  }

update() {
  const zDown = !!this.game.keys["z"];
  const zPressed = zDown && !this.prevZDown;
  this.prevZDown = zDown;
  if (zPressed) this.showZombieRadar = !this.showZombieRadar;

  const path = String(this.game.currentMapPath || "").toLowerCase();
  const mapManager = this.getMapManager();
  this.active = true;
  const progress = this.getNonSewerEnemyProgress();
  const mapCleared = progress.alive <= 0 && (progress.total > 0 || !!this.game.bossDefeated);
  const finalExitPoint = this.getFinalExitPoint(mapManager);

  // After clearing the map objective, keep compass guiding the player to the final gate.
  if (!this.game.gameWon && mapCleared && finalExitPoint) {
    this.setTarget(finalExitPoint.x, finalExitPoint.y, "Final Gate");
    return;
  }

  // No guiding arrow on the starting bedroom map.
  if (path.includes("bedroom") || path === "") {
    this.clearTarget();
    return;
  }

  // Objective phase:
  // 1) Before checking Beth's door -> point to Beth's door.
  // 2) After locked door check, before key -> point to sewer (or key when in sewer).
  // 3) After key, before unlock -> point back to Beth's door.
  if (!this.game.hasTriedBethDoor) {
    const bethDoor = this.getBethDoorPoint(mapManager);
    const toMain = this.getPortalToMainForest(mapManager);
    if (bethDoor) {
      this.setTarget(bethDoor.x, bethDoor.y, "Beth's Door");
    } else if (toMain) {
      this.setTarget(toMain.x, toMain.y, "Go Outside");
    } else {
      this.clearTarget();
    }
    return;
  } else {
    if (!this.game.hasSewerKey) {
      if (path.includes("sewer")) {
        const key = this.getKeyPickupWorldPoint();
        if (key) {
          this.setTarget(key.x, key.y, "Beth's Key");
        } else {
          this.clearTarget();
        }
      } else {
        const sewerPortal = this.getSewerPortalPoint(mapManager);
        const toMain = this.getPortalToMainForest(mapManager);
        if (sewerPortal) {
          this.setTarget(sewerPortal.x, sewerPortal.y, "Sewer");
        } else if (toMain) {
          this.setTarget(toMain.x, toMain.y, "Go Outside");
        } else {
          this.clearTarget();
        }
      }
      return;
    }

    if (!this.game.bethDoorUnlocked) {
      const bethDoor = this.getBethDoorPoint(mapManager);
      const toMain = this.getPortalToMainForest(mapManager);
      if (bethDoor) {
        this.setTarget(bethDoor.x, bethDoor.y, "Unlock Beth's Door");
      } else if (toMain) {
        this.setTarget(toMain.x, toMain.y, "Go Outside");
      } else {
        this.clearTarget();
      }
      return;
    }
  }
  this.clearTarget();
}

  draw(ctx) {
    if (!this.active) return;

    const player = this.game.cameraTarget;
    if (!player) return;
    const hasObjectiveTarget = !!this.target;
    const showRadar = !!this.showZombieRadar;
    if (!hasObjectiveTarget && !showRadar) return;

    if (hasObjectiveTarget) {
      const dx = this.target.x - player.x;
      const dy = this.target.y - player.y;
      const angle = Math.atan2(dy, dx);
      const distance = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const compassX = ctx.canvas.width - 86;
      const compassY = 146;
      const compassRadius = 36;

      // Compass body
      ctx.beginPath();
      ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(9, 13, 17, 0.74)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 222, 140, 0.9)";
      ctx.stroke();

      // Inner ring and crosshair
      ctx.beginPath();
      ctx.arc(compassX, compassY, compassRadius * 0.64, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 222, 140, 0.4)";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(compassX - compassRadius + 8, compassY);
      ctx.lineTo(compassX + compassRadius - 8, compassY);
      ctx.moveTo(compassX, compassY - compassRadius + 8);
      ctx.lineTo(compassX, compassY + compassRadius - 8);
      ctx.strokeStyle = "rgba(255, 222, 140, 0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal letters
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 240, 200, 0.95)";
      ctx.fillText("N", compassX, compassY - compassRadius - 9);
      ctx.fillText("E", compassX + compassRadius + 9, compassY);
      ctx.fillText("S", compassX, compassY + compassRadius + 9);
      ctx.fillText("W", compassX - compassRadius - 9, compassY);

      // Rotating objective needle
      ctx.save();
      ctx.translate(compassX, compassY);
      ctx.rotate(angle);
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 5;

      ctx.beginPath();
      ctx.moveTo(compassRadius - 8, 0);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fillStyle = "#ffd166";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#3d2c12";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // Objective label card
      const text = `${this.target.label} (${Math.round(distance)})`;
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textWidth = ctx.measureText(text).width;
      const cardWidth = Math.max(140, textWidth + 20);
      const cardHeight = 22;
      const cardX = compassX - cardWidth / 2;
      const cardY = compassY + compassRadius + 12;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      ctx.strokeStyle = "rgba(255, 230, 167, 0.85)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      ctx.fillStyle = "rgba(255,245,220,0.96)";
      ctx.fillText(text, compassX, cardY + cardHeight / 2);

      ctx.restore();
    }

    if (!showRadar) return;

    const enemies = this.getAliveEnemies();
    if (enemies.length === 0) return;

    const centerX = ctx.canvas.width - 80;
    const centerY = 282;
    const radius = 56;
    const innerRadius = radius - 8;
    const maxDetectDistance = 850;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Outer radar body
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,14,18,0.72)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(153, 231, 255, 0.75)";
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.63, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(153, 231, 255, 0.36)";
    ctx.stroke();

    // Crosshair lines
    ctx.strokeStyle = "rgba(153, 231, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - innerRadius, centerY);
    ctx.lineTo(centerX + innerRadius, centerY);
    ctx.moveTo(centerX, centerY - innerRadius);
    ctx.lineTo(centerX, centerY + innerRadius);
    ctx.stroke();

    // Compass ticks every 45 degrees
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tickOuter = radius + (i % 2 === 0 ? 0 : -2);
      const tickInner = radius - (i % 2 === 0 ? 8 : 5);
      const ox = centerX + Math.cos(a) * tickOuter;
      const oy = centerY + Math.sin(a) * tickOuter;
      const ix = centerX + Math.cos(a) * tickInner;
      const iy = centerY + Math.sin(a) * tickInner;
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.strokeStyle = "rgba(153, 231, 255, 0.65)";
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // Radar sweep
    const sweepAngle = (performance.now() / 1000) * 1.8;
    const sweepWidth = 0.32;
    const sweepGradient = ctx.createRadialGradient(centerX, centerY, 6, centerX, centerY, innerRadius);
    sweepGradient.addColorStop(0, "rgba(130, 255, 226, 0.00)");
    sweepGradient.addColorStop(1, "rgba(130, 255, 226, 0.22)");
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, innerRadius, sweepAngle - sweepWidth, sweepAngle + sweepWidth);
    ctx.closePath();
    ctx.fillStyle = sweepGradient;
    ctx.fill();

    // Cardinal labels
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(220,245,255,0.9)";
    ctx.fillText("N", centerX, centerY - radius - 10);
    ctx.fillText("E", centerX + radius + 10, centerY);
    ctx.fillText("S", centerX, centerY + radius + 10);
    ctx.fillText("W", centerX - radius - 10, centerY);

    // Player center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();

    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(153, 231, 255, 0.95)";
    ctx.fillText(`Z radar: ${enemies.length}`, centerX, centerY + radius + 12);

    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const angle = Math.atan2(dy, dx);
      const distance = Math.hypot(dx, dy);
      const distRatio = Math.min(1, distance / maxDetectDistance);
      const blipRadius = Math.max(5, distRatio * innerRadius);
      const px = centerX + Math.cos(angle) * blipRadius;
      const py = centerY + Math.sin(angle) * blipRadius;

      ctx.save();
      ctx.translate(px, py);
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,95,95,0.95)";
      ctx.fill();

      ctx.strokeStyle = "rgba(18,18,18,0.85)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Small heading marker from center toward blip direction
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-Math.cos(angle) * 4, -Math.sin(angle) * 4);
      ctx.strokeStyle = "rgba(255,130,130,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}