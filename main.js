// Entry point: loads assets, then starts the game.
const gameEngine = new GameEngine({ cameraDebug: true });
const ASSET_MANAGER = new AssetManager();
const AUDIO = new AudioManager(); // music system

// Starting map + player config.
const MAP_PATH = "./maps/bedroom.tmj";
const MAP_SCALE = 4;
const START_SPAWN = "PlayerSpawn";
const PLAYER_SPEED = 140; 

window.addEventListener("click", () => {
  if (!AUDIO.unlocked) {
    AUDIO.unlock();
    AUDIO.playBGM("./audio/bgm.mp3");
  }
}, { once: true });

function setupSettingsUI(gameEngine) {
  const btn = document.getElementById("settingsBtn");
  const overlay = document.getElementById("settingsOverlay");
  const close1 = document.getElementById("settingsCloseBtn");
  const close2 = document.getElementById("settingsCloseBtn2");

  const slider = document.getElementById("volumeSlider");
  const valueLabel = document.getElementById("volumeValue");

  if (!btn || !overlay || !close1 || !close2 || !slider || !valueLabel) {
    console.warn("Settings UI elements not found in HTML.");
    return;
  }

  const open = () => {
    overlay.classList.remove("hidden");
    gameEngine.isPaused = true;
    gameEngine.keys = {}; // stop stuck movement
  };

  const close = () => {
    overlay.classList.add("hidden");
    gameEngine.isPaused = false;
    const canvas = document.getElementById("gameWorld");
    if (canvas) canvas.focus();
  };

  btn.addEventListener("click", open);
  close1.addEventListener("click", close);
  close2.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) close();
  });

  const applyVol = () => {
    const vol = Number(slider.value);
    valueLabel.textContent = String(vol);
    gameEngine.masterVolume = vol / 100;

    // update music volume
    AUDIO.setMasterVolume(gameEngine.masterVolume);
  };

  slider.addEventListener("input", applyVol);
  applyVol();
}

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

  // Player run sprites
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_down_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_up_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side-left_run-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side_run-Sheet6.png");

  // Player punch sprites
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_down_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_up_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
  ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side_punch-Sheet4.png");

  // Zombie sprites
  ASSET_MANAGER.queueDownload("./sprites/zombie/idle/Zombie_Axe_Side-left_Idle-Sheet6.png");
  ASSET_MANAGER.queueDownload("./sprites/zombie/walk/Zombie_Axe_Side-left_Walk-Sheet8.png");
  ASSET_MANAGER.queueDownload("./sprites/zombie/walk/Zombie_Axe_Side_Walk-Sheet8.png");
  ASSET_MANAGER.queueDownload("./sprites/zombie/walk/Zombie_Axe_Up_Walk-Sheet8.png");
  ASSET_MANAGER.queueDownload("./sprites/zombie/walk/Zombie_Axe_Down_Walk-Sheet8.png");

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

    // setup settings UI
    setupSettingsUI(gameEngine);

    if (mapData) {
      const spawn = getSpawnPosition(mapData, MAP_SCALE, START_SPAWN);
      const player = new Player(gameEngine, spawn.x, spawn.y, PLAYER_SPEED);
      const mapManager = new MapManager(gameEngine, player, MAP_SCALE);

      gameEngine.cameraTarget = player;
      gameEngine.addEntity(player);
      mapManager.setMap(mapData, MAP_PATH, START_SPAWN);
      gameEngine.addEntity(mapManager);
    } else {
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
