// Simple zombie that chases and attacks the player.
class Zombie {
  constructor(game, player, x, y, options) {
    this.game = game;
    this.player = player;
    this.x = x;
    this.y = y;

    this.width = 52;
    this.height = 68;
    this.speed = (options && options.speed) || 70;
    this.damage = (options && options.damage) || 10;
    this.chaseRadius = (options && options.chaseRadius) || 320;
    this.attackRange = (options && options.attackRange) || 24;
    this.attackCooldown = (options && options.attackCooldown) || 0.8;
    this.attackTimer = 0;
    this.maxHealth = (options && options.maxHealth) || 45;
    this.health = this.maxHealth;
    this.showHealthBar = false;
    this.id = Zombie.nextId++;
    this.spritePath = Zombie.SPRITE_PATH;
    this.warnedMissingSprite = false;
    this.loggedAssetDebug = false;
    this.lazyLoadRequested = false;
    this.frameWidth = 12;
    this.frameHeight = 16;
    this.idleAnim = null;
    this.animElapsed = 0;
    this.lastDirection = "down";
    this.loadAnimator();
  }

  loadAnimator() {
    const sprite = ASSET_MANAGER.getAsset(this.spritePath);
    if (!sprite) return;
    this.idleAnim = new Animator(sprite, 0, 0, this.frameWidth, this.frameHeight, 6, 0.10, true);
  }

  tryLazyLoadSprite() {
    if (this.lazyLoadRequested) return;
    this.lazyLoadRequested = true;
    const img = new Image();
    img.addEventListener("load", () => {
      ASSET_MANAGER.cache[this.spritePath] = img;
      if (this.game.debug) {
        console.log("[ZOMBIE SPRITE LAZY LOAD OK]", this.spritePath);
      }
    });
    img.addEventListener("error", () => {
      console.warn("[ZOMBIE SPRITE LAZY LOAD FAILED]", this.spritePath);
    });
    img.src = this.spritePath;
  }

  takeDamage(amount, source) {
    if (this.removeFromWorld) return false;
    this.health = Math.max(0, this.health - Math.max(0, amount || 0));
    if (this.health < this.maxHealth) this.showHealthBar = true;
    if (this.game.debug) {
      console.log(`[PUNCH] zombie#${this.id} took damage`, {
        from: source && source.constructor ? source.constructor.name : "unknown",
        damage: amount,
        healthAfter: this.health
      });
    }
    if (this.health <= 0) {
      this.removeFromWorld = true;
      if (this.game.debug) {
        console.log(`[DEATH] zombie#${this.id} removed`);
      }
    }
    return true;
  }

  update() {
    if (!this.player || this.player.isDead) return;
    if (this.game.paused || this.game.gameOver) return;
    if (this.removeFromWorld) return;

    const dt = this.game.clockTick;
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.chaseRadius) return;

    if (Math.abs(dx) >= Math.abs(dy)) {
      this.lastDirection = dx >= 0 ? "right" : "left";
    } else {
      this.lastDirection = dy >= 0 ? "down" : "up";
    }

    if (dist > this.attackRange) {
      const len = dist || 1;
      this.x += (dx / len) * this.speed * dt;
      this.y += (dy / len) * this.speed * dt;
    } else if (this.attackTimer <= 0) {
      const before = this.player.health;
      const applied = this.player.takeDamage(this.damage, this, dist);
      if (applied && this.game.debug) {
        console.log(`[DAMAGE] zombie#${this.id} hit player`, {
          distance: Number(dist.toFixed(2)),
          attackRange: this.attackRange,
          cooldownReady: this.attackTimer <= 0,
          cooldownRemaining: Number(this.attackTimer.toFixed(2)),
          attackCooldown: this.attackCooldown,
          healthBefore: before,
          healthAfter: this.player.health
        });
      }
      this.attackTimer = this.attackCooldown;
    }
  }

  draw(ctx) {
    const sprite = ASSET_MANAGER.getAsset(this.spritePath);
    const spriteReady = !!(sprite && sprite.complete && sprite.naturalWidth > 0);
    if (this.game.debug && !this.loggedAssetDebug) {
      console.log("[ZOMBIE DRAW ASSET CHECK]", {
        path: this.spritePath,
        hasAsset: !!sprite,
        naturalWidth: sprite && sprite.naturalWidth,
        spriteReady
      });
      this.loggedAssetDebug = true;
    }
    if (spriteReady) {
      ctx.save();
      // Draw animated sprite frames, but scale to zombie width/height.
      this.animElapsed += this.game.clockTick;
      const frameDuration = 0.10;
      const frameCount = 6;
      const frame = Math.floor(this.animElapsed / frameDuration) % frameCount;
      const sx = frame * this.frameWidth;
      ctx.drawImage(
        sprite,
        sx, 0,
        this.frameWidth, this.frameHeight,
        this.x, this.y,
        this.width, this.height
      );
      if (this.game.debug) {
        ctx.strokeStyle = "#ff3333";
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
      }
      ctx.restore();
      this.drawHealthBar(ctx);
      return;
    }

    if (!this.warnedMissingSprite) {
      console.warn("Zombie sprite missing, using fallback rectangle:", this.spritePath);
      this.warnedMissingSprite = true;
    }
    this.tryLazyLoadSprite();

    // Fallback shape so zombie is never invisible.
    ctx.save();
    ctx.fillStyle = "#5d8f3e";
    ctx.strokeStyle = "#1e3811";
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    if (this.game.debug) {
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    ctx.restore();

    this.drawHealthBar(ctx);
  }

  drawHealthBar(ctx) {
    if (!this.showHealthBar || this.removeFromWorld) return;
    const width = 30;
    const height = 4;
    const x = this.x + (this.width - width) / 2;
    const y = this.y - 8;
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
    ctx.fillStyle = "#7a1111";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#5cff5c";
    ctx.fillRect(x, y, Math.max(0, width * ratio), height);
    ctx.restore();
  }
}

Zombie.nextId = 1;
Zombie.SPRITE_PATH = "./PostApocalypse_AssetPack_v1.1.2/Enemies/Zombie_Small/Zombie_Small_Down_walk-Sheet6.png";
