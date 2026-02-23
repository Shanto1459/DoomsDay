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

    this.batSheets = {
      hold: {
        down: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_down_idle-and-run-Sheet6.png"),
        up: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_up_idle-and-run-Sheet6.png"),
        left: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side-left_idle-and-run-Sheet6.png"),
        right: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side_idle-and-run-Sheet6.png")
      },
      attack: {
        down: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_down_attack-Sheet4.png"),
        up: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_up_attack-Sheet4.png"),
        left: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side-left_attack-Sheet4.png"),
        right: ASSET_MANAGER.getAsset("./PostApocalypse_AssetPack_v1.1.2/Character/Bat/Bat_side_attack-Sheet4.png")
      }
    };
    this.loggedBatLoadState = false;

    // BAT animators (calculated from real sheet sizes)
    // Hold sheets: down 102x11 (17x11 x6), up 96x14 (16x14 x6), side 96x13 (16x13 x6)
    this.batDownHoldAnim  = new Animator(this.batSheets.hold.down,  0, 0, 17, 11, 6, 0.10, true);
    this.batUpHoldAnim    = new Animator(this.batSheets.hold.up,    0, 0, 16, 14, 6, 0.10, true);
    this.batLeftHoldAnim  = new Animator(this.batSheets.hold.left,  0, 0, 16, 13, 6, 0.10, true);
    this.batRightHoldAnim = new Animator(this.batSheets.hold.right, 0, 0, 16, 13, 6, 0.10, true);
    // Attack sheets: down/up 80x25 (20x25 x4), side 112x16 (28x16 x4)
    this.batDownAttackAnim  = new Animator(this.batSheets.attack.down,  0, 0, 20, 25, 4, 0.10, false);
    this.batUpAttackAnim    = new Animator(this.batSheets.attack.up,    0, 0, 20, 25, 4, 0.10, false);
    this.batLeftAttackAnim  = new Animator(this.batSheets.attack.left,  0, 0, 28, 16, 4, 0.10, false);
    this.batRightAttackAnim = new Animator(this.batSheets.attack.right, 0, 0, 28, 16, 4, 0.10, false);


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
    this.batSwingDuration = 0.30;
    this.batHitWindowStart = 0.08;
    this.batHitWindowEnd = 0.20;
    this.punchHitIds = new Set();
    this.inventory = {};
    this.equippedWeapon = null;
    this.weapons = {
      bat: {
        id: "bat",
        damage: 32,
        range: 92,
        update: () => {},
        draw: (ctx, behindPlayer) => this.drawBat(ctx, behindPlayer),
        attack: (zombie) => zombie.takeDamage(32, this)
      }
    };
    this.weaponStats = {
      punch: { damage: this.punchDamage, range: this.punchRange },
      knife: { damage: 24, range: 76 },
      bat: { damage: 32, range: 92 }
    };
    this.batSpritePath = "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Bat.png";
    this.batSprite = ASSET_MANAGER.getAsset(this.batSpritePath);
    this.batHoldFrameElapsed = 0;
    this.weaponDebugState = {
      attacking: false,
      attackTimer: 0,
      facingDirection: this.direction,
      swingFrameIndex: 0,
      anchorX: 0,
      anchorY: 0
    };
    this.loggedBatSheetState = false;
    if (this.game.debug) {
      const holdDown = this.batSheets.hold.down;
      const attackDown = this.batSheets.attack.down;
      console.log("[PLAYER SHEET INIT]", {
        downRunLoaded: !!(this.downSheet && this.downSheet.complete && this.downSheet.naturalWidth > 0),
        batHoldDownLoaded: !!(holdDown && holdDown.complete && holdDown.naturalWidth > 0),
        batAttackDownLoaded: !!(attackDown && attackDown.complete && attackDown.naturalWidth > 0)
      });
    }
    // Used to detect "press once" for Space
    this.prevSpaceDown = false;
    this.prevEDown = false;
    this.interactPressed = false;
  }

  logBatSheetStatusOnce(sourceTag) {
    if (this.loggedBatLoadState) return;
    const holdDown = this.batSheets && this.batSheets.hold && this.batSheets.hold.down;
    const attackDown = this.batSheets && this.batSheets.attack && this.batSheets.attack.down;
    const runDown = this.downSheet;
    console.log(`[BAT LOAD CHECK:${sourceTag}]`, {
      holdDownImage: holdDown,
      attackDownImage: attackDown,
      runDownImage: runDown,
      holdDownLoaded: !!(holdDown && holdDown.complete && holdDown.naturalWidth > 0),
      attackDownLoaded: !!(attackDown && attackDown.complete && attackDown.naturalWidth > 0),
      runDownLoaded: !!(runDown && runDown.complete && runDown.naturalWidth > 0),
      holdDownSize: holdDown ? `${holdDown.naturalWidth}x${holdDown.naturalHeight}` : "missing",
      attackDownSize: attackDown ? `${attackDown.naturalWidth}x${attackDown.naturalHeight}` : "missing"
    });
    if (!(holdDown && holdDown.complete && holdDown.naturalWidth > 0) ||
        !(attackDown && attackDown.complete && attackDown.naturalWidth > 0)) {
      console.warn("Bat sheet missing/invalid, using safe fallback body + overlay.");
    }
    this.loggedBatLoadState = true;
  }

  update() {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - this.game.clockTick);
    this.punchCooldownTimer = Math.max(0, this.punchCooldownTimer - this.game.clockTick);
    this.batHoldFrameElapsed += this.game.clockTick;

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

      // Reset punch-body animation only when unarmed.
      // if (this.equippedWeapon !== "bat") {
      //   if (this.direction === "up") this.upPunchAnim.reset();
      //   else if (this.direction === "left") this.leftPunchAnim.reset();
      //   else if (this.direction === "right") this.rightPunchAnim.reset();
      //   else this.downPunchAnim.reset();
      // }
      if (this.equippedWeapon === "bat") {

        let aAnim = this.batDownAttackAnim;
        if (this.direction === "up") aAnim = this.batUpAttackAnim;
        else if (this.direction === "left") aAnim = this.batLeftAttackAnim;
        else if (this.direction === "right") aAnim = this.batRightAttackAnim;
    
        if (aAnim.isDone()) this.punching = false;
    
    } else {
    
        let pAnim = this.downPunchAnim;
        if (this.direction === "up") pAnim = this.upPunchAnim;
        else if (this.direction === "left") pAnim = this.leftPunchAnim;
        else if (this.direction === "right") pAnim = this.rightPunchAnim;
    
        if (pAnim.isDone()) this.punching = false;
    }
    
    }

    // If punching, don't move; end when animation finishes
    if (this.punching) {
      this.punchTimer += this.game.clockTick;
      const hitStart = this.equippedWeapon === "bat" ? this.batHitWindowStart : this.punchActiveWindowStart;
      const hitEnd = this.equippedWeapon === "bat" ? this.batHitWindowEnd : this.punchActiveWindowEnd;
      const inHitWindow = this.punchTimer >= hitStart && this.punchTimer <= hitEnd;
      if (inHitWindow) {
        this.applyPunchDamage();
      }
      const weapon = this.getEquippedWeaponDef();
      if (weapon && typeof weapon.update === "function") {
        weapon.update();
      }

      if (this.equippedWeapon === "bat") {
        if (this.punchTimer >= this.batSwingDuration) this.punching = false;
      } else {
        let pAnim = this.downPunchAnim;
        if (this.direction === "up") pAnim = this.upPunchAnim;
        else if (this.direction === "left") pAnim = this.leftPunchAnim;
        else if (this.direction === "right") pAnim = this.rightPunchAnim;
        if (pAnim.isDone()) this.punching = false;
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
    // For now, attacks only deal damage when the bat is equipped and swinging.
    if (this.equippedWeapon !== "bat") return;
    const zombies = (this.game.entities || []).filter(
      (e) => e && e.constructor && e.constructor.name === "Zombie" && !e.removeFromWorld
    );
    for (const zombie of zombies) {
      if (this.punchHitIds.has(zombie.id)) continue;
      const attack = this.getAttackProfile();
      if (!this.isZombieInAttackRange(zombie, attack.range)) continue;
      const weapon = this.getEquippedWeaponDef();
      const applied = weapon && typeof weapon.attack === "function"
        ? weapon.attack(zombie)
        : zombie.takeDamage(attack.damage, this);
      if (applied) {
        this.punchHitIds.add(zombie.id);
        if (this.game.debugWeapon) {
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

  getEquippedWeaponDef() {
    if (!this.equippedWeapon) return null;
    return this.weapons[this.equippedWeapon] || null;
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
  this.logBatSheetStatusOnce("draw");

  let anim;
  let usingBatBodyAnim = false;

  // Keep player body visible while bat swing overlay handles the weapon animation.
  if (this.punching) {
    if (this.equippedWeapon === "bat") {
      anim = this.downAnim;
      if (this.direction === "up") anim = this.upAnim;
      else if (this.direction === "left") anim = this.leftAnim;
      else if (this.direction === "right") anim = this.rightAnim;
    } else {
      anim = this.downPunchAnim;
      if (this.direction === "up") anim = this.upPunchAnim;
      else if (this.direction === "left") anim = this.leftPunchAnim;
      else if (this.direction === "right") anim = this.rightPunchAnim;
    }
  } else {
    anim = this.downAnim;
    if (this.direction === "up") anim = this.upAnim;
    else if (this.direction === "left") anim = this.leftAnim;
    else if (this.direction === "right") anim = this.rightAnim;
  }

  if (!anim || !anim.spriteSheet) {
    console.error("Invalid animator:", anim);
    anim = this.downAnim;
    if (!anim || !anim.spriteSheet) return;
  }

  const tick = (this.moving || this.punching) ? this.game.clockTick : 0;

  // Draw standalone bat overlay only when not using bat body animation.
  if (this.equippedWeapon === "bat" && !usingBatBodyAnim && this.direction === "up") {
    this.drawBat(ctx, true);
  }
  
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

  if (this.equippedWeapon === "bat" && !usingBatBodyAnim && this.direction !== "up") {
    this.drawBat(ctx, false);
  }

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

drawBat(ctx, behindPlayer) {
  if (this.equippedWeapon !== "bat") return;
  const dirProfile = {
    down: {
      handX: 8.6, handY: 11.2, restAngle: 1.00, drawW: 8.6, drawH: 17.8, pivotX: 0.20, pivotY: 0.86, layer: "front"
    },
    up: {
      handX: 6.6, handY: 7.8, restAngle: -1.05, drawW: 8.6, drawH: 17.8, pivotX: 0.20, pivotY: 0.86, layer: "back"
    },
    left: {
      handX: 5.1, handY: 10.0, restAngle: -0.95, drawW: 8.1, drawH: 16.8, pivotX: 0.24, pivotY: 0.86, layer: "front"
    },
    right: {
      handX: 8.9, handY: 10.0, restAngle: 0.95, drawW: 8.1, drawH: 16.8, pivotX: 0.16, pivotY: 0.86, layer: "front"
    }
  }[this.direction] || {
    handX: 7.0, handY: 10.0, restAngle: 0, drawW: 8.1, drawH: 16.8, pivotX: 0.2, pivotY: 0.86, layer: "front"
  };

  const shouldDrawBehind = dirProfile.layer === "back";
  if (behindPlayer !== shouldDrawBehind) return;

  const sprite = this.batSprite || ASSET_MANAGER.getAsset(this.batSpritePath);
  this.batSprite = sprite || this.batSprite;
  const hasSprite = !!(sprite && sprite.complete && sprite.naturalWidth > 0);

  const bob = this.moving ? Math.sin(this.batHoldFrameElapsed * 20) * 0.25 : 0;
  const handLocal = {
    x: dirProfile.handX,
    y: dirProfile.handY + bob
  };

  let angle = dirProfile.restAngle;
  const swingDuration = Math.max(0.001, this.downPunchAnim.totalTime || 0.4);
  const attackProgress = Math.max(0, Math.min(1, this.punchTimer / swingDuration));
  let swingFrameIndex = 0;

  // Idle/walk hold animation: slight hand sway while moving.
  if (!this.punching && this.moving) {
    angle += Math.sin(this.batHoldFrameElapsed * 14) * 0.08;
  }

  if (this.punching) {
    // Readable arm-driven swing: pull back then strike through.
    const t = attackProgress;
    const pullBack = t < 0.26 ? (t / 0.26) : 1;
    const followThrough = t > 0.26 ? ((t - 0.26) / 0.74) : 0;
    const swingSign = (this.direction === "left" || this.direction === "up") ? -1 : 1;
    angle += swingSign * (-0.55 * pullBack + 1.35 * followThrough);
    swingFrameIndex = Math.min(3, Math.floor(t * 4));
  }

  const drawW = dirProfile.drawW;
  const drawH = dirProfile.drawH;
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.scale(this.scale, this.scale);
  ctx.translate(handLocal.x, handLocal.y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  if (hasSprite) {
    // Pivot near the handle so rotation looks like a hand grip.
    ctx.drawImage(sprite, -drawW * dirProfile.pivotX, -drawH * dirProfile.pivotY, drawW, drawH);
  } else {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-1.1, -8.8, 2.2, 8.8);
  }
  ctx.restore();

  this.weaponDebugState = {
    attacking: this.punching,
    attackTimer: this.punchTimer,
    facingDirection: this.direction,
    swingFrameIndex,
    anchorX: this.x + handLocal.x * this.scale,
    anchorY: this.y + handLocal.y * this.scale
  };

  if (this.game.debugWeapon) {
    ctx.save();
    ctx.fillStyle = "#00d4ff";
    ctx.beginPath();
    ctx.arc(this.weaponDebugState.anchorX, this.weaponDebugState.anchorY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,0,0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.weaponDebugState.anchorX - (drawW * this.scale) * dirProfile.pivotX,
      this.weaponDebugState.anchorY - (drawH * this.scale) * dirProfile.pivotY,
      drawW * this.scale,
      drawH * this.scale
    );
    ctx.restore();
  }
}

}
