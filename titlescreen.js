// Simple start screen with a START button.
class TitleScreen {
  constructor(game, onStart) {
    this.game = game;
    this.onStart = onStart; // callback

    // button box (center-ish for 640x640 canvas)
    this.x = 200;
    this.y = 320;
    this.w = 240;
    this.h = 80;

    this.removeFromWorld = false;
  }

  update() {
    if (this.game.click) {
      const c = this.game.click;

      const inside =
        c.x >= this.x &&
        c.x <= this.x + this.w &&
        c.y >= this.y &&
        c.y <= this.y + this.h;

      if (inside) {
        console.log("START CLICKED");

        // IMPORTANT: do NOT spawn a player here anymore.
        if (typeof this.onStart === "function") {
          this.onStart();
        }

        this.removeFromWorld = true;
      }

      this.game.click = null;
    }
  }

  draw(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "#134b09";
    ctx.font = "96px Creepster";
    ctx.textAlign = "center";
    ctx.fillText("DOOMSDAY", ctx.canvas.width / 2, 170);

    ctx.fillStyle = "#0b1b0a";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "#b9ff9e";
    ctx.font = "48px Creepster";
    ctx.fillText("START", this.x + this.w / 2, this.y + 55);
  }
}
