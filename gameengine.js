// Main game loop + input + camera manager.
class GameEngine {
    constructor(options) {
        this.ctx = null;

        
        this.entities = [];
        this.levelHadZombies = false;

        this.click = null;
        this.mouse = null;
        this.wheel = null;
        this.rightclick = null;
        this.keys = {};

        this.options = options || {
            debugging: false,
            cameraDebug: false,
        };
        this.debug = !!this.options.debugging;
        this.debugWeapon = false;

        // Camera tracks a target entity in world space.
        this.camera = { x: 0, y: 0 };
        this.cameraTarget = null;

        // Active dialog bubble shown above the player.
        this.activeDialog = null;
        this.pendingTeleport = null;

        this.paused = false;
        this.gameOver = false;
        this.gameWon = false;
        this.collectedItems = new Set();
        this.restart = null;

        this.zombiesEnabled = false;
        this.zombieSpritePath = "./sprites/zombie/zombie.png";
        this.onMapChanged = null;

        this.uiMargin = 14;
        this.uiButtonWidth = 110;
        this.uiButtonHeight = 28;

        // Prevents the "need to click twice" issue after restarting / UI clicks.
        this.ignoreClicksUntil = 0;
    }

    init(ctx) {
        this.ctx = ctx;
        // World size defaults to the canvas until a map sets it.
        this.worldWidth = this.ctx.canvas.width;
        this.worldHeight = this.ctx.canvas.height;
        this.startInput();
        this.timer = new Timer();
    }

    start() {
        this.running = true;
        const gameLoop = () => {
            this.loop();
            requestAnimFrame(gameLoop, this.ctx.canvas);
        };
        gameLoop();
    }

    winGame() {
        if (this.gameOver || this.gameWon) return;
        this.gameWon = true;
        this.paused = false;
        this.keys = {};
        this.showDialogue("ZOMBIES CLEARED!", 2500);
    }

    doRestart() {
        // Block any leftover click for a short moment (prevents double-trigger / "click twice")
        this.ignoreClicksUntil = performance.now() + 150;

        // Clear any existing click right away
        this.click = null;
        this.rightclick = null;
        this.wheel = null;

        // Reset engine state
        this.paused = false;
        this.gameOver = false;
        this.gameWon = false;

        this.activeDialog = null;
        this.keys = {};

        // Optional: reset camera (safe)
        this.camera.x = 0;
        this.camera.y = 0;

        if (this.restart) this.restart();
        this.levelHadZombies = false;

    }

    startInput() {
        const getXandY = e => ({
            x: e.clientX - this.ctx.canvas.getBoundingClientRect().left,
            y: e.clientY - this.ctx.canvas.getBoundingClientRect().top
        });

        this.ctx.canvas.addEventListener("mousemove", e => {
            if (this.options.debugging) {
                console.log("MOUSE_MOVE", getXandY(e));
            }
            this.mouse = getXandY(e);
        });

        this.ctx.canvas.addEventListener("click", e => {
            if (this.options.debugging) {
                console.log("CLICK", getXandY(e));
            }
            this.click = getXandY(e);
        });

        this.ctx.canvas.addEventListener("wheel", e => {
            if (this.options.debugging) {
                console.log("WHEEL", getXandY(e), e.wheelDelta);
            }
            e.preventDefault();
            this.wheel = e;
        });

        this.ctx.canvas.addEventListener("contextmenu", e => {
            if (this.options.debugging) {
                console.log("RIGHT_CLICK", getXandY(e));
            }
            e.preventDefault();
            this.rightclick = getXandY(e);
        });

        window.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();

            // Pause/Resume (disabled when won/over)
            if ((key === "p" || key === "escape") && !this.gameOver && !this.gameWon) {
                this.togglePause();
                return;
            }

            // Restart from pause/gameover/win
            if ((this.paused || this.gameOver || this.gameWon) && key === "r") {
                this.doRestart();
                return;
            }

            // Freeze input when paused/ended
            if (this.paused || this.gameOver || this.gameWon) return;

            this.keys[key] = true;
        });

        window.addEventListener("keyup", (event) => {
            this.keys[event.key.toLowerCase()] = false;
        });
    }

    addEntity(entity) {
        this.entities.push(entity);

        if (entity && entity.constructor && entity.constructor.name === "Zombie") {
            this.levelHadZombies = true;
        }
    }


    loop() {
        const delta = this.timer.tick();
        this.clockTick = (this.paused || this.gameOver || this.gameWon) ? 0 : delta;

        this.update();

        if (!this.paused && !this.gameOver && !this.gameWon) {
            this.updateCamera();
        }

        this.draw();
    }

    update() {
        this.handleTopRightUiClick();
        if (this.paused || this.gameOver || this.gameWon) return;

        // Dialog timer
        if (this.activeDialog && this.activeDialog.timeLeftMs > 0) {
            this.activeDialog.timeLeftMs -= this.clockTick * 1000;
            if (this.activeDialog.timeLeftMs <= 0) {
                this.activeDialog = null;
            }
        }

        // Update entities
        const entitiesCount = this.entities.length;
        for (let i = 0; i < entitiesCount; i++) {
            const entity = this.entities[i];
            if (!entity.removeFromWorld) {
                entity.update();
            }
        }

        // Remove entities
        for (let i = this.entities.length - 1; i >= 0; --i) {
            if (this.entities[i].removeFromWorld) {
                this.entities.splice(i, 1);
            }
        }

        const zombiesLeft = this.entities.filter(
        e =>
            e &&
            e.constructor &&
            (e.constructor.name === "Zombie" || e.constructor.name === "BethBoss")
        ).length;

        if (this.zombiesEnabled && this.levelHadZombies && zombiesLeft === 0) {
        this.winGame();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Render world using camera offset.
        this.ctx.save();
        const camX = Math.round(this.camera.x);
        const camY = Math.round(this.camera.y);
        this.ctx.translate(-camX, -camY);

        for (let i = this.entities.length - 1; i >= 0; i--) {
            this.entities[i].draw(this.ctx, this);
        }
        this.ctx.restore();

        // Simple camera debug overlay.
        if (this.options.cameraDebug) {
            this.ctx.save();
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            this.ctx.fillRect(8, 8, 300, 70);
            this.ctx.fillStyle = "#b9ff9e";
            this.ctx.font = "12px monospace";
            const target = this.cameraTarget;
            const targetX = target ? Math.round(target.x) : "n/a";
            const targetY = target ? Math.round(target.y) : "n/a";
            this.ctx.fillText(`Player: ${targetX}, ${targetY}`, 16, 28);

            this.ctx.fillText(
                `Camera: ${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`, 16, 44
            );

            this.ctx.fillText(`World: ${this.worldWidth} x ${this.worldHeight}`, 16, 60);
            this.ctx.restore();
        }

        this.drawHealthBar();
        this.drawPauseOverlay();
        this.drawTopRightControls();
    }

    togglePause() {
        if (this.gameOver || this.gameWon) return;
        this.paused = !this.paused;
        if (this.paused) this.keys = {};
    }

    showDialogue(text, durationMs = 5000) {
        this.activeDialog = { text, timeLeftMs: durationMs };
    }

    getTopRightControlRects() {
        const canvasWidth = this.ctx.canvas.width;
        const x = canvasWidth - this.uiButtonWidth - this.uiMargin;
        const y = this.uiMargin;
        return {
            pause: { x, y, width: this.uiButtonWidth, height: this.uiButtonHeight },
            restart: { x, y: y + this.uiButtonHeight + 8, width: this.uiButtonWidth, height: this.uiButtonHeight }
        };
    }

    pointInRect(p, r) {
        return (
            p.x >= r.x &&
            p.x <= r.x + r.width &&
            p.y >= r.y &&
            p.y <= r.y + r.height
        );
    }

handleTopRightUiClick() {
  if (!this.click || !this.ctx) return;

  if (performance.now() < this.ignoreClicksUntil) {
    this.click = null;
    return;
  }

  const click = this.click; // DON'T clear it yet

  const rects = this.getTopRightControlRects();

  if (this.pointInRect(click, rects.pause)) {
    this.click = null; // consume only if used
    this.togglePause();
    return;
  }

  if (this.pointInRect(click, rects.restart)) {
    this.click = null; // consume only if used
    this.doRestart();
    return;
  }
}

    drawTopRightControls() {
        if (!this.ctx) return;

        const rects = this.getTopRightControlRects();
        const pauseLabel = this.paused ? "Resume" : "Pause";

        this.ctx.save();
        this.ctx.font = "14px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const drawButton = (r, label) => {
            this.ctx.fillStyle = "rgba(0,0,0,0.65)";
            this.ctx.fillRect(r.x, r.y, r.width, r.height);
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(r.x, r.y, r.width, r.height);
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fillText(label, r.x + r.width / 2, r.y + r.height / 2);
        };

        drawButton(rects.pause, pauseLabel);
        drawButton(rects.restart, "Restart");
        this.ctx.font = "12px monospace";
        this.ctx.fillStyle = "rgba(255,255,255,0.85)";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "top";

        const centerX = rects.restart.x + rects.restart.width / 2;
        const firstY = rects.restart.y + rects.restart.height + 6;

        this.ctx.fillText("Press N: Notebook", centerX, firstY);

        const hintOn = this.hintArrow && this.hintArrow.active;
        const notebookHasUpdate = this.notebook && this.notebook.hasUnreadUpdate;
        const flashOn = Math.floor(performance.now() / 300) % 2 === 0;

        if (notebookHasUpdate) {
        this.ctx.fillStyle = flashOn ? "#ffd54f" : "#ffffff";
        } else {
        this.ctx.fillStyle = "rgba(255,255,255,0.85)";
        }

        this.ctx.fillText("Press N: Notebook", centerX, firstY);
        this.ctx.fillText("Press C: Compass", centerX, firstY + 16);
        this.ctx.fillText(`${hintOn ? "ON" : "OFF"}`, centerX, firstY + 32);

        this.ctx.restore();
    }

    drawHealthBar() {
        const player = this.cameraTarget;
        if (!player || typeof player.health !== "number" || typeof player.maxHealth !== "number") return;

        const x = 20;
        const width = 220;
        const height = 16;
        const y = this.ctx.canvas.height - 30;
        const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 0;

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = "rgba(0,0,0,0.6)";
        this.ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
        this.ctx.fillStyle = "#7a1111";
        this.ctx.fillRect(x, y, width, height);
        this.ctx.fillStyle = "#47c55f";
        this.ctx.fillRect(x, y, Math.max(0, width * ratio), height);
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "12px monospace";
        this.ctx.fillText(`HP: ${Math.ceil(player.health)} / ${player.maxHealth}`, x, y - 6);

        if (this.debug) {
            const zombies = this.entities.filter((e) => e && e.constructor && e.constructor.name === "Zombie");
            let nearest = "n/a";
            if (zombies.length > 0) {
                let min = Infinity;
                for (const z of zombies) {
                    const dx = player.x - z.x;
                    const dy = player.y - z.y;
                    min = Math.min(min, Math.hypot(dx, dy));
                }
                nearest = min.toFixed(1);
            }
            const zombieAssetPath = this.zombieSpritePath || "./sprites/zombie/zombie.png";
            const zombieAsset = ASSET_MANAGER.getAsset(zombieAssetPath);
            const zombieAssetLoaded = !!(zombieAsset && zombieAsset.complete && zombieAsset.naturalWidth > 0);
            this.ctx.fillText(`Zombies: ${zombies.length}`, x, y - 22);
            this.ctx.fillText(`Nearest: ${nearest}`, x + 110, y - 22);
            this.ctx.fillText(`Zombie asset loaded: ${zombieAssetLoaded}`, x, y - 38);
            this.ctx.fillText(`Zombie asset path: ${zombieAssetPath}`, x, y - 54);
        }
        if (this.debugWeapon && player.weaponDebugState) {
            const ws = player.weaponDebugState;
            this.ctx.fillStyle = "#ffe8a3";
            this.ctx.fillText(`Weapon: ${player.equippedWeapon || "none"}`, x, y - 70);
            this.ctx.fillText(`Attacking: ${ws.attacking ? "true" : "false"}`, x + 145, y - 70);
            this.ctx.fillText(`AttackTimer: ${Number((ws.attackTimer || 0).toFixed(2))}`, x, y - 86);
            this.ctx.fillText(`Facing: ${ws.facingDirection || "n/a"}`, x + 145, y - 86);
            this.ctx.fillText(`SwingFrame: ${ws.swingFrameIndex || 0}`, x, y - 102);
        }
        this.ctx.restore();
    }

    drawPauseOverlay() {
        if (!this.paused && !this.gameOver && !this.gameWon) return;

        this.ctx.save();
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = "center";
        this.ctx.font = "30px Creepster";

        const title = this.gameOver ? "GAME OVER" : (this.gameWon ? "YOU WIN!" : "PAUSED");
        this.ctx.fillText(title, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 - 20);

        this.ctx.font = "16px monospace";
        if (!this.gameOver && !this.gameWon) {
            this.ctx.fillText("Press P or ESC to Resume", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 + 16);
        }
        this.ctx.fillText("Press R to Restart", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 + 40);
        this.ctx.restore();
    }

    updateCamera() {
        // Center the camera on the target, then clamp to map bounds.
        if (!this.cameraTarget) return;

        const canvasWidth = this.ctx.canvas.width;
        const canvasHeight = this.ctx.canvas.height;
        const target = this.cameraTarget;
        const targetCenterX = target.x + (target.width ? target.width / 2 : 0);
        const targetCenterY = target.y + (target.height ? target.height / 2 : 0);

        const camX = targetCenterX - canvasWidth / 2;
        const camY = targetCenterY - canvasHeight / 2;

        const maxX = Math.max(0, (this.worldWidth || canvasWidth) - canvasWidth);
        const maxY = Math.max(0, (this.worldHeight || canvasHeight) - canvasHeight);

        this.camera.x = Math.max(0, Math.min(maxX, camX));
        this.camera.y = Math.max(0, Math.min(maxY, camY));
    }
}