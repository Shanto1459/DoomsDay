class HintArrow {
  constructor(game) {
    this.game = game;
    this.active = true;
    this.target = null;
    this.showZombieRadar = false;
    this.prevZDown = false;
  }

  setTarget(x, y, label = "Objective") {
    this.target = { x, y, label };
  }

  clearTarget() {
    this.target = null;
    this.active = true;
  }

  getMapManager() {
    return (this.game.entities || []).find(
      (e) => e && e.constructor && e.constructor.name === "MapManager"
    ) || null;
  }

  getPortalWorldPoint(mapManager, predicate) {
    if (!mapManager || !Array.isArray(mapManager.portals)) return null;
    const portal = mapManager.portals.find(predicate);
    if (!portal) return null;
    const scale = mapManager.mapScale || 1;
    return {
      x: (portal.x || 0) * scale,
      y: (portal.y || 0) * scale
    };
  }

  getKeyPickupWorldPoint() {
    const keyPickup = (this.game.entities || []).find(
      (e) =>
        e &&
        e.constructor &&
        e.constructor.name === "ItemPickup" &&
        !e.removeFromWorld &&
        e.itemId === "beth_house_key"
    );
    if (!keyPickup) return null;
    return {
      x: keyPickup.x + keyPickup.width / 2,
      y: keyPickup.y + keyPickup.height / 2
    };
  }

  getPortalToMainForest(mapManager) {
    return this.getPortalWorldPoint(mapManager, (portal) => {
      const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
      return targetMap.includes("mainforest");
    });
  }

  getBethDoorPoint(mapManager) {
    return this.getPortalWorldPoint(mapManager, (portal) => {
      const portalName = String(portal.name || "").toLowerCase();
      const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
      return portalName === "backtohouse" && targetMap.includes("bethhouse");
    });
  }

  getSewerPortalPoint(mapManager) {
    return this.getPortalWorldPoint(mapManager, (portal) => {
      const portalName = String(portal.name || "").toLowerCase();
      const targetMap = String(getObjectProperty(portal, "targetMap") || "").toLowerCase();
      return portalName === "sewer" || targetMap.includes("sewer");
    });
  }

  getAliveEnemies() {
    return (this.game.entities || []).filter(
      (e) =>
        e &&
        e.constructor &&
        (e.constructor.name === "Zombie" || e.constructor.name === "BethBoss") &&
        !e.removeFromWorld &&
        e.state !== "death"
    );
  }

  getNonSewerEnemyProgress() {
    const spawnIds = this.game.enemySpawnIds instanceof Set ? [...this.game.enemySpawnIds] : [];
    const defeatedIds = this.game.defeatedEnemyIds instanceof Set ? this.game.defeatedEnemyIds : new Set();
    const objectiveIds = spawnIds.filter((id) => !String(id).toLowerCase().includes("sewer"));
    let defeated = 0;
    for (const id of objectiveIds) {
      if (defeatedIds.has(id)) defeated += 1;
    }
    const total = objectiveIds.length;
    const alive = Math.max(0, total - defeated);
    return { total, defeated, alive };
  }

  getFinalExitPoint(mapManager) {
    if (!mapManager || !Array.isArray(mapManager.finalExits) || mapManager.finalExits.length === 0) return null;
    const exitObj = mapManager.finalExits[0];
    const scale = mapManager.mapScale || 1;
    const tileW = (mapManager.mapData && mapManager.mapData.tilewidth) || 16;
    const tileH = (mapManager.mapData && mapManager.mapData.tileheight) || 16;
    const width = ((exitObj.width || tileW) * scale);
    const height = ((exitObj.height || tileH) * scale);
    return {
      x: (exitObj.x || 0) * scale + width / 2,
      y: (exitObj.y || 0) * scale + height / 2
    };
  }

update() {
  const zDown = !!this.game.keys["z"];
  const zPressed = zDown && !this.prevZDown;
  this.prevZDown = zDown;
  if (zPressed) this.showZombieRadar = !this.showZombieRadar;

  const path = String(this.game.currentMapPath || "").toLowerCase();
  const mapManager = this.getMapManager();
  this.active = true;
  const progress = this.getNonSewerEnemyProgress();
  const mapCleared = progress.total > 0 && progress.alive <= 0;
  const finalExitPoint = this.getFinalExitPoint(mapManager);

  // After clearing the map objective, keep compass guiding the player to the final gate.
  if (!this.game.gameWon && mapCleared && finalExitPoint) {
    this.setTarget(finalExitPoint.x, finalExitPoint.y, "Final Gate");
    return;
  }

  // No guiding arrow on the starting bedroom map.
  if (path.includes("bedroom") || path === "") {
    this.clearTarget();
    return;
  }

  // Objective phase:
  // 1) Before checking Beth's door -> point to Beth's door.
  // 2) After locked door check, before key -> point to sewer (or key when in sewer).
  // 3) After key, before unlock -> point back to Beth's door.
  if (!this.game.hasTriedBethDoor) {
    const bethDoor = this.getBethDoorPoint(mapManager);
    const toMain = this.getPortalToMainForest(mapManager);
    if (bethDoor) {
      this.setTarget(bethDoor.x, bethDoor.y, "Beth's Door");
    } else if (toMain) {
      this.setTarget(toMain.x, toMain.y, "Go Outside");
    } else {
      this.clearTarget();
    }
    return;
  } else {
    if (!this.game.hasSewerKey) {
      if (path.includes("sewer")) {
        const key = this.getKeyPickupWorldPoint();
        if (key) {
          this.setTarget(key.x, key.y, "Beth's Key");
        } else {
          this.clearTarget();
        }
      } else {
        const sewerPortal = this.getSewerPortalPoint(mapManager);
        const toMain = this.getPortalToMainForest(mapManager);
        if (sewerPortal) {
          this.setTarget(sewerPortal.x, sewerPortal.y, "Sewer");
        } else if (toMain) {
          this.setTarget(toMain.x, toMain.y, "Go Outside");
        } else {
          this.clearTarget();
        }
      }
      return;
    }

    if (!this.game.bethDoorUnlocked) {
      const bethDoor = this.getBethDoorPoint(mapManager);
      const toMain = this.getPortalToMainForest(mapManager);
      if (bethDoor) {
        this.setTarget(bethDoor.x, bethDoor.y, "Unlock Beth's Door");
      } else if (toMain) {
        this.setTarget(toMain.x, toMain.y, "Go Outside");
      } else {
        this.clearTarget();
      }
      return;
    }
  }
  this.clearTarget();
}

  draw(ctx) {
    if (!this.active) return;

    const player = this.game.cameraTarget;
    if (!player) return;
    const hasObjectiveTarget = !!this.target;
    const showRadar = !!this.showZombieRadar;
    if (!hasObjectiveTarget && !showRadar) return;

    if (hasObjectiveTarget) {
      const dx = this.target.x - player.x;
      const dy = this.target.y - player.y;
      const angle = Math.atan2(dy, dx);
      const distance = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const arrowX = ctx.canvas.width - 70;
      const arrowY = 140;

      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle);
      ctx.scale(1.3, 1.3);
      // prettier arrow
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // main body
      ctx.beginPath();
      ctx.moveTo(26, 0);      // tip
      ctx.lineTo(-8, -12);    // upper inner
      ctx.lineTo(-2, 0);      // center notch
      ctx.lineTo(-8, 12);     // lower inner
      ctx.closePath();

      ctx.fillStyle = "#f4d03f";   // gold
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#2b1b0f"; // dark brown outline
      ctx.stroke();

      // inner highlight
      ctx.shadowColor = "transparent";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-4, -6);
      ctx.lineTo(0, 0);
      ctx.lineTo(-4, 6);
      ctx.closePath();

      ctx.fillStyle = "#fff3a6";
      ctx.fill();

      ctx.restore();

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 3;

      const text = `${this.target.label} (${Math.round(distance)})`;
      const labelX = arrowX;
      const labelY = arrowY + 28;

      ctx.strokeText(text, labelX, labelY);
      ctx.fillText(text, labelX, labelY);

      ctx.restore();
    }

    if (!showRadar) return;

    const enemies = this.getAliveEnemies();
    if (enemies.length === 0) return;

    const centerX = ctx.canvas.width - 80;
    const centerY = 230;
    const radius = 46;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,110,110,0.95)";
    ctx.fillText(`Z radar: ${enemies.length}`, centerX, centerY + radius + 12);

    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const angle = Math.atan2(dy, dx);
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-5, -4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,80,80,0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}