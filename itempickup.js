// Item pickup entity: draw sprite, detect player interaction, add inventory.
class ItemPickup {
  constructor(game, player, options) {
    this.game = game;
    this.player = player;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 28;
    this.height = options.height || 28;
    this.itemId = options.itemId || "item";
    this.spritePath = options.spritePath || "";
    this.pickupRadius = options.pickupRadius || 42;
    this.collectedKey = options.collectedKey || this.itemId;
    this.showHint = false;
    this.warnedMissingSprite = false;
    this.removeFromWorld = false;
  }

  update() {
    if (!this.player || this.removeFromWorld) return;
    if (this.game.paused || this.game.gameOver) return;

    if (this.game.collectedItems && this.game.collectedItems.has(this.collectedKey)) {
      this.removeFromWorld = true;
      return;
    }

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    const itemCenterX = this.x + this.width / 2;
    const itemCenterY = this.y + this.height / 2;
    const dist = Math.hypot(itemCenterX - playerCenterX, itemCenterY - playerCenterY);
    this.showHint = dist <= this.pickupRadius;

    const autoPickup = dist <= this.pickupRadius;
    if (autoPickup || (this.showHint && this.player.interactPressed)) {
      this.pickup();
    }
  }

  pickup() {
    if (!this.player) return;
    this.player.addItem(this.itemId);
    if (this.game.collectedItems) {
      this.game.collectedItems.add(this.collectedKey);
    }
    this.removeFromWorld = true;
    if (this.game.debug) {
      console.log("[PICKUP] Collected item", {
        itemId: this.itemId,
        key: this.collectedKey,
        equippedWeapon: this.player.equippedWeapon
      });
    }
  }

  draw(ctx) {
    const sprite = this.spritePath ? ASSET_MANAGER.getAsset(this.spritePath) : null;
    const spriteReady = !!(sprite && sprite.complete && sprite.naturalWidth > 0);
    if (spriteReady) {
      ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
    } else {
      if (this.spritePath && !this.warnedMissingSprite) {
        console.warn("Pickup sprite missing, using fallback:", this.spritePath);
        this.warnedMissingSprite = true;
      }
      ctx.save();
      ctx.fillStyle = "#ddb85b";
      ctx.strokeStyle = "#4a3a15";
      ctx.lineWidth = 2;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }

    if (this.showHint) {
      ctx.save();
      ctx.font = "12px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Press E", this.x - 6, this.y - 8);
      ctx.restore();
    }
  }
}
