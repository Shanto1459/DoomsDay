const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload("./sprites/character/run/Character_down_run-Sheet6.png");
ASSET_MANAGER.queueDownload("./sprites/character/run/Character_up_run-Sheet6.png");
ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side-left_run-Sheet6.png");
ASSET_MANAGER.queueDownload("./sprites/character/run/Character_side_run-Sheet6.png");

ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_down_punch-Sheet4.png");
ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_up_punch-Sheet4.png");
ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side-left_punch-Sheet4.png");
ASSET_MANAGER.queueDownload("./sprites/character/punch/Character_side_punch-Sheet4.png");


ASSET_MANAGER.downloadAll(() => {
  console.log("Game starting");

  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");

  gameEngine.init(ctx);
  canvas.focus(); 

  gameEngine.addEntity(new TitleScreen(gameEngine));
  gameEngine.start();
  console.log("main.js loaded");

});
