class TitleScreen {
  constructor(game, mapData, mapPath, mapScale) {
    this.game = game;
    this.mapData = mapData || null;
    this.mapPath = mapPath || "";
    this.mapScale = mapScale || 1;

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

      if (this.mapData) {
        const mapSize = getMapPixelSize(this.mapData, this.mapScale);
        this.game.worldWidth = mapSize.width;
        this.game.worldHeight = mapSize.height;

        const spawn = getSpawnPosition(this.mapData, this.mapScale);
        this.game.addEntity(new Player(this.game, spawn.x, spawn.y));
        this.game.addEntity(new TiledMapRenderer(this.game, this.mapData, this.mapPath, this.mapScale));
      } else {
        this.game.addEntity(new Player(this.game, 400, 300));
      }
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
