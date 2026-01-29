const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

const MAP_PATH = "./maps/bedroom.tmj";
const MAP_SCALE = 4;

async function loadGame() {
  let mapData = null;

  try {
    const mapResponse = await fetch(MAP_PATH);
    if (!mapResponse.ok) {
      throw new Error(`Map fetch failed: ${mapResponse.status}`);
    }
    mapData = await mapResponse.json();
  } catch (error) {
    console.error("Map failed to load, starting without map.", error);
  }

  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_down_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_up_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side-left_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side_run-Sheet6.png");

  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_down_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_up_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side_punch-Sheet4.png");

  if (mapData) {
    for (const tileset of mapData.tilesets || []) {
      const imagePath = resolveMapAssetPath(MAP_PATH, tileset.image);
      if (imagePath) ASSET_MANAGER.queueDownload(imagePath);

      for (const tile of tileset.tiles || []) {
        const tileImagePath = resolveMapAssetPath(MAP_PATH, tile.image);
        if (tileImagePath) ASSET_MANAGER.queueDownload(tileImagePath);
      }
    }
  }

  ASSET_MANAGER.downloadAll(() => {
    console.log("Game starting");

    const canvas = document.getElementById("gameWorld");
    if (mapData) {
      const mapSize = getMapPixelSize(mapData, MAP_SCALE);
      canvas.width = mapSize.width;
      canvas.height = mapSize.height;
    }
    const ctx = canvas.getContext("2d");

    gameEngine.init(ctx);
    canvas.focus();

    if (mapData) {
      const mapSize = getMapPixelSize(mapData, MAP_SCALE);
      gameEngine.worldWidth = mapSize.width;
      gameEngine.worldHeight = mapSize.height;

      const spawn = getSpawnPosition(mapData, MAP_SCALE);
      gameEngine.addEntity(new Player(gameEngine, spawn.x, spawn.y));
      gameEngine.addEntity(new TiledMapRenderer(gameEngine, mapData, MAP_PATH, MAP_SCALE));
    } else {
      gameEngine.addEntity(new Player(gameEngine, 400, 300));
    }
    gameEngine.start();
    console.log("main.js loaded");
  });
}

loadGame().catch((error) => {
  console.error("Failed to load game assets", error);
});
