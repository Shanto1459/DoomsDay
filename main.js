const gameEngine = new GameEngine();
const ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.downloadAll(() => {
  console.log("Game starting");

  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");

  gameEngine.init(ctx);
  canvas.focus();

  gameEngine.addEntity(new TitleScreen(gameEngine));

  gameEngine.start();
});
