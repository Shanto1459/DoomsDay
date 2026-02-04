function spawnZombiesFromMap(game, mapData, mapScale) {
  const spawned = [];

  const walk = (layers) => {
    for (const layer of layers || []) {
      if (layer.type === "group" && layer.layers) walk(layer.layers);

      if (layer.type !== "objectgroup") continue;

      for (const obj of layer.objects || []) {
        const markerRaw =
        getObjectProperty(obj, "type") ||
        getObjectProperty(obj, "entity") ||   
        obj.class ||
        obj.type ||
        obj.name ||
        "";


        const marker = String(markerRaw).trim().toLowerCase();

        console.log("SPAWN OBJ:", obj.name, {
        typeProp: getObjectProperty(obj, "type"),
        class: obj.class,
        type: obj.type,
        marker
        });

        if (!marker.includes("zombie")) continue;



        const x = obj.x * mapScale;
        const y = obj.y * mapScale; 
        console.log("SPAWN ZOMBIE AT:", { x, y, rawX: obj.x, rawY: obj.y, mapScale });
        const facing = getObjectProperty(obj, "facing") || "down";

        const z = new Zombie(game, x, y, facing);
        game.addEntity(z);
        spawned.push(z);
      }
    }
  };

  walk(mapData.layers);
  return spawned;
}
