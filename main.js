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

  // Queue all zombie variants
queueZombieSkins(ASSET_MANAGER);

console.log("[ASSET QUEUE] zombie path:", Zombie.SPRITE_PATH);

  // Wait for character sprites, then start the engine.
ASSET_MANAGER.downloadAll(async () => {
console.log("Game starting");

const canvas = document.getElementById("gameWorld");
const ctx = canvas.getContext("2d");

gameEngine.init(ctx);
canvas.focus();
// Set world size (fallback if map didn't load)
gameEngine.worldWidth =
  (mapData && mapData.width ? mapData.width * mapData.tilewidth : 800) * MAP_SCALE;
gameEngine.worldHeight =
  (mapData && mapData.height ? mapData.height * mapData.tileheight : 600) * MAP_SCALE;

// Create player (simple default spawn)
const player = new Player(gameEngine, 400, 300, PLAYER_SPEED);
gameEngine.cameraTarget = player;
gameEngine.addEntity(player);

// Spawn zombies from Tiled markers if map loaded
if (mapData) {
  spawnZombiesFromMap(gameEngine, mapData, MAP_SCALE);
}

// Simple restart (reload page)
gameEngine.restart = async () => location.reload();
gameEngine.start();
console.log("main.js loaded");
});
}

loadGame().catch((error) => {
  console.error("Failed to load game assets", error);
});
