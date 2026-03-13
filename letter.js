class Letter {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.promptOpen = false;
    this.prevLDown = false;

    this.btnClose = { x: 0, y: 0, w: 120, h: 34 };
    this.btnOkay = { x: 0, y: 0, w: 120, h: 40 };

    this.lines = [
      "Jack,",
      "If you're reading this, then I didn't make it.",
      "I am leaving this note in my pocket",
      "I was bitten while trying to lock the main city gate.",
      "I couldn't let them reach the rest of the city.",
      "",
      "I left the main gate key here.",
      "Do not open the gate unless every zombie is dead.",
      "If even one of them gets through, then everything I did was for nothing.",
      "",
      "If I turned before you got here, don't hesitate.",
      "I'm sorry.",
      "",
      "- Beth"
    ];
  }

  showPrompt() {
    if (this.isOpen || this.promptOpen) return;
    this.promptOpen = true;
    this.game.keys = {};
    this.game.click = null;
  }

  open() {
    this.isOpen = true;
    this.promptOpen = false;
    this.game.keys = {};
    this.game.click = null;
  }

  close() {
    this.isOpen = false;
    this.game.bethLetterRead = true;
    this.game.click = null;
  }

  pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  update() {
    if (!this.isOpen && !this.promptOpen) return;

    this.game.keys = {};

    if (this.promptOpen) {
      if (this.game.click) {
        const c = this.game.click;
        if (this.pointInRect(c, this.btnOkay)) {
          this.open();
        }
        this.game.click = null;
      }
      return;
    }

    if (this.game.click) {
      const c = this.game.click;
      if (this.pointInRect(c, this.btnClose)) {
        this.close();
      }
      this.game.click = null;
    }
  }

  draw(ctx) {
    if (!this.isOpen && !this.promptOpen) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, w, h);

    if (this.promptOpen) {
      const panelW = Math.min(500, w - 80);
      const panelH = 220;
      const x = (w - panelW) / 2;
      const y = (h - panelH) / 2;

      ctx.fillStyle = "rgba(245, 240, 225, 0.98)";
      ctx.fillRect(x, y, panelW, panelH);

      ctx.strokeStyle = "rgba(60,40,20,0.95)";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, panelW, panelH);

      ctx.fillStyle = "rgba(40,25,10,0.95)";
      ctx.font = "34px Creepster";
      ctx.textAlign = "center";
      ctx.fillText("Beth's Table", w / 2, y + 58);

      ctx.font = "20px Arial";
      ctx.fillText("Click OK to read her note.", w / 2, y + 112);

      this.btnOkay.x = w / 2 - this.btnOkay.w / 2;
      this.btnOkay.y = y + panelH - 64;

      ctx.fillStyle = "rgba(20,20,20,0.88)";
      ctx.fillRect(this.btnOkay.x, this.btnOkay.y, this.btnOkay.w, this.btnOkay.h);

      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.btnOkay.x, this.btnOkay.y, this.btnOkay.w, this.btnOkay.h);

      ctx.fillStyle = "white";
      ctx.font = "18px Arial";
      ctx.fillText("OK", this.btnOkay.x + this.btnOkay.w / 2, this.btnOkay.y + 26);

      ctx.restore();
      return;
    }

    const panelW = Math.min(620, w - 60);
    const panelH = Math.min(520, h - 60);
    const x = (w - panelW) / 2;
    const y = (h - panelH) / 2;

    ctx.fillStyle = "rgba(245, 240, 225, 0.98)";
    ctx.fillRect(x, y, panelW, panelH);

    ctx.strokeStyle = "rgba(60,40,20,0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, panelW, panelH);

    ctx.fillStyle = "rgba(40,25,10,0.95)";
    ctx.font = "34px Creepster";
    ctx.textAlign = "left";
    ctx.fillText("Beth's Letter", x + 22, y + 48);

    ctx.font = "20px Arial";
    let ty = y + 95;
    for (const line of this.lines) {
      ctx.fillText(line, x + 28, ty);
      ty += 28;
    }

    this.btnClose.x = x + panelW - 140;
    this.btnClose.y = y + 16;

    ctx.fillStyle = "rgba(20,20,20,0.85)";
    ctx.fillRect(this.btnClose.x, this.btnClose.y, this.btnClose.w, this.btnClose.h);

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.btnClose.x, this.btnClose.y, this.btnClose.w, this.btnClose.h);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Close", this.btnClose.x + this.btnClose.w / 2, this.btnClose.y + 23);

    ctx.restore();
  }
}