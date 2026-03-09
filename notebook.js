// notebook.js - Objective notebook (toggle with N)
class Notebook {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.prevNDown = false;

    // Buttons
    this.btnClose = { x: 0, y: 0, w: 120, h: 34 };
  }

  toggle() {
    this.isOpen = !this.isOpen;

    // stop movement instantly when opening
    if (this.isOpen) this.game.keys = {};

    this.game.ignoreClicksUntil = performance.now() + 120;
    this.game.click = null;
  }

  pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
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

  getObjectives() {
    const path = String(this.game.currentMapPath || "").toLowerCase();

    // Bedroom objectives
    if (path.includes("bedroom") || path === "") {
      return {
        title: "Notebook",
        lines: [
          "☐ Check why your window is broken.",
          "☐ Find a weapon in your room.",
          "☐ Leave the bedroom when you are ready."
        ],
        footer: "Press N to close."
      };
    }

    // Mainforest objectives
    if (path.includes("mainforest")) {
      const alive = this.getAliveZombies();
      return {
        title: "Notebook",
        lines: [
          `☐ Kill the three zombies near you. (${alive} remaining)`,
          "☐ Reach the sewer cover."
        ],
        footer: "Press N to close."
      };
    }

    // Fallback for any other maps
    return {
      title: "Tasks",
      lines: [
        "☐ Explore the area.",
        "☐ Look for supplies."
      ],
      footer: "Press N to close."
    };
  }

  update() {
    // Toggle with N (press once)
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
    for (const line of lines) {
      ctx.fillText(line, x + 28, ty);
      ty += 34;
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