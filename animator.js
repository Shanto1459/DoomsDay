class Animator {
  constructor(spriteSheet, xStart, yStart, width, height, frameCount, frameDuration, loop = true) {
    Object.assign(this, { spriteSheet, xStart, yStart, width, height, frameCount, frameDuration, loop });
    this.elapsedTime = 0;
    this.totalTime = frameCount * frameDuration;
  }

  drawFrame(tick, ctx, x, y) {
    this.elapsedTime += tick;

    if (this.loop) {
      if (this.elapsedTime > this.totalTime) this.elapsedTime -= this.totalTime;
    } else {
      if (this.elapsedTime > this.totalTime) this.elapsedTime = this.totalTime;
    }

    const frame = Math.min(Math.floor(this.elapsedTime / this.frameDuration), this.frameCount - 1);

    ctx.drawImage(
      this.spriteSheet,
      this.xStart + this.width * frame, this.yStart,
      this.width, this.height,
      x, y,
      this.width, this.height
    );
  }

  reset() { this.elapsedTime = 0; }

  isDone() { return this.elapsedTime >= this.totalTime; }
}
