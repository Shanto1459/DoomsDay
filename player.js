// Player character: input, movement, and animation.
class Player {
  constructor(game, x, y, speed) {
    this.game = game;
    this.x = x;
    this.y = y;

    this.scale = 4;            // make pixel art bigger
    this.speed = speed || 180; // pixels per second
    this.direction = "down";   // "up" | "down" | "left" | "right"
    this.width = 14 * this.scale;
    this.height = 17 * this.scale;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.invincibilityDuration = 0.75;
    this.hitCooldown = 0;
    this.isDead = false;

    // Turn off blur for pixel art
    this.game.ctx.imageSmoothingEnabled = false;

    // RUN sheets
    this.downSheet  = ASSET_MANAGER.getAsset("./sprites/character/run/Character_down_run-Sheet6.png");
    this.upSheet    = ASSET_MANAGER.getAsset("./sprites/character/run/Character_up_run-Sheet6.png");
    this.leftSheet  = ASSET_MANAGER.getAsset("./sprites/character/run/Character_side-left_run-Sheet6.png");
    this.rightSheet = ASSET_MANAGER.getAsset("./sprites/character/run/Character_side_run-Sheet6.png");

    // PUNCH sheets
    this.downPunchSheet  = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_down_punch-Sheet4.png");
    this.upPunchSheet    = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_up_punch-Sheet4.png");
    this.leftPunchSheet  = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
    this.rightPunchSheet = ASSET_MANAGER.getAsset("./sprites/character/punch/Character_side_punch-Sheet4.png");

    // Animators
    // Run (loops)
    this.downAnim  = new Animator(this.downSheet,  0, 0, 13, 17, 6, 0.10, true);
    this.upAnim    = new Animator(this.upSheet,    0, 0, 13, 17, 6, 0.10, true);
    this.leftAnim  = new Animator(this.leftSheet,  0, 0, 14, 17, 6, 0.10, true);
    this.rightAnim = new Animator(this.rightSheet, 0, 0, 14, 17, 6, 0.10, true);

    // Punch 
    this.downPunchAnim  = new Animator(this.downPunchSheet,  0, 0, 13, 17, 4, 0.10, false);
    this.upPunchAnim    = new Animator(this.upPunchSheet,    0, 0, 13, 17, 4, 0.10, false);
    this.leftPunchAnim  = new Animator(this.leftPunchSheet,  0, 0, 14, 17, 4, 0.10, false);
    this.rightPunchAnim = new Animator(this.rightPunchSheet, 0, 0, 14, 17, 4, 0.10, false);

    // State
    this.moving = false;
    this.punching = false;
    this.punchDamage = 18;
    this.punchRange = 62;
    this.punchCooldown = 0.35;
    this.punchCooldownTimer = 0;
    this.punchTimer = 0;
    this.punchActiveWindowStart = 0.08;
    this.punchActiveWindowEnd = 0.24;
    this.punchHitIds = new Set();
    this.inventory = {};
    this.equippedWeapon = null;
    this.weaponStats = {
      punch: { damage: this.punchDamage, range: this.punchRange },
      knife: { damage: 24, range: 76 },
      bat: { damage: 32, range: 92 }
    };

    // Used to detect "press once" for Space
    this.prevSpaceDown = false;
    this.prevEDown = false;
    this.interactPressed = false;
  }

  update() {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - this.game.clockTick);
    this.punchCooldownTimer = Math.max(0, this.punchCooldownTimer - this.game.clockTick);

    const keys = this.game.keys;

    // SPACE -> start punch (once per press)
    const spaceDown = !!keys[" "];
    const spacePressed = spaceDown && !this.prevSpaceDown;
    this.prevSpaceDown = spaceDown;
    const eDown = !!keys["e"];
    this.interactPressed = eDown && !this.prevEDown;
    this.prevEDown = eDown;

    if (spacePressed && !this.punching && this.punchCooldownTimer <= 0) {
      this.punching = true;
      this.punchTimer = 0;
      this.punchHitIds.clear();
      this.punchCooldownTimer = this.punchCooldown;

      // Reset the punch animation for the current facing direction
      if (this.direction === "up") this.upPunchAnim.reset();
      else if (this.direction === "left") this.leftPunchAnim.reset();
      else if (this.direction === "right") this.rightPunchAnim.reset();
      else this.downPunchAnim.reset();
    }

    // If punching, don't move; end when animation finishes
    if (this.punching) {
      this.punchTimer += this.game.clockTick;
      const inHitWindow =
        this.punchTimer >= this.punchActiveWindowStart &&
        this.punchTimer <= this.punchActiveWindowEnd;
      if (inHitWindow) {
        this.applyPunchDamage();
      }

      let pAnim = this.downPunchAnim;
      if (this.direction === "up") pAnim = this.upPunchAnim;
      else if (this.direction === "left") pAnim = this.leftPunchAnim;
      else if (this.direction === "right") pAnim = this.rightPunchAnim;

      if (pAnim.isDone()) {
        this.punching = false;
      }

      this.moving = false;
      return; // skip movement while punching
    }

    // WASD movement input.
    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["ArrowUp"]) dy -= 1;
    if (keys["s"] || keys["ArrowDown"]) dy += 1;
    if (keys["a"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["d"] || keys["ArrowRight"]) dx += 1;

    // Update facing direction based on input
    if (dx > 0) this.direction = "right";
    else if (dx < 0) this.direction = "left";
    else if (dy < 0) this.direction = "up";
    else if (dy > 0) this.direction = "down";

    // Normalize diagonal movement.
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const dt = this.game.clockTick;
    const proposedX = this.x + dx * this.speed * dt;
    const proposedY = this.y + dy * this.speed * dt;

    // Check collisions separately on each axis.
    if (this.canMoveTo(proposedX, this.y)) {
      this.x = proposedX;
    }
    if (this.canMoveTo(this.x, proposedY)) {
      this.y = proposedY;
    }

    // Keep within map/world bounds
    const worldWidth = this.game.worldWidth || 800;
    const worldHeight = this.game.worldHeight || 600;
    this.x = Math.max(0, Math.min(worldWidth - this.width, this.x));
    this.y = Math.max(0, Math.min(worldHeight - this.height, this.y));

    this.moving = len > 0;
  }

  // Axis-aligned bounding box for collisions and portals.
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // Ask the collision grid if the next position is blocked.
  canMoveTo(x, y) {
    if (!this.game.collisionGrid) return true;
    const blocked = this.game.collisionGrid.isBlockedRect(x, y, this.width, this.height);
    if (blocked && this.game.debug) {
      console.log("Collision blocked:", { x, y, width: this.width, height: this.height });
    }
    return !blocked;
  }

  applyPunchDamage() {
    const zombies = (this.game.entities || []).filter(
      (e) => e && e.constructor && e.constructor.name === "Zombie" && !e.removeFromWorld
    );
    for (const zombie of zombies) {
      if (this.punchHitIds.has(zombie.id)) continue;
      const attack = this.getAttackProfile();
      if (!this.isZombieInAttackRange(zombie, attack.range)) continue;
      const applied = zombie.takeDamage(attack.damage, this);
      if (applied) {
        this.punchHitIds.add(zombie.id);
        if (this.game.debug) {
          const dx = (zombie.x + zombie.width / 2) - (this.x + this.width / 2);
          const dy = (zombie.y + zombie.height / 2) - (this.y + this.height / 2);
          console.log("[PUNCH] player hit zombie", {
            attackType: attack.id,
            zombieId: zombie.id,
            distance: Number(Math.hypot(dx, dy).toFixed(2)),
            zombieHealth: zombie.health
          });
        }
      }
    }
  }

  getAttackProfile() {
    if (this.equippedWeapon && this.weaponStats[this.equippedWeapon]) {
      return { id: this.equippedWeapon, ...this.weaponStats[this.equippedWeapon] };
    }
    return { id: "punch", ...this.weaponStats.punch };
  }

  isZombieInAttackRange(zombie, attackRange) {
    const playerCenterX = this.x + this.width / 2;
    const playerCenterY = this.y + this.height / 2;
    const zombieCenterX = zombie.x + zombie.width / 2;
    const zombieCenterY = zombie.y + zombie.height / 2;
    const dx = zombieCenterX - playerCenterX;
    const dy = zombieCenterY - playerCenterY;
    const dist = Math.hypot(dx, dy);
    if (dist > attackRange) return false;

    // Keep temporary combat modular: this directional check can be swapped later for weapon arcs.
    if (this.direction === "right") return dx >= -6;
    if (this.direction === "left") return dx <= 6;
    if (this.direction === "up") return dy <= 6;
    return dy >= -6;
  }

  addItem(itemId) {
    if (!itemId) return;
    this.inventory[itemId] = true;
    if (!this.equippedWeapon && this.weaponStats[itemId]) {
      this.equippedWeapon = itemId;
    }
  }

  hasItem(itemId) {
    return !!this.inventory[itemId];
  }

  removeItem(itemId) {
    delete this.inventory[itemId];
    if (this.equippedWeapon === itemId) this.equippedWeapon = null;
  }

  takeDamage(amount, attacker, distanceFromAttacker) {
    if (this.isDead) return false;
    if (this.hitCooldown > 0) return false;
    if (!this.game.zombiesEnabled) return false;

    // Safety guards: health can only drop from a real zombie attack.
    const zombies = (this.game.entities || []).filter((e) => e && e.constructor && e.constructor.name === "Zombie");
    if (zombies.length === 0) return false;
    if (!attacker || attacker.constructor.name !== "Zombie") return false;
    if (!zombies.includes(attacker)) return false;

    const dx = this.x - attacker.x;
    const dy = this.y - attacker.y;
    const dist = typeof distanceFromAttacker === "number" ? distanceFromAttacker : Math.hypot(dx, dy);
    if (dist > attacker.attackRange) return false;

    this.health = Math.max(0, Math.min(this.maxHealth, this.health - amount));
    this.hitCooldown = this.invincibilityDuration;

    if (this.health <= 0) {
      this.isDead = true;
      this.game.gameOver = true;
      this.game.paused = true;
      this.game.keys = {};
    }
    return true;
  }

draw(ctx) {
  ctx.imageSmoothingEnabled = false;

  let anim;

  if (this.punching) {
    anim = this.downPunchAnim;
    if (this.direction === "up") anim = this.upPunchAnim;
    else if (this.direction === "left") anim = this.leftPunchAnim;
    else if (this.direction === "right") anim = this.rightPunchAnim;
  } else {
    anim = this.downAnim;
    if (this.direction === "up") anim = this.upAnim;
    else if (this.direction === "left") anim = this.leftAnim;
    else if (this.direction === "right") anim = this.rightAnim;
  }

  const tick = (this.punching || this.moving) ? this.game.clockTick : 0;

  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.scale(this.scale, this.scale);

  if (!this.punching && !this.moving) {
    const old = anim.elapsedTime;
    anim.elapsedTime = 0;          // force frame 0
    anim.drawFrame(0, ctx, 0, 0);  // don't advance
    anim.elapsedTime = old;        // restore
  } else {
    anim.drawFrame(tick, ctx, 0, 0);
  }

  ctx.restore();

  if (this.game.debug) {
    ctx.save();
    ctx.strokeStyle = "#33c5ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }

  // Draw a simple speech bubble when a dialog is active.
  if (this.game.activeDialog && this.game.activeDialog.timeLeftMs > 0) {
    const text = this.game.activeDialog.text || "";
    if (text) {
      const padding = 6;
      ctx.save();
      ctx.font = "12px monospace";
      const textWidth = ctx.measureText(text).width;
      const bubbleWidth = textWidth + padding * 2;
      const bubbleHeight = 20;
      const bubbleX = this.x + this.width / 2 - bubbleWidth / 2;
      const bubbleY = this.y - bubbleHeight - 8;

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
      ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);

      ctx.fillStyle = "#111";
      ctx.fillText(text, bubbleX + padding, bubbleY + 14);
      ctx.restore();
    }
  }
}

}
