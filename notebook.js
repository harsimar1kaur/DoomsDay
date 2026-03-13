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
    if (path.includes("bedroom") || path === "") {
      return `objective:bedroom:${this.windowChecked() ? 1 : 0}:${this.playerHasWeapon() ? 1 : 0}`;
    }
    if (this.game.bossDefeated) {
      const alive = this.getAliveZombies();
      const total = this.game.zombieObjectiveTotal || alive;
      return `objective:clear_remaining:${alive}/${total}`;
    }
    if (this.game.hasSewerKey) return "objective:return_beth_house";
    if (this.game.hasTriedBethDoor) return "objective:check_sewer_key";
    return "objective:check_on_beth";
}

  // Count living zombies (ignore dead/corpse ones)
  getAliveZombies() {
    const ents = this.game.entities || [];
    return ents.filter(e =>
      e &&
      e.constructor &&
      e.constructor.name === "Zombie" &&
      !e.removeFromWorld &&
      e.state !== "death"
    ).length;
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

    if (this.game.bossDefeated) {
      const alive = this.getAliveZombies();
      const total = Math.max(this.game.zombieObjectiveTotal || 0, alive);
      this.game.zombieObjectiveTotal = total;

      if (alive <= 0) {
        return {
          title: "Notebook",
          lines: ["☑ Kill all remaining zombies in the area (0/0)", "☐ Escape the area"],
          footer: "Area cleared. Find the way out."
        };
      }

      return {
        title: "Notebook",
        lines: [`☐ Kill all remaining zombies in the area (${alive}/${total})`],
        footer: "Clear them all to escape."
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

    for (const line of lines) {
      let completed = line.trim().startsWith("☑");
      if (!completed && (path.includes("bedroom") || path === "")) {
        if (index === 0) completed = this.windowChecked();
        if (index === 1) completed = this.playerHasWeapon();
      }

      const text = completed ? line.replace("☐", "☑") : line;

      ctx.fillStyle = "rgba(40,25,10,0.95)";
      ctx.fillText(text, x + 28, ty);

      // draw strike-through if completed
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