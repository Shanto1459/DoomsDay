class Zombie {
  constructor(game, spriteSheet, x, y) {
    this.game = game;
    this.sheet = spriteSheet;

    this.x = x;
    this.y = y;

    // ===== SPRITE SHEET INFO =====
    this.FRAME_WIDTH = 64;
    this.FRAME_HEIGHT = 64;
    this.FRAME_COUNT = 5;
    // ============================

    this.scale = 5;

    this.frameIndex = 0;
    this.frameTime = 0;
    this.frameDuration = 0.35; // slow idle

    this.removeFromWorld = false;
  }

  update() {
    const dt = this.game.clockTick;

    this.frameTime += dt;
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      this.frameIndex = (this.frameIndex + 1) % this.FRAME_COUNT;
    }
  }

  draw(ctx) {
    ctx.drawImage(
      this.sheet,
      this.frameIndex * this.FRAME_WIDTH, 0,
      this.FRAME_WIDTH, this.FRAME_HEIGHT,
      this.x, this.y,
      this.FRAME_WIDTH * this.scale,
      this.FRAME_HEIGHT * this.scale
    );
  }
}
