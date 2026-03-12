// Simple start screen with a START button.
class TitleScreen {
  constructor(game, onStart) {
    this.game = game;
    this.onStart = onStart; // callback
    this.showInstructions = false;

    this.backgroundPath = "./sprites/ui/title-bg.png";

    // Button sizes
    this.w = 200;
    this.h = 60;
    this.instructionsW = 200;
    this.instructionsH = 60;

    // Initial values (real positions get set in draw)
    this.x = 40;
    this.y = 0;
    this.instructionsX = 40;
    this.instructionsY = 0;

    this.removeFromWorld = false;
  }

  update() {
    if (this.game.click) {
      const c = this.game.click;

      // If instructions screen is open, click anywhere to go back
      if (this.showInstructions) {
        this.showInstructions = false;
        this.game.click = null;
        return;
      }

      const insideStart =
        c.x >= this.x &&
        c.x <= this.x + this.w &&
        c.y >= this.y &&
        c.y <= this.y + this.h;

      const insideInstructions =
        c.x >= this.instructionsX &&
        c.x <= this.instructionsX + this.instructionsW &&
        c.y >= this.instructionsY &&
        c.y <= this.instructionsY + this.instructionsH;

      if (insideStart) {
        console.log("START CLICKED");

        if (typeof this.onStart === "function") {
          this.onStart();
        }

        this.removeFromWorld = true;
      } else if (insideInstructions) {
        this.showInstructions = true;
      }

      this.game.click = null;
    }
  }

  draw(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Bottom-left positioning
    this.x = 40;
    this.y = ctx.canvas.height - 180;

    this.instructionsX = 40;
    this.instructionsY = ctx.canvas.height - 90;

    const mouse = this.game.mouse;
    const hoverStart = mouse &&
      mouse.x >= this.x &&
      mouse.x <= this.x + this.w &&
      mouse.y >= this.y &&
      mouse.y <= this.y + this.h;

    const hoverInstructions = mouse &&
      mouse.x >= this.instructionsX &&
      mouse.x <= this.instructionsX + this.instructionsW &&
      mouse.y >= this.instructionsY &&
      mouse.y <= this.instructionsY + this.instructionsH;

    const bg = ASSET_MANAGER.getAsset(this.backgroundPath);
    const bgReady = !!(bg && bg.complete && bg.naturalWidth > 0);

    // Background image
    if (bgReady) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;

      const canvasW = ctx.canvas.width;
      const canvasH = ctx.canvas.height;
      const imgW = bg.width;
      const imgH = bg.height;

      const scale = Math.max(canvasW / imgW, canvasH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = (canvasW - drawW) / 2;
      const drawY = (canvasH - drawH) / 2;

      ctx.drawImage(bg, drawX, drawY, drawW, drawH);
      ctx.restore();

      // dark overlay so buttons/text are readable
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      // fallback if image fails to load
      ctx.fillStyle = "#101010";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // Instructions screen
    if (this.showInstructions) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(40, 80, ctx.canvas.width - 80, ctx.canvas.height - 160);

      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 80, ctx.canvas.width - 80, ctx.canvas.height - 160);

      ctx.fillStyle = "#b9ff9e";
      ctx.font = "42px Creepster";
      ctx.textAlign = "center";
      ctx.fillText("Instructions", ctx.canvas.width / 2, 140);

      ctx.fillStyle = "white";
      ctx.font = "24px Arial";

      ctx.fillText("W A S D  - Movement", ctx.canvas.width / 2, 220);
      ctx.fillText("C  - Toggle Compass", ctx.canvas.width / 2, 270);
      ctx.fillText("N  - View Objectives", ctx.canvas.width / 2, 320);
      ctx.fillText("SPACE  - Attack", ctx.canvas.width / 2, 370);
      ctx.fillText("Walk over items to pick them up", ctx.canvas.width / 2, 420);

      ctx.font = "18px Arial";
      ctx.fillStyle = "#b9ff9e";
      ctx.fillText("Click anywhere to return", ctx.canvas.width / 2, 500);

      return;
    }

    // START button
    ctx.fillStyle = hoverStart ? "rgba(30, 70, 25, 0.95)" : "rgba(11, 27, 10, 0.88)";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "#b9ff9e";
    ctx.font = "36px Creepster";
    ctx.textAlign = "center";
    ctx.fillText("START", this.x + this.w / 2, this.y + 40);

    // INSTRUCTIONS button
    ctx.fillStyle = hoverInstructions ? "rgba(30, 70, 25, 0.95)" : "rgba(11, 27, 10, 0.88)";
    ctx.fillRect(
      this.instructionsX,
      this.instructionsY,
      this.instructionsW,
      this.instructionsH
    );

    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      this.instructionsX,
      this.instructionsY,
      this.instructionsW,
      this.instructionsH
    );

    ctx.fillStyle = "#b9ff9e";
    ctx.font = "26px Creepster";
    ctx.fillText(
      "INSTRUCTIONS",
      this.instructionsX + this.instructionsW / 2,
      this.instructionsY + 38
    );
  }
}