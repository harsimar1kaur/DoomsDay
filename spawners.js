function spawnZombiesFromMap(game, mapData, mapScale) {

  if (typeof Zombie === "undefined") {
    console.error("Zombie class not loaded. Check script order: zombie.js must load before spawners.js");
    return [];
  }

  const spawned = [];

  const variants = [
    {
      name: "small",
      width: 40,
      height: 55,
      speed: 85,
      damage: 8,
      maxHealth: 35
    },
    {
      name: "axe",
      width: 60,
      height: 90,
      speed: 70,
      damage: 12,
      maxHealth: 45
    },
    {
      name: "big",
      width: 75,
      height: 115,
      speed: 55,
      damage: 18,
      maxHealth: 75
    }
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const walk = (layers) => {
    for (const layer of layers || []) {

      if (layer.type === "group" && layer.layers) {
        walk(layer.layers);
      }

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

        const x = obj.x * mapScale;
        const y = obj.y * mapScale;
        const facing = getObjectProperty(obj, "facing") || "down";
        const player = game.cameraTarget;

        // -------------------------
        // BOSS SPAWN (Beth)
        // -------------------------
        if (marker.includes("boss")) {
          const boss = new BethBoss(game, player, x, y);
          game.addEntity(boss);
          spawned.push(boss);

          console.log("[SPAWNED] Beth Boss at", x, y);
          continue;
        }

        // -------------------------
        // NORMAL ZOMBIES
        // -------------------------
        if (!marker.includes("zombie")) continue;

        const v = pickRandom(variants);

        const z = new Zombie(game, player, x, y, {
          facing,
          variant: v.name,
          speed: v.speed,
          damage: v.damage,
          maxHealth: v.maxHealth,
          width: v.width,
          height: v.height
        });

        z.width = v.width;
        z.height = v.height;

        game.addEntity(z);
        spawned.push(z);

        console.log("[SPAWNED]", v.name, "zombie at", x, y);
      }
    }
  };

  walk(mapData.layers);
  return spawned;
}