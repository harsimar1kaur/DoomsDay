// Simple start screen with a START button.
class TitleScreen {
  constructor(game, onStart) {
    this.game = game;
    this.onStart = onStart; // callback
    this.showInstructions = false;

    // Start button
    this.x = 200;
    this.y = 320;
    this.w = 240;
    this.h = 80;

    // Instructions button
    this.instructionsX = 200;
    this.instructionsY = 420;
    this.instructionsW = 240;
    this.instructionsH = 80;

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

    // Background title
    ctx.fillStyle = "#134b09";
    ctx.font = "96px Creepster";
    ctx.textAlign = "center";
    ctx.fillText("DOOMSDAY", ctx.canvas.width / 2, 170);

    // Instructions screen
    if (this.showInstructions) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(40, 80, ctx.canvas.width - 80, ctx.canvas.height - 160);

      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 80, ctx.canvas.width - 80, ctx.canvas.height - 160);

      ctx.fillStyle = "#b9ff9e";
      ctx.font = "42px Creepster";
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
    ctx.fillStyle = "#0b1b0a";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "#b9ff9e";
    ctx.font = "48px Creepster";
    ctx.fillText("START", this.x + this.w / 2, this.y + 55);

    // INSTRUCTIONS button
    ctx.fillStyle = "#0b1b0a";
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
    ctx.font = "34px Creepster";
    ctx.fillText(
      "INSTRUCTIONS",
      this.instructionsX + this.instructionsW / 2,
      this.instructionsY + 52
    );
  }
}