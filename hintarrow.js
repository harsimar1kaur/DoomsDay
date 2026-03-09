class HintArrow {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.target = null;
    this.prevHDown = false;
  }

  setTarget(x, y, label = "Objective") {
    this.target = { x, y, label };
  }

  clearTarget() {
    this.target = null;
    this.active = false;
  }

  update() {
    const path = String(this.game.currentMapPath || "").toLowerCase();

    if (path.includes("mainforest")) {
      this.setTarget(2942, 3682, "Sewer Cover");
    } else {
      this.clearTarget();
    }

    const cDown = !!this.game.keys["c"];
    const cPressed = cDown && !this.prevCDown;
    this.prevCDown = cDown;

    if (cPressed && this.target && !this.game.gameOver && !this.game.gameWon) {
      this.active = !this.active;
    }
  }

  draw(ctx) {
    if (!this.active || !this.target) return;

    const player = this.game.cameraTarget;
    if (!player) return;

    const dx = this.target.x - player.x;
    const dy = this.target.y - player.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const arrowX = ctx.canvas.width - 70;
    const arrowY = 140;

    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.scale(1.3, 1.3);
   // prettier arrow
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // main body
    ctx.beginPath();
    ctx.moveTo(26, 0);      // tip
    ctx.lineTo(-8, -12);    // upper inner
    ctx.lineTo(-2, 0);      // center notch
    ctx.lineTo(-8, 12);     // lower inner
    ctx.closePath();

    ctx.fillStyle = "#f4d03f";   // gold
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2b1b0f"; // dark brown outline
    ctx.stroke();

    // inner highlight
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-4, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-4, 6);
    ctx.closePath();

    ctx.fillStyle = "#fff3a6";
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 3;

    const text = `${this.target.label} (${Math.round(distance)})`;
    const labelX = arrowX;
    const labelY = arrowY + 28;

    ctx.strokeText(text, labelX, labelY);
    ctx.fillText(text, labelX, labelY);

    ctx.restore();
  }
}