function resolveMapAssetPath(mapPath, assetPath) {
  if (!assetPath) return assetPath;
  if (/^(?:https?:)?\/\//.test(assetPath)) return assetPath;
  if (assetPath.startsWith("/")) return assetPath;

  const slashIndex = mapPath.lastIndexOf("/");
  if (slashIndex === -1) return assetPath;
  const mapDir = mapPath.slice(0, slashIndex + 1);

  if (assetPath.startsWith("PostApocalypse_AssetPack_v1.1.2/")) {
    return mapDir + "../" + assetPath;
  }

  return mapDir + assetPath;
}

function getMapPixelSize(mapData, scale) {
  const mapScale = scale || 1;
  return {
    width: mapData.width * mapData.tilewidth * mapScale,
    height: mapData.height * mapData.tileheight * mapScale
  };
}

function findPlayerSpawn(mapData) {
  if (!mapData || !Array.isArray(mapData.layers)) return null;

  for (const layer of mapData.layers) {
    if (layer.type !== "objectgroup" || !Array.isArray(layer.objects)) continue;

    const layerTypeProp = (layer.properties || []).find(
      (prop) => prop.name === "type" && prop.value === "spawn"
    );

    for (const obj of layer.objects) {
      if (obj.name === "PlayerSpawn") return obj;
      if (layerTypeProp && obj.type === "PlayerSpawn") return obj;
    }
  }

  return null;
}

function getSpawnPosition(mapData, scale) {
  const spawn = findPlayerSpawn(mapData);
  if (!spawn) return { x: 0, y: 0 };

  const mapScale = scale || 1;
  return {
    x: spawn.x * mapScale,
    y: spawn.y * mapScale
  };
}

class TiledMapRenderer {
  constructor(game, mapData, mapPath, scale) {
    this.game = game;
    this.mapData = mapData;
    this.mapPath = mapPath;
    this.scale = scale || 1;
    this.missingImages = new Set();
    this.tilesets = (mapData.tilesets || []).map((tileset) => ({
      ...tileset,
      imagePath: resolveMapAssetPath(mapPath, tileset.image),
      tileImageMap: (tileset.tiles || []).reduce((acc, tile) => {
        if (tile.image) {
          acc[tile.id] = {
            imagePath: resolveMapAssetPath(mapPath, tile.image),
            width: tile.imagewidth,
            height: tile.imageheight
          };
        }
        return acc;
      }, {})
    }));
  }

  update() {}

  draw(ctx) {
    for (const layer of this.mapData.layers) {
      if (layer.type !== "tilelayer" || !layer.visible) continue;

      for (let i = 0; i < layer.data.length; i++) {
        const gid = layer.data[i];
        if (!gid) continue;

        const tileset = this.getTilesetForGid(gid);
        if (!tileset) continue;

        const tileIndex = gid - tileset.firstgid;
        const destX = (i % layer.width) * this.mapData.tilewidth * this.scale;
        const destY = Math.floor(i / layer.width) * this.mapData.tileheight * this.scale;

        if (tileset.imagePath) {
          const columns = tileset.columns;
          const srcX = (tileIndex % columns) * tileset.tilewidth;
          const srcY = Math.floor(tileIndex / columns) * tileset.tileheight;

          const image = ASSET_MANAGER.getAsset(tileset.imagePath);
          if (!image) {
            if (!this.missingImages.has(tileset.imagePath)) {
              console.warn("Missing tileset image:", tileset.imagePath);
              this.missingImages.add(tileset.imagePath);
            }
            continue;
          }

          ctx.drawImage(
            image,
            srcX,
            srcY,
            tileset.tilewidth,
            tileset.tileheight,
            destX,
            destY,
            tileset.tilewidth * this.scale,
            tileset.tileheight * this.scale
          );
        } else if (tileset.tileImageMap && tileset.tileImageMap[tileIndex]) {
          const tileImage = tileset.tileImageMap[tileIndex];
          const image = ASSET_MANAGER.getAsset(tileImage.imagePath);
          if (!image) {
            if (!this.missingImages.has(tileImage.imagePath)) {
              console.warn("Missing tile image:", tileImage.imagePath);
              this.missingImages.add(tileImage.imagePath);
            }
            continue;
          }

          ctx.drawImage(
            image,
            destX,
            destY,
            tileImage.width * this.scale,
            tileImage.height * this.scale
          );
        }
      }
    }
  }

  getTilesetForGid(gid) {
    let selected = null;
    for (const tileset of this.tilesets) {
      if (gid >= tileset.firstgid) selected = tileset;
    }
    return selected;
  }
}
