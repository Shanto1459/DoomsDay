// Main game loop + input + camera manager.
class GameEngine {
    constructor(options) {
        
        this.ctx = null;

        this.entities = [];

        this.click = null;
        this.mouse = null;
        this.wheel = null;
        this.keys = {};

        this.options = options || {
            debugging: false,
            cameraDebug: false,
        };
        this.debug = !!this.options.debugging;

        // Camera tracks a target entity in world space.
        this.camera = { x: 0, y: 0 };
        this.cameraTarget = null;
        // Active dialog bubble shown above the player.
        this.activeDialog = null;
        this.paused = false;
        this.gameOver = false;
        this.gameWon = false;
        this.restart = null;
        this.zombiesEnabled = false;
        this.zombieSpritePath = "./sprites/zombie/zombie.png";
        this.onMapChanged = null;
        this.uiMargin = 14;
        this.uiButtonWidth = 110;
        this.uiButtonHeight = 28;

        // Stats tracking
        this.zombiesKilled = 0;
        this.timeSurvived = 0;

        // For animated overlays
        this._overlayAnimTime = 0;
    };

    init(ctx) {
        this.ctx = ctx;
        // World size defaults to the canvas until a map sets it.
        this.worldWidth = this.ctx.canvas.width;
        this.worldHeight = this.ctx.canvas.height;
        this.startInput();
        this.timer = new Timer();
    };

    start() {
        this.running = true;
        const gameLoop = () => {
            this.loop();
            requestAnimFrame(gameLoop, this.ctx.canvas);
        };
        gameLoop();
    };

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

            if (key === "p" || key === "escape") {
                this.togglePause();
                return;
            }

            if ((this.paused || this.gameOver || this.gameWon) && key === "r") {
                if (this.restart) this.restart();
                return;
            }

            if (this.paused || this.gameOver || this.gameWon) return;
            this.keys[key] = true;
        });

        window.addEventListener("keyup", (event) => {
            this.keys[event.key.toLowerCase()] = false;
        });

    };

    addEntity(entity) {
        this.entities.push(entity);
    };

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
            const targetX = target ? target.x.toFixed(1) : "n/a";
            const targetY = target ? target.y.toFixed(1) : "n/a";
            this.ctx.fillText(`Player: ${targetX}, ${targetY}`, 16, 28);
            this.ctx.fillText(`Camera: ${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}`, 16, 44);
            this.ctx.fillText(`World: ${this.worldWidth} x ${this.worldHeight}`, 16, 60);
            this.ctx.restore();
        }

        this.drawHealthBar();
        this.drawPauseOverlay();
        this.drawTopRightControls();
    };

    update() {
        this.handleTopRightUiClick();
        if (this.paused || this.gameOver || this.gameWon) return;

        // Track time survived
        this.timeSurvived += this.clockTick;

        if (this.activeDialog && this.activeDialog.timeLeftMs > 0) {
            this.activeDialog.timeLeftMs -= this.clockTick * 1000;
            if (this.activeDialog.timeLeftMs <= 0) {
                this.activeDialog = null;
            }
        }

        let entitiesCount = this.entities.length;

        for (let i = 0; i < entitiesCount; i++) {
            let entity = this.entities[i];

            if (!entity.removeFromWorld) {
                entity.update();
            }
        }

        for (let i = this.entities.length - 1; i >= 0; --i) {
            if (this.entities[i].removeFromWorld) {
                // Count zombie kills
                if (this.entities[i].constructor && this.entities[i].constructor.name === "Zombie") {
                    this.zombiesKilled++;
                }
                this.entities.splice(i, 1);
            }
        }
    };

    loop() {
        const delta = this.timer.tick();
        this.clockTick = (this.paused || this.gameOver || this.gameWon) ? 0 : delta;

        // Advance overlay animation even when paused/gameover/won
        if (this.gameOver || this.gameWon) {
            this._overlayAnimTime += delta;
        } else {
            this._overlayAnimTime = 0;
        }

        this.update();
        if (!this.paused && !this.gameOver && !this.gameWon) {
            this.updateCamera();
        }
        this.draw();
    };

    togglePause() {
        if (this.gameOver || this.gameWon) return;
        this.paused = !this.paused;
        if (this.paused) this.keys = {};
    };

    showDialogue(text, durationMs = 5000) {
        this.activeDialog = { text, timeLeftMs: durationMs };
    };

    getTopRightControlRects() {
        const canvasWidth = this.ctx.canvas.width;
        const x = canvasWidth - this.uiButtonWidth - this.uiMargin;
        const y = this.uiMargin;
        return {
            pause: {
                x,
                y,
                width: this.uiButtonWidth,
                height: this.uiButtonHeight
            },
            restart: {
                x,
                y: y + this.uiButtonHeight + 8,
                width: this.uiButtonWidth,
                height: this.uiButtonHeight
            }
        };
    };

    pointInRect(p, r) {
        return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
    };

    handleTopRightUiClick() {
        if (!this.click || !this.ctx) return;
        const click = this.click;
        this.click = null;

        const rects = this.getTopRightControlRects();
        if (this.pointInRect(click, rects.pause)) {
            this.togglePause();
            return;
        }
        if (this.pointInRect(click, rects.restart)) {
            if (this.restart) this.restart();
        }
    };

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
        this.ctx.restore();
    };

    drawHealthBar() {
        const player = this.cameraTarget;
        if (!player || typeof player.health !== "number" || typeof player.maxHealth !== "number") return;

        const x = 20;
        const width = 220;
        const height = 16;
        const y = this.ctx.canvas.height - 30;
        const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 0;

        this.ctx.save();
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
        this.ctx.restore();
    };

    drawPauseOverlay() {
        if (!this.paused && !this.gameOver && !this.gameWon) return;

        const ctx = this.ctx;
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const t = this._overlayAnimTime;

        if (this.gameOver) {
            this._drawGameOverScreen(ctx, W, H, cx, cy, t);
        } else if (this.gameWon) {
            this._drawWinScreen(ctx, W, H, cx, cy, t);
        } else {
            // Pause screen (unchanged style)
            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "30px Creepster";
            ctx.fillText("PAUSED", cx, cy - 20);
            ctx.font = "16px monospace";
            ctx.fillText("Press P or ESC to Resume", cx, cy + 16);
            ctx.fillText("Press R to Restart", cx, cy + 40);
            ctx.restore();
        }
    };

    _drawGameOverScreen(ctx, W, H, cx, cy, t) {
        ctx.save();

        // Animated dark red vignette overlay
        const vigAlpha = Math.min(0.82, 0.5 + t * 0.3);
        ctx.fillStyle = `rgba(18, 0, 0, ${vigAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Pulsing red border
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        const borderAlpha = 0.4 + 0.4 * pulse;
        const borderWidth = 4 + 3 * pulse;
        ctx.strokeStyle = `rgba(200, 20, 20, ${borderAlpha})`;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(borderWidth / 2, borderWidth / 2, W - borderWidth, H - borderWidth);

        // Blood drip effect — vertical red lines from top
        ctx.save();
        const dripSeeds = [0.08, 0.2, 0.35, 0.5, 0.63, 0.77, 0.91];
        for (const seed of dripSeeds) {
            const dx = seed * W;
            const dripLen = (40 + seed * 60) * Math.min(1, t * 0.6);
            const grad = ctx.createLinearGradient(dx, 0, dx, dripLen);
            grad.addColorStop(0, "rgba(160,0,0,0.7)");
            grad.addColorStop(1, "rgba(160,0,0,0)");
            ctx.fillStyle = grad;
            ctx.fillRect(dx - 2, 0, 4, dripLen);
        }
        ctx.restore();

        // Panel background
        const panelW = 380;
        const panelH = 220;
        const panelX = cx - panelW / 2;
        const panelY = cy - panelH / 2 - 10;
        ctx.fillStyle = "rgba(8, 0, 0, 0.88)";
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = "rgba(180, 20, 20, 0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Corner accents
        const accentSize = 12;
        ctx.strokeStyle = "#cc2222";
        ctx.lineWidth = 2;
        // Top-left
        ctx.beginPath(); ctx.moveTo(panelX, panelY + accentSize); ctx.lineTo(panelX, panelY); ctx.lineTo(panelX + accentSize, panelY); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(panelX + panelW - accentSize, panelY); ctx.lineTo(panelX + panelW, panelY); ctx.lineTo(panelX + panelW, panelY + accentSize); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(panelX, panelY + panelH - accentSize); ctx.lineTo(panelX, panelY + panelH); ctx.lineTo(panelX + accentSize, panelY + panelH); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(panelX + panelW - accentSize, panelY + panelH); ctx.lineTo(panelX + panelW, panelY + panelH); ctx.lineTo(panelX + panelW, panelY + panelH - accentSize); ctx.stroke();

        // "GAME OVER" title
        const titleFade = Math.min(1, t * 1.5);
        ctx.globalAlpha = titleFade;
        ctx.textAlign = "center";
        ctx.fillStyle = "#cc2222";
        ctx.font = "bold 52px Creepster";
        // Glow effect
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 18 + 10 * pulse;
        ctx.fillText("GAME OVER", cx, panelY + 66);
        ctx.shadowBlur = 0;

        // Divider line
        ctx.strokeStyle = "rgba(180,20,20,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 24, panelY + 80);
        ctx.lineTo(panelX + panelW - 24, panelY + 80);
        ctx.stroke();

        // Stats
        ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.4) * 2));
        ctx.font = "15px monospace";
        ctx.fillStyle = "#cc6666";
        const minutes = Math.floor(this.timeSurvived / 60);
        const seconds = Math.floor(this.timeSurvived % 60);
        const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        ctx.fillText(`Time Survived:  ${timeStr}`, cx, panelY + 108);
        ctx.fillText(`Zombies Killed:  ${this.zombiesKilled}`, cx, panelY + 130);

        // Restart prompt
        ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.7) * 2)) * (0.6 + 0.4 * Math.sin(t * 2.5));
        ctx.font = "14px monospace";
        ctx.fillStyle = "#ff6666";
        ctx.fillText("[ Press R to try again ]", cx, panelY + panelH - 22);

        ctx.globalAlpha = 1;
        ctx.restore();
    };

    _drawWinScreen(ctx, W, H, cx, cy, t) {
        ctx.save();

        // Dark green overlay
        const vigAlpha = Math.min(0.80, 0.45 + t * 0.3);
        ctx.fillStyle = `rgba(0, 14, 4, ${vigAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Pulsing green border
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
        const borderAlpha = 0.35 + 0.45 * pulse;
        const borderWidth = 4 + 2 * pulse;
        ctx.strokeStyle = `rgba(60, 200, 80, ${borderAlpha})`;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(borderWidth / 2, borderWidth / 2, W - borderWidth, H - borderWidth);

        // Particle sparkle effect
        ctx.save();
        const sparkleCount = 18;
        for (let i = 0; i < sparkleCount; i++) {
            const seed = (i * 137.508) % 1;
            const seed2 = (i * 73.1) % 1;
            const px = (seed * W + t * 25 * (i % 2 === 0 ? 1 : -1)) % W;
            const py = (seed2 * H + t * 18 * (i % 3 === 0 ? 1 : -0.5)) % H;
            const size = 1.5 + seed * 3;
            const alpha = (0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))) * Math.min(1, t);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = i % 3 === 0 ? "#b9ff9e" : i % 3 === 1 ? "#ffffff" : "#5cff5c";
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Panel
        const panelW = 380;
        const panelH = 220;
        const panelX = cx - panelW / 2;
        const panelY = cy - panelH / 2 - 10;
        ctx.fillStyle = "rgba(0, 10, 2, 0.90)";
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = "rgba(60, 200, 80, 0.75)";
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Corner accents
        const accentSize = 12;
        ctx.strokeStyle = "#4caf50";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(panelX, panelY + accentSize); ctx.lineTo(panelX, panelY); ctx.lineTo(panelX + accentSize, panelY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(panelX + panelW - accentSize, panelY); ctx.lineTo(panelX + panelW, panelY); ctx.lineTo(panelX + panelW, panelY + accentSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(panelX, panelY + panelH - accentSize); ctx.lineTo(panelX, panelY + panelH); ctx.lineTo(panelX + accentSize, panelY + panelH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(panelX + panelW - accentSize, panelY + panelH); ctx.lineTo(panelX + panelW, panelY + panelH); ctx.lineTo(panelX + panelW, panelY + panelH - accentSize); ctx.stroke();

        // "YOU SURVIVED" title
        const titleFade = Math.min(1, t * 1.5);
        ctx.globalAlpha = titleFade;
        ctx.textAlign = "center";
        ctx.fillStyle = "#b9ff9e";
        ctx.font = "bold 46px Creepster";
        ctx.shadowColor = "#4cff70";
        ctx.shadowBlur = 16 + 8 * pulse;
        ctx.fillText("YOU SURVIVED", cx, panelY + 64);
        ctx.shadowBlur = 0;

        // Divider
        ctx.strokeStyle = "rgba(60,200,80,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 24, panelY + 80);
        ctx.lineTo(panelX + panelW - 24, panelY + 80);
        ctx.stroke();

        // Stats
        ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.4) * 2));
        ctx.font = "15px monospace";
        ctx.fillStyle = "#7adf7a";
        const minutes = Math.floor(this.timeSurvived / 60);
        const seconds = Math.floor(this.timeSurvived % 60);
        const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        ctx.fillText(`Time Survived:  ${timeStr}`, cx, panelY + 108);
        ctx.fillText(`Zombies Killed:  ${this.zombiesKilled}`, cx, panelY + 130);

        // Restart prompt
        ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.7) * 2)) * (0.6 + 0.4 * Math.sin(t * 2.5));
        ctx.font = "14px monospace";
        ctx.fillStyle = "#b9ff9e";
        ctx.fillText("[ Press R to play again ]", cx, panelY + panelH - 22);

        ctx.globalAlpha = 1;
        ctx.restore();
    };

    updateCamera() {
        // Center the camera on the target, then clamp to map bounds.
        if (!this.cameraTarget) return;

        const canvasWidth = this.ctx.canvas.width;
        const canvasHeight = this.ctx.canvas.height;
        const target = this.cameraTarget;
        const targetCenterX = target.x + (target.width ? target.width / 2 : 0);
        const targetCenterY = target.y + (target.height ? target.height / 2 : 0);

        let camX = targetCenterX - canvasWidth / 2;
        let camY = targetCenterY - canvasHeight / 2;

        const maxX = Math.max(0, (this.worldWidth || canvasWidth) - canvasWidth);
        const maxY = Math.max(0, (this.worldHeight || canvasHeight) - canvasHeight);

        this.camera.x = Math.max(0, Math.min(maxX, camX));
        this.camera.y = Math.max(0, Math.min(maxY, camY));
    };

};
