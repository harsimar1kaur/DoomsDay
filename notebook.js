// notebook.js - Objective notebook (toggle with N)
class Notebook {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.prevNDown = false;
    this.hasUnreadUpdate = false;
    this.lastObjectiveSignature = "";

    // Buttons
    this.btnClose = { x: 0, y: 0, w: 120, h: 34 };
  }

  toggle() {
    this.isOpen = !this.isOpen;

    // stop movement instantly when opening
    if (this.isOpen) {
      this.game.keys = {};
      this.hasUnreadUpdate = false;
    }

    this.game.ignoreClicksUntil = performance.now() + 120;
    this.game.click = null;
  }

  pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  getObjectiveSignature() {
    const path = String(this.game.currentMapPath || "").toLowerCase();
    const inBethDownstairs = path.includes("bethhouse");
    const inBethUpstairs = path.includes("bethroom");
    const inBethPhase = inBethDownstairs || inBethUpstairs || !!this.game.visitedBethUpstairs;
    const { total, dead } = this.getEnemyProgress();

    if (path.includes("bedroom") || path === "") {
      return `objective:bedroom:${this.windowChecked() ? 1 : 0}:${this.playerHasWeapon() ? 1 : 0}`;
    }

    if (path.includes("sewer")) {
      const sewer = this.getSewerObjectiveProgress();
      return `objective:sewer:key:${sewer.hasKey ? 1 : 0}:dead:${sewer.dead}:alive:${sewer.alive}:done:${sewer.allDone ? 1 : 0}`;
    }

    if (inBethPhase) {
      return `objective:beth_phase:${inBethUpstairs ? 1 : 0}:${dead}/${total}:boss:${this.game.bossDefeated ? 1 : 0}:escaped:${this.game.bethEscapeComplete ? 1 : 0}`;
    }

    if (this.game.bossDefeated) {
      const totalEnemies =
        this.game.enemyObjectiveTotal ||
        (this.game.enemySpawnIds ? this.game.enemySpawnIds.size : 0);
      const defeated =
        this.game.enemyObjectiveDefeated ||
        (this.game.defeatedEnemyIds ? this.game.defeatedEnemyIds.size : 0);
      return `objective:clear_remaining:${defeated}/${totalEnemies}`;
    }

    if (this.game.hasSewerKey) return "objective:return_beth_house";
    if (this.game.hasTriedBethDoor) return "objective:check_sewer_key";
    return "objective:check_on_beth";
  }

  getAliveZombies(ignoreCount = 0) {
    const ents = this.game.entities || [];
    const alive = ents.filter(
      (e) =>
        e &&
        e.constructor &&
        e.constructor.name === "Zombie" &&
        !e.removeFromWorld &&
        e.state !== "death"
    ).length;

    return Math.max(0, alive - ignoreCount);
  }

  getSewerObjectiveProgress() {
    const REQUIRED_SEWER_KILLS = 3;
    const IGNORED_SEWER_ZOMBIES = 4;

    const alive = this.getAliveZombies(IGNORED_SEWER_ZOMBIES);
    const dead = Math.max(0, REQUIRED_SEWER_KILLS - alive);
    const hasKey = !!this.game.hasSewerKey;
    const zombiesCleared = alive <= 0;
    const allDone = hasKey && zombiesCleared;

    return {
      requiredKills: REQUIRED_SEWER_KILLS,
      ignoredZombies: IGNORED_SEWER_ZOMBIES,
      alive,
      dead,
      hasKey,
      zombiesCleared,
      allDone
    };
  }

  getEnemyProgress() {
    // Global objective counter: include all tracked zombies/boss spawns EXCEPT sewer map spawns.
    const allSpawnIds = this.game.enemySpawnIds instanceof Set
      ? [...this.game.enemySpawnIds]
      : [];
    const defeatedIds = this.game.defeatedEnemyIds instanceof Set
      ? this.game.defeatedEnemyIds
      : new Set();

    const nonSewerSpawnIds = allSpawnIds.filter((id) => !String(id).toLowerCase().includes("sewer"));
    const total = nonSewerSpawnIds.length;

    let dead = 0;
    for (const id of nonSewerSpawnIds) {
      if (defeatedIds.has(id)) dead += 1;
    }

    const alive = Math.max(0, total - dead);
    return { total, dead, alive };
  }

  playerHasWeapon() {
    const player = this.game.cameraTarget;
    if (!player) return false;

    return !!(
      player.equippedWeapon ||
      (player.inventory && (player.inventory.bat || player.inventory.knife))
    );
  }

  windowChecked() {
    return !!this.game.checkedWindow;
  }

  playerNearSewer() {
    const player = this.game.cameraTarget;
    if (!player) return false;

    const sewerX = 3147;
    const sewerY = 3164;

    const dx = sewerX - player.x;
    const dy = sewerY - player.y;

    return Math.sqrt(dx * dx + dy * dy) < 70;
  }

  getObjectives() {
    const path = String(this.game.currentMapPath || "").toLowerCase();
    const inBethDownstairs = path.includes("bethhouse");
    const inBethUpstairs = path.includes("bethroom");
    const inBethPhase = inBethDownstairs || inBethUpstairs || !!this.game.visitedBethUpstairs;
    const upstairsDone = inBethUpstairs || !!this.game.visitedBethUpstairs;
    const { total, dead, alive } = this.getEnemyProgress();

    if (path.includes("bedroom") || path === "") {
      return {
        title: "Notebook",
        lines: [
          "☐ Check the window!!",
          "☐ Grab a weapon from your room."
        ],
        footer: "Finish tasks before leaving."
      };
    }

    if (path.includes("sewer")) {
      const sewer = this.getSewerObjectiveProgress();

      return {
        title: "Notebook",
        lines: [
          `${sewer.hasKey ? "☑" : "☐"} Find the sewer key`,
          `${sewer.zombiesCleared ? "☑" : "☐"} Kill sewer zombies (${sewer.dead}/${sewer.requiredKills})`
        ],
        footer: sewer.allDone
          ? "All sewer objectives complete."
          : "Finish both objectives before leaving."
      };
    }

    if (inBethPhase) {
      if (!upstairsDone) {
        return {
          title: "Notebook",
          lines: ["☐ Go to upstairs"],
          footer: "Head upstairs in Beth's house."
        };
      }

      if (this.game.bossDefeated) {
        return {
          title: "Notebook",
          lines: [
            "☑ Defeat Beth",
            `☐ Kill all remaining zombies (Alive: ${alive})`,
            "☐ Escape through the gate"
          ],
          footer: alive > 0
            ? "Eliminate every remaining zombie, then escape."
            : "All zombies cleared. Follow the compass to the exit gate."
        };
      }

      return {
        title: "Notebook",
        lines: [
          "☑ Go to upstairs",
          `☐ Zombies + Beth: Alive ${alive} | Dead ${dead}/${total}`,
          "☐ Escape through the gate"
        ],
        footer: alive > 0
          ? "Clear all zombies first, then go to the gate."
          : "Area clear. Go to the gate to escape."
      };
    }

    if (this.game.bossDefeated) {
      const totalEnemies =
        this.game.enemyObjectiveTotal ||
        (this.game.enemySpawnIds ? this.game.enemySpawnIds.size : 0);
      const defeated =
        this.game.enemyObjectiveDefeated ||
        (this.game.defeatedEnemyIds ? this.game.defeatedEnemyIds.size : 0);

      if (totalEnemies > 0 && defeated >= totalEnemies) {
        return {
          title: "Notebook",
          lines: [
            `☑ Eliminate Beth and all zombies (${totalEnemies}/${totalEnemies})`,
            "☐ Escape the area"
          ],
          footer: "Area cleared. Find the way out."
        };
      }

      return {
        title: "Notebook",
        lines: [`☐ Eliminate Beth and all zombies (${Math.min(defeated, totalEnemies)}/${totalEnemies})`],
        footer: "Track down every remaining zombie to win."
      };
    }

    let objective = "Check on Beth";
    if (this.game.hasSewerKey) objective = "Return to Beth's house";
    else if (this.game.hasTriedBethDoor) objective = "Check the sewer for the key";

    return {
      title: "Notebook",
      lines: [`☐ ${objective}`],
      footer: "Press N to close."
    };
  }

  update() {
    const currentSignature = this.getObjectiveSignature();

    if (this.lastObjectiveSignature && currentSignature !== this.lastObjectiveSignature) {
      this.hasUnreadUpdate = true;
    }

    this.lastObjectiveSignature = currentSignature;

    const nDown = !!this.game.keys["n"];
    const nPressed = nDown && !this.prevNDown;
    this.prevNDown = nDown;

    if (nPressed && !this.game.gameOver && !this.game.gameWon) {
      this.toggle();
      return;
    }

    if (!this.isOpen) return;

    // While notebook open: freeze gameplay input
    this.game.keys = {};

    if (this.game.click) {
      const c = this.game.click;
      if (this.pointInRect(c, this.btnClose)) this.toggle();
      this.game.click = null;
    }
  }

  draw(ctx) {
    if (!this.isOpen) return;

    const { title, lines, footer } = this.getObjectives();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Dim
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, w, h);

    // Panel
    const panelW = Math.min(560, w - 80);
    const panelH = Math.min(440, h - 80);
    const x = (w - panelW) / 2;
    const y = (h - panelH) / 2;

    ctx.fillStyle = "rgba(245, 240, 225, 0.97)";
    ctx.fillRect(x, y, panelW, panelH);

    ctx.strokeStyle = "rgba(60,40,20,0.9)";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, panelW, panelH);

    // Title
    ctx.fillStyle = "rgba(40,25,10,0.95)";
    ctx.font = "34px Creepster";
    ctx.textAlign = "left";
    ctx.fillText(title, x + 22, y + 52);

    // Text
    ctx.font = "20px Arial";
    let ty = y + 105;
    let index = 0;

    const path = String(this.game.currentMapPath || "").toLowerCase();
    const inBethDownstairs = path.includes("bethhouse");
    const inBethUpstairs = path.includes("bethroom");
    const inBethPhase = inBethDownstairs || inBethUpstairs || !!this.game.visitedBethUpstairs;
    const upstairsDone = inBethUpstairs || !!this.game.visitedBethUpstairs;
    const { alive: bethAlive } = this.getEnemyProgress();

    for (const line of lines) {
      let completed = line.trim().startsWith("☑");

      if (!completed && (path.includes("bedroom") || path === "")) {
        if (index === 0) completed = this.windowChecked();
        if (index === 1) completed = this.playerHasWeapon();
      } else if (!completed && path.includes("sewer")) {
        const sewer = this.getSewerObjectiveProgress();
        if (index === 0) completed = sewer.hasKey;
        if (index === 1) completed = sewer.zombiesCleared;
      } else if (!completed && inBethPhase) {
        if (this.game.bossDefeated) {
          if (index === 0) completed = true;
          if (index === 1) completed = bethAlive <= 0;
          if (index === 2) completed = !!this.game.bethEscapeComplete;
        } else {
          if (index === 0) completed = upstairsDone;
          if (index === 1) completed = bethAlive <= 0;
          if (index === 2) completed = !!this.game.bethEscapeComplete;
        }
      }

      const text = completed ? line.replace("☐", "☑") : line;

      ctx.fillStyle = "rgba(40,25,10,0.95)";
      ctx.fillText(text, x + 28, ty);

      if (completed) {
        const width = ctx.measureText(text).width;
        ctx.beginPath();
        ctx.moveTo(x + 28, ty - 8);
        ctx.lineTo(x + 28 + width, ty - 8);
        ctx.strokeStyle = "rgba(40,25,10,0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ty += 34;
      index++;
    }

    // Footer
    ctx.font = "16px Arial";
    ctx.globalAlpha = 0.8;
    ctx.fillText(footer, x + 28, y + panelH - 22);
    ctx.globalAlpha = 1;

    // Close button
    this.btnClose.x = x + panelW - 140;
    this.btnClose.y = y + 18;

    ctx.fillStyle = "rgba(20,20,20,0.85)";
    ctx.fillRect(this.btnClose.x, this.btnClose.y, this.btnClose.w, this.btnClose.h);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.btnClose.x, this.btnClose.y, this.btnClose.w, this.btnClose.h);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Close", this.btnClose.x + this.btnClose.w / 2, this.btnClose.y + 23);

    ctx.restore();
  }
}