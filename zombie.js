// zombie.js
// Simple zombie that chases and attacks the player.
// Supports different sprite sheets via options.spritePath (Sheet6 / Sheet8 etc.)

class Zombie {
  constructor(game, player, x, y, options = {}) {
    this.game = game;
    this.player = player;

    this.x = x;
    this.y = y;

    // Size (can be overridden per variant)
    this.width = options.width || 52;
    this.height = options.height || 68;

    // Combat/movement stats
    this.speed = options.speed || 70;
    this.damage = options.damage || 10;
    this.chaseRadius = options.chaseRadius || 320;
    this.attackRange = options.attackRange || 24;
    this.attackCooldown = options.attackCooldown || 0.8;
    this.attackTimer = 0;

    // Health
    this.maxHealth = options.maxHealth || 45;
    this.health = this.maxHealth;
    this.showHealthBar = false;

    // ID/debug
    this.id = Zombie.nextId++;
    this.warnedMissingSprite = false;
    this.loggedAssetDebug = false;
    this.lazyLoadRequested = false;

    // Facing / direction (for later)
    this.lastDirection = options.facing || "down";

    // Sprite + animation
    this.spritePath = options.spritePath || Zombie.SPRITE_PATH;

    this.frameWidth = 12;   // will be recalculated
    this.frameHeight = 16;  // will be recalculated
    this.frameCount = 6;    // will be recalculated
    this.animElapsed = 0;

    this.loadAnimatorInfo();
  }

  // Figure out frameCount + frameWidth/height based on spritePath.
  loadAnimatorInfo() {
    const sprite = ASSET_MANAGER.getAsset(this.spritePath);
    if (!sprite) return;

    // Determine frame count from filename "...Sheet8.png"
    let frames = 6;
    const m = String(this.spritePath).match(/Sheet(\d+)\.png$/i);
    if (m) frames = parseInt(m[1], 10) || 6;

    this.frameCount = frames;
    this.frameWidth = Math.floor(sprite.width / frames);
    this.frameHeight = sprite.height;
  }

  tryLazyLoadSprite() {
    if (this.lazyLoadRequested) return;
    this.lazyLoadRequested = true;

    const img = new Image();
    img.addEventListener("load", () => {
      ASSET_MANAGER.cache[this.spritePath] = img;
      // After lazy-load, recalc frame sizes
      this.loadAnimatorInfo();
      if (this.game.debug) console.log("[ZOMBIE SPRITE LAZY LOAD OK]", this.spritePath);
    });
    img.addEventListener("error", () => {
      console.warn("[ZOMBIE SPRITE LAZY LOAD FAILED]", this.spritePath);
    });
    img.src = this.spritePath;
  }

  takeDamage(amount, source) {
    if (this.removeFromWorld) return false;
    const dmg = Math.max(0, amount || 0);
    this.health = Math.max(0, this.health - dmg);
    if (this.health < this.maxHealth) this.showHealthBar = true;

    if (this.health <= 0) {
      this.removeFromWorld = true;
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

    // Update direction for future (if you later swap sprites by direction)
    if (Math.abs(dx) >= Math.abs(dy)) this.lastDirection = dx >= 0 ? "right" : "left";
    else this.lastDirection = dy >= 0 ? "down" : "up";

    if (dist > this.attackRange) {
      const len = dist || 1;
      this.x += (dx / len) * this.speed * dt;
      this.y += (dy / len) * this.speed * dt;
    } else if (this.attackTimer <= 0) {
      if (this.player && typeof this.player.takeDamage === "function") {
        this.player.takeDamage(this.damage, this, dist);
      }
      this.attackTimer = this.attackCooldown;
    }
  }

  draw(ctx) {
    const sprite = ASSET_MANAGER.getAsset(this.spritePath);
    const spriteReady = !!(sprite && sprite.complete && sprite.naturalWidth > 0);

    if (spriteReady) {
      // If sprite exists but we never computed frame sizes (e.g., loaded later)
      if (!this.frameWidth || !this.frameHeight) this.loadAnimatorInfo();

      this.animElapsed += this.game.clockTick;

      const frameDuration = 0.10;
      const frameCount = this.frameCount || 6;
      const frame = Math.floor(this.animElapsed / frameDuration) % frameCount;

      const sx = frame * this.frameWidth;

      ctx.drawImage(
        sprite,
        sx, 0,
        this.frameWidth, this.frameHeight,
        this.x, this.y,
        this.width, this.height
      );

      this.drawHealthBar(ctx);
      return;
    }

    // Sprite missing: don’t crash, show fallback so zombie is never invisible
    if (!this.warnedMissingSprite) {
      console.warn("Zombie sprite missing, using fallback rectangle:", this.spritePath);
      this.warnedMissingSprite = true;
    }

    this.tryLazyLoadSprite();

    ctx.save();
    ctx.fillStyle = "#5d8f3e";
    ctx.strokeStyle = "#1e3811";
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
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

// Default sprite (small zombie down walk sheet)
Zombie.SPRITE_PATH =
  "./PostApocalypse_AssetPack_v1.1.2/Enemies/Zombie_Small/Zombie_Small_Down_walk-Sheet6.png";
  

