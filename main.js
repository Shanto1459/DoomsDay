// Entry point: loads assets, then starts the game.
const gameEngine = new GameEngine({ cameraDebug: true });
const ASSET_MANAGER = new AssetManager();

// Starting map + player config.
const MAP_PATH = "./maps/bedroom.tmj";
const MAP_SCALE = 4;
const START_SPAWN = "PlayerSpawn";
const PLAYER_SPEED = 140; // pixels per second

// Loads the map JSON, preloads tiles, then starts the game loop.
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
  ASSET_MANAGER.queueDownload("./sprites/zombie/idle/Zombie_Small_Side-left_Idle-Sheet6.png");


  if (mapData) {
    const tilePaths = collectTilesetImagePaths(mapData, MAP_PATH);
    const result = await preloadImages(tilePaths);
    console.log("Tileset images loaded:", result.loaded, "failed:", result.failed);
  }

  // Wait for character sprites, then start the engine.
  ASSET_MANAGER.downloadAll(() => {
    console.log("Game starting");

    const canvas = document.getElementById("gameWorld");
    const ctx = canvas.getContext("2d");

    gameEngine.init(ctx);
    canvas.focus();

    if (mapData) {
      // Spawn player from the map and initialize map manager.
      const spawn = getSpawnPosition(mapData, MAP_SCALE, START_SPAWN);
      const player = new Player(gameEngine, spawn.x, spawn.y, PLAYER_SPEED);
      const mapManager = new MapManager(gameEngine, player, MAP_SCALE);

      // Camera follows the player.
      gameEngine.cameraTarget = player;
      gameEngine.addEntity(player);
      mapManager.setMap(mapData, MAP_PATH, START_SPAWN);
      gameEngine.addEntity(mapManager);
    } else {
      // Fallback spawn if map failed to load.
      const player = new Player(gameEngine, 400, 300, PLAYER_SPEED);
      gameEngine.cameraTarget = player;
      gameEngine.addEntity(player);
    }
    gameEngine.start();
    console.log("main.js loaded");
  });
}

loadGame().catch((error) => {
  console.error("Failed to load game assets", error);
});
