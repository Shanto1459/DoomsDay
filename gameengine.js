
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

        // Camera tracks a target entity in world space.
        this.camera = { x: 0, y: 0 };
        this.cameraTarget = null;
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
        this.keys[event.key.toLowerCase()] = true;
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
        this.ctx.translate(-this.camera.x, -this.camera.y);
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
    };

    update() {
        let entitiesCount = this.entities.length;

        for (let i = 0; i < entitiesCount; i++) {
            let entity = this.entities[i];

            if (!entity.removeFromWorld) {
                entity.update();
            }
        }

        for (let i = this.entities.length - 1; i >= 0; --i) {
            if (this.entities[i].removeFromWorld) {
                this.entities.splice(i, 1);
            }
        }
    };

    loop() {
        this.clockTick = this.timer.tick();
        this.update();
        this.updateCamera();
        this.draw();
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

