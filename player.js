class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;

    this.scale = 4;            // make pixel art bigger
    this.speed = 180;          // pixels per second
    this.direction = "down";   // "up" | "down" | "left" | "right"

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

    // Used to detect "press once" for Space
    this.prevSpaceDown = false;
  }

  update() {
    const keys = this.game.keys;

    // SPACE -> start punch (once per press)
    const spaceDown = !!keys[" "];
    const spacePressed = spaceDown && !this.prevSpaceDown;
    this.prevSpaceDown = spaceDown;

    if (spacePressed && !this.punching) {
      this.punching = true;

      // Reset the punch animation for the current facing direction
      if (this.direction === "up") this.upPunchAnim.reset();
      else if (this.direction === "left") this.leftPunchAnim.reset();
      else if (this.direction === "right") this.rightPunchAnim.reset();
      else this.downPunchAnim.reset();
    }

    // If punching, don't move; end when animation finishes
    if (this.punching) {
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

    // WASD movement
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

    // Normalize diagonal movement
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const dt = this.game.clockTick;
    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;

    // Keep on screen (simple clamp)
    this.x = Math.max(0, Math.min(800 - 14 * this.scale, this.x));
    this.y = Math.max(0, Math.min(600 - 17 * this.scale, this.y));

    this.moving = len > 0;
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
}

}
