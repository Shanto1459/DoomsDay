// Entry point: loads assets, then starts the game.
const DEBUG_MODE = true;
const gameEngine = new GameEngine({ cameraDebug: true, debugging: DEBUG_MODE });
gameEngine.debug = DEBUG_MODE;
const ASSET_MANAGER = new AssetManager();

// Starting map + player config.
const MAP_PATH = "./maps/bedroom.tmj";
const MAP_SCALE = 4;
const START_SPAWN = "PlayerSpawn";
const PLAYER_SPEED = 140; // pixels per second
const ZOMBIE_COUNT = 1;

let currentPlayer = null;
let currentMapManager = null;

function removeZombies() {
  gameEngine.entities = gameEngine.entities.filter(
    (e) => !(e && e.constructor && e.constructor.name === "Zombie")
  );
}

function keepMapManagerLast() {
  const entities = gameEngine.entities || [];
  const idx = entities.findIndex((e) => e && e.constructor && e.constructor.name === "MapManager");
  if (idx < 0) return;
  const mapManager = entities.splice(idx, 1)[0];
  entities.push(mapManager);
}

function isMapZombieEnabled(mapPath, mapData) {
  const mapProp = (mapData && mapData.properties || []).find((p) => p.name === "zombiesEnabled");
  if (mapProp) return !!mapProp.value;
  const path = (mapPath || "").toLowerCase();
  // Bedroom/inside map is always safe.
  if (path.includes("bedroom")) return false;
  return true;
}

function isZombieSpawnValid(x, y, zombieWidth, zombieHeight, player) {
  if (x < 0 || y < 0) return false;
  if (x + zombieWidth > gameEngine.worldWidth || y + zombieHeight > gameEngine.worldHeight) return false;
  if (gameEngine.collisionGrid && gameEngine.collisionGrid.isBlockedRect(x, y, zombieWidth, zombieHeight)) return false;
  if (player) {
    const dx = x - player.x;
    const dy = y - player.y;
    if (Math.hypot(dx, dy) < 80) return false;
  }
  return true;
}

function spawnZombies(player, mapPath, mapData) {
  removeZombies();

  const enabled = isMapZombieEnabled(mapPath, mapData);
  gameEngine.zombiesEnabled = enabled;

  if (!enabled) {
    keepMapManagerLast();
    return;
  }

  // Spawn zombies from Tiled object markers (type/name includes "zombie")
  const spawned = spawnZombiesFromMap(gameEngine, mapData, MAP_SCALE);

  if (DEBUG_MODE) {
    console.log("Zombies spawned from map:", spawned.length, "on map:", mapPath || "(unknown)");
  }

  keepMapManagerLast();
}


async function loadMapData(mapPath) {
  const mapResponse = await fetch(mapPath);
  if (!mapResponse.ok) {
    throw new Error(`Map fetch failed: ${mapResponse.status}`);
  }
  return mapResponse.json();
}

async function setupWorld(mapPath, spawnName) {
  let mapData = null;
  try {
    mapData = await loadMapData(mapPath);
  } catch (error) {
    console.error("Map failed to load, starting without map.", error);
  }

  gameEngine.entities = [];
  gameEngine.activeDialog = null;
  gameEngine.paused = false;
  gameEngine.gameOver = false;
  gameEngine.keys = {};
  gameEngine.zombiesEnabled = false;

  if (mapData) {
    const tilePaths = collectTilesetImagePaths(mapData, mapPath);
    const result = await preloadImages(tilePaths);
    console.log("Tileset images loaded:", result.loaded, "failed:", result.failed);

    const spawn = getSpawnPosition(mapData, MAP_SCALE, spawnName);
    const player = new Player(gameEngine, spawn.x, spawn.y, PLAYER_SPEED);
    const mapManager = new MapManager(gameEngine, player, MAP_SCALE);
    gameEngine.onMapChanged = (newMapPath, newMapData) => {
      gameEngine.zombiesEnabled = isMapZombieEnabled(newMapPath, newMapData);
      spawnZombies(player, newMapPath, newMapData);
    };

    mapManager.setMap(mapData, mapPath, spawnName);
    gameEngine.cameraTarget = player;
    gameEngine.addEntity(player);
    // Map manager is added last because engine draws in reverse order.
    // This makes the map draw first (background), then zombies, then player.
    gameEngine.addEntity(mapManager);

    currentPlayer = player;
    currentMapManager = mapManager;
  } else {
    const player = new Player(gameEngine, 400, 300, PLAYER_SPEED);
    gameEngine.cameraTarget = player;
    gameEngine.addEntity(player);
    gameEngine.zombiesEnabled = false;
    currentPlayer = player;
    currentMapManager = null;
  }
}

// Loads the map JSON, preloads tiles, then starts the game loop.
async function loadGame() {
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_down_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_up_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side-left_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side_run-Sheet6.png");

  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_down_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_up_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side_punch-Sheet4.png");
  

  // Queue all zombie variants
ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Enemies/Zombie_Small/Zombie_Small_Down_walk-Sheet6.png");
ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Enemies/Zombie_Axe/Zombie_Axe_Down_Walk-Sheet8.png");
ASSET_MANAGER.queueDownload("./PostApocalypse_AssetPack_v1.1.2/Enemies/Zombie_Big/Zombie_Big_Down_Walk-Sheet8.png");

  console.log("[ASSET QUEUE] zombie path:", Zombie.SPRITE_PATH);

  // Wait for character sprites, then start the engine.
  ASSET_MANAGER.downloadAll(async () => {
    console.log("Game starting");

    const canvas = document.getElementById("gameWorld");
    const ctx = canvas.getContext("2d");

    gameEngine.init(ctx);
    canvas.focus();

    await setupWorld(MAP_PATH, START_SPAWN);

    // Restart resets player/map/zombies and clears temporary state.
    gameEngine.restart = async () => {
      await setupWorld(MAP_PATH, START_SPAWN);
    };

    gameEngine.start();
    console.log("main.js loaded");
  });
}

loadGame().catch((error) => {
  console.error("Failed to load game assets", error);
});
