class Zombie {
  constructor(game, x, y, facing = "left") {
    this.game = game;
    this.x = x;
    this.y = y;
    this.facing = facing;

    this.scale = 5;

    // sprite sheet info (you confirmed 96x22)
    this.frameW = 11;
    this.frameH = 15;
    this.frames = 6;

    this.width = this.frameW * this.scale;
    this.height = this.frameH * this.scale;

    this.removeFromWorld = false;

    this.idleSheet = ASSET_MANAGER.getAsset(
      "./sprites/zombie/idle/Zombie_Small_Side-left_Idle-Sheet6.png"
    );

    this.idleAnim = new Animator(
      this.idleSheet,
      0, 0,
      this.frameW, this.frameH,
      this.frames,
      0.15,
      true
    );
  }

  update() {
    // idle for now
  }

  draw(ctx) {
    ctx.imageSmoothingEnabled = false;

    const tick = this.game.clockTick;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    this.idleAnim.drawFrame(tick, ctx, 0, 0);

    ctx.restore();
  }
}
