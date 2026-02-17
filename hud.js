class HUD {
  constructor(game, player) {
    this.game = game;
    this.player = player;
  }
  update() {}
  draw(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHealthBar(ctx, 100, 100);
    ctx.restore();
  }
}