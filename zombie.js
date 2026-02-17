// zombie.js (Version 2: random punch vs punch+axe + fixed "axe swing shifts down" issue)

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

    this.attackRadius = options.attackRadius ?? 55;
    this.attackCooldown = options.attackCooldown ?? 1.0;
    this.attackTimer = 0;

    this.attacking = false;
    this.attackPhase = 0;            // 0 = first animation, 1 = second animation
    this.attackType = "combo";       // "punch" or "combo" (randomized at attack start)
    this.attackingDisabled = false;  // set true if attack sprites missing/broken

    this.removeFromWorld = false;
    this.moving = false;

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

    // ----- Load walk sheets -----
    this.walkLeftSheet = ASSET_MANAGER.getAsset(this.walkLeftPath);
    this.walkRightSheet = ASSET_MANAGER.getAsset(this.walkRightPath);
    this.walkUpSheet = ASSET_MANAGER.getAsset(this.walkUpPath);
    this.walkDownSheet = ASSET_MANAGER.getAsset(this.walkDownPath);

    // ----- Load attack sheets -----
    // NOTE: You said first attack looks like punch, second is axe.
    this.downAttack1 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Down_First-Attack-Sheet7.png"
    );
    this.downAttack2 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Down_Second-Attack-Sheet9.png"
    );

    this.upAttack1 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Up_First-Attack-Sheet7.png"
    );
    this.upAttack2 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Up_Second-Attack-Sheet9.png"
    );

    this.leftAttack1 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Side-left_First-Attack-Sheet7.png"
    );
    this.leftAttack2 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Side-left_Second-Attack-Sheet9.png"
    );

    this.rightAttack1 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Side_First-Attack-Sheet7.png"
    );
    this.rightAttack2 = ASSET_MANAGER.getAsset(
      "./sprites/zombie/attack/Zombie_Axe_Side_Second-Attack-Sheet9.png"
    );

    // ----- Safety check: if walk missing, bail -----
    if (!this.walkLeftSheet || !this.walkRightSheet || !this.walkUpSheet || !this.walkDownSheet) {
      console.error("Zombie walk sheet missing:", {
        left: !!this.walkLeftSheet,
        right: !!this.walkRightSheet,
        up: !!this.walkUpSheet,
        down: !!this.walkDownSheet,
      });
      // Minimal hitbox so game doesn't explode
      this.frameW = 16;
      this.frameH = 16;
      this.width = this.frameW * this.scale;
      this.height = this.frameH * this.scale;
      return;
    }

    // ----- Frame sizes PER DIRECTION -----
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

    this.walkUpAnim = new Animator(
      this.walkUpSheet, 0, 0,
      this.upFrameW, this.upFrameH,
      this.upFrames, 0.12, true
    );

    this.walkDownAnim = new Animator(
      this.walkDownSheet, 0, 0,
      this.downFrameW, this.downFrameH,
      this.downFrames, 0.12, true
    );

    // ----- Attack animator builder + store frame sizes -----
    const makeAttack = (sheet, frames, loop) => {
      if (!sheet) return null;
      const w = Math.floor(sheet.width / frames);
      const h = sheet.height;
      return { anim: new Animator(sheet, 0, 0, w, h, frames, 0.08, loop), frameW: w, frameH: h };
    };

    // If ANY attack sheet missing, disable attacking (prevents drawImage broken state crashes)
    const attackMissing =
      !this.downAttack1 || !this.downAttack2 ||
      !this.upAttack1 || !this.upAttack2 ||
      !this.leftAttack1 || !this.leftAttack2 ||
      !this.rightAttack1 || !this.rightAttack2;

    if (attackMissing) {
      console.error("Zombie attack sheet missing (disabling attacks):", {
        down1: !!this.downAttack1, down2: !!this.downAttack2,
        up1: !!this.upAttack1, up2: !!this.upAttack2,
        left1: !!this.leftAttack1, left2: !!this.leftAttack2,
        right1: !!this.rightAttack1, right2: !!this.rightAttack2,
      });
      this.attackingDisabled = true;
    }

    // Build attack animators (even if disabled, these can be null safely)
    this.downAtk1 = makeAttack(this.downAttack1, 7, false);  // punch
    this.downAtk2 = makeAttack(this.downAttack2, 9, false);  // axe
    this.upAtk1 = makeAttack(this.upAttack1, 7, false);
    this.upAtk2 = makeAttack(this.upAttack2, 9, false);
    this.leftAtk1 = makeAttack(this.leftAttack1, 7, false);
    this.leftAtk2 = makeAttack(this.leftAttack2, 9, false);
    this.rightAtk1 = makeAttack(this.rightAttack1, 7, false);
    this.rightAtk2 = makeAttack(this.rightAttack2, 9, false);

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

    if (this.attackTimer > 0) this.attackTimer -= dt;

    // If currently attacking, just wait for draw() to finish it
    if (this.attacking) {
      this.moving = false;
      return;
    }

    // Start an attack
    if (!this.attackingDisabled && dist <= this.attackRadius && this.attackTimer <= 0) {
      // face player
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? "right" : "left";
      else this.facing = dy > 0 ? "down" : "up";

      this.attacking = true;
      this.attackPhase = 0;
      this.attackTimer = this.attackCooldown;

      // 🎲 Randomly choose punch-only vs punch+axe combo
      // tweak weights here if you want (ex: < 0.7 for more punches)
      this.attackType = Math.random() < 0.5 ? "punch" : "combo";

      // reset the first anim
      const atk1 = this._getAttackObj(1);
      if (atk1 && atk1.anim) atk1.anim.reset();

      return;
    }

    // Move towards player
    if (dist <= this.aggroRadius && dist > this.stopRadius) {
      this.moving = true;

      const nx = dx / dist;
      const ny = dy / dist;

      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;

      // Face based on dominant axis
      if (Math.abs(nx) > Math.abs(ny)) this.facing = nx > 0 ? "right" : "left";
      else this.facing = ny > 0 ? "down" : "up";
    } else {
      this.moving = false;
    }
  }

  // phaseNum: 1 or 2
  _getAttackObj(phaseNum) {
    if (phaseNum === 1) {
      if (this.facing === "up") return this.upAtk1;
      if (this.facing === "left") return this.leftAtk1;
      if (this.facing === "right") return this.rightAtk1;
      return this.downAtk1;
    } else {
      if (this.facing === "up") return this.upAtk2;
      if (this.facing === "left") return this.leftAtk2;
      if (this.facing === "right") return this.rightAtk2;
      return this.downAtk2;
    }
  }

  _getWalkBaseFrameH() {
    // Use the WALK height for the current facing as the baseline
    if (this.facing === "up") return this.upFrameH;
    if (this.facing === "left" || this.facing === "right") return this.sideFrameH;
    return this.downFrameH;
  }

  draw(ctx) {
    // --- ATTACKING ---
    if (this.attacking) {
      // If attacks disabled or assets not built, fail gracefully
      if (this.attackingDisabled) {
        this.attacking = false;
        return;
      }

      const atk1 = this._getAttackObj(1);
      const atk2 = this._getAttackObj(2);

      // If anything is missing, stop attacking
      if (!atk1 || !atk1.anim || !atk2 || !atk2.anim) {
        this.attacking = false;
        return;
      }

      // ✅ Fix "axe swing moves down":
      // Align bottoms (feet) by offsetting Y based on baseline walk frame height.
      const baseH = this._getWalkBaseFrameH();

      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(this.y));
      ctx.scale(this.scale, this.scale);

      if (this.attackPhase === 0) {
        const yOffset = baseH - atk1.frameH; // bottom-align
        atk1.anim.drawFrame(this.game.clockTick, ctx, 0, yOffset);

        if (atk1.anim.isDone()) {
          if (this.attackType === "punch") {
            // 🥊 punch-only ends after first animation
            this.attacking = false;
          } else {
            // 🪓 combo continues to axe
            this.attackPhase = 1;
            atk2.anim.reset();
          }
        }
      } else {
        const yOffset = baseH - atk2.frameH; // bottom-align (prevents “drops down”)
        atk2.anim.drawFrame(this.game.clockTick, ctx, 0, yOffset);

        if (atk2.anim.isDone()) {
          this.attacking = false;
        }
      }

      ctx.restore();
      return;
    }

    // --- WALK/IDLE ---
    ctx.imageSmoothingEnabled = false;

    const tick = this.game.clockTick;

    let anim = this.walkDownAnim;
    if (this.facing === "up") anim = this.walkUpAnim;
    else if (this.facing === "left") anim = this.walkLeftAnim;
    else if (this.facing === "right") anim = this.walkRightAnim;

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
        // Freeze walk frame 0
        const old = anim.elapsedTime;
        anim.elapsedTime = 0;
        anim.drawFrame(0, ctx, 0, 0);
        anim.elapsedTime = old;
      }
    }

    ctx.restore();
  }
}