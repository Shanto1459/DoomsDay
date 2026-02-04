// zombie.js

class Zombie {
  constructor(game, x, y, options = {}) {
    this.game = game;
    this.x = x;
    this.y = y;

    // ----- Options -----
    this.facing = options.facing || "down";
    this.scale = options.scale ?? 5;

    this.speed = options.speed ?? 70;
    this.aggroRadius = options.aggroRadius ?? 220;
    this.stopRadius = options.stopRadius ?? 18;

    // Walk strips (8 frames each)
    this.walkLeftPath =
      options.walkLeftPath || "./sprites/zombie/walk/Zombie_Axe_Side-left_Walk-Sheet8.png";
    this.walkRightPath =
      options.walkRightPath || "./sprites/zombie/walk/Zombie_Axe_Side_Walk-Sheet8.png";
    this.walkUpPath =
      options.walkUpPath || "./sprites/zombie/walk/Zombie_Axe_Up_Walk-Sheet8.png";
    this.walkDownPath =
      options.walkDownPath || "./sprites/zombie/walk/Zombie_Axe_Down_Walk-Sheet8.png";

    // Optional idle (if you have one)
    this.idlePath = options.idlePath || null;
    this.idleFrames = options.idleFrames ?? 6;

    this.removeFromWorld = false;
    this.moving = false;

    // ----- Load sheets -----
    this.walkLeftSheet = ASSET_MANAGER.getAsset(this.walkLeftPath);
    this.walkRightSheet = ASSET_MANAGER.getAsset(this.walkRightPath);
    this.walkUpSheet = ASSET_MANAGER.getAsset(this.walkUpPath);
    this.walkDownSheet = ASSET_MANAGER.getAsset(this.walkDownPath);

    // Safety
    if (!this.walkLeftSheet || !this.walkRightSheet || !this.walkUpSheet || !this.walkDownSheet) {
      console.error("Zombie sheet missing:", {
        left: !!this.walkLeftSheet,
        right: !!this.walkRightSheet,
        up: !!this.walkUpSheet,
        down: !!this.walkDownSheet
      });
      this.frameW = 16;
      this.frameH = 16;
      this.width = this.frameW * this.scale;
      this.height = this.frameH * this.scale;
      return;
    }

    // ----- Frame sizes PER DIRECTION (IMPORTANT) -----
    // Side sheet screenshot: 168x19 -> frameW=21 frameH=19
    this.sideFrames = options.sideFrames ?? 8;
    this.upFrames = options.upFrames ?? 8;
    this.downFrames = options.downFrames ?? 8;

    this.sideFrameW = options.sideFrameW ?? Math.floor(this.walkRightSheet.width / this.sideFrames);
    this.sideFrameH = options.sideFrameH ?? this.walkRightSheet.height;

    this.upFrameW = options.upFrameW ?? Math.floor(this.walkUpSheet.width / this.upFrames);
    this.upFrameH = options.upFrameH ?? this.walkUpSheet.height;

    this.downFrameW = options.downFrameW ?? Math.floor(this.walkDownSheet.width / this.downFrames);
    this.downFrameH = options.downFrameH ?? this.walkDownSheet.height;

    // Use DOWN as hitbox reference (change if you want)
    this.width = this.downFrameW * this.scale;
    this.height = this.downFrameH * this.scale;

    // ----- Animators (walk) -----
    // Left/Right use SIDE dims
    this.walkLeftAnim = new Animator(
      this.walkLeftSheet, 0, 0,
      this.sideFrameW, this.sideFrameH,
      this.sideFrames, 0.12, true
    );

    this.walkRightAnim = new Animator(
      this.walkRightSheet, 0, 0,
      this.sideFrameW, this.sideFrameH,
      this.sideFrames, 0.12, true
    );

    // Up uses UP dims
    this.walkUpAnim = new Animator(
      this.walkUpSheet, 0, 0,
      this.upFrameW, this.upFrameH,
      this.upFrames, 0.12, true
    );

    // Down uses DOWN dims
    this.walkDownAnim = new Animator(
      this.walkDownSheet, 0, 0,
      this.downFrameW, this.downFrameH,
      this.downFrames, 0.12, true
    );

    // ----- Optional idle animator -----
    this.idleAnim = null;
    if (this.idlePath) {
      this.idleSheet = ASSET_MANAGER.getAsset(this.idlePath);
      if (!this.idleSheet) {
        console.error("Zombie idle sprite not loaded:", this.idlePath);
      } else {
        const idleFrameW = Math.floor(this.idleSheet.width / this.idleFrames);
        const idleFrameH = this.idleSheet.height;
        this.idleAnim = new Animator(
          this.idleSheet, 0, 0,
          idleFrameW, idleFrameH,
          this.idleFrames, 0.15, true
        );
      }
    }
  }

  update() {
    const player = this.game.cameraTarget; // your engine uses this as player
    if (!player) return;

    const dt = this.game.clockTick;

    // Center-to-center chase
    const zx = this.x + this.width / 2;
    const zy = this.y + this.height / 2;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;

    const dx = px - zx;
    const dy = py - zy;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.aggroRadius && dist > this.stopRadius) {
      this.moving = true;

      const nx = dx / dist;
      const ny = dy / dist;

      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;

      // Face based on dominant axis
      if (Math.abs(nx) > Math.abs(ny)) {
        this.facing = nx > 0 ? "right" : "left";
      } else {
        this.facing = ny > 0 ? "down" : "up";
      }
    } else {
      this.moving = false;
    }
  }

  draw(ctx) {
    ctx.imageSmoothingEnabled = false;

    const tick = this.game.clockTick;

    // Pick animator
    let anim = this.walkDownAnim;
    if (this.facing === "up") anim = this.walkUpAnim;
    else if (this.facing === "left") anim = this.walkLeftAnim;
    else if (this.facing === "right") anim = this.walkRightAnim;

    // Pixel-perfect placement (reduces shimmer)
    const px = Math.round(this.x);
    const py = Math.round(this.y);

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(this.scale, this.scale);

    if (this.moving) {
      anim.drawFrame(tick, ctx, 0, 0);
    } else {
      if (this.idleAnim) {
        this.idleAnim.drawFrame(tick, ctx, 0, 0);
      } else {
        // Freeze current facing walk frame 0
        const old = anim.elapsedTime;
        anim.elapsedTime = 0;
        anim.drawFrame(0, ctx, 0, 0);
        anim.elapsedTime = old;
      }
    }

    ctx.restore();
  }
}
