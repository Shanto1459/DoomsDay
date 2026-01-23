class TitleScreen {
  constructor(game) {
    this.game = game;

    this.x = 280;
    this.y = 300;
    this.w = 240;
    this.h = 80;

    this.removeFromWorld = false;
  }

  update() {
    if (this.game.click) {
      const c = this.game.click;

      if (
        c.x >= this.x &&
        c.x <= this.x + this.w &&
        c.y >= this.y &&
        c.y <= this.y + this.h
      ) {
        console.log("START CLICKED");
        this.removeFromWorld = true;
      }

      this.game.click = null;
    }
  }

  draw(ctx) {
    ctx.clearRect(0, 0, 800, 600);

    ctx.fillStyle = "#134b09";
    ctx.font = "96px Creepster";
    ctx.textAlign = "center";
    ctx.fillText("DOOMSDAY", 400, 150);

    ctx.fillStyle = "#0b1b0a";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "#b9ff9e";
    ctx.font = "48px Creepster";
    ctx.fillText("START", 400, 355);
  }
}
