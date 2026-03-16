class HintArrow {
  constructor(game) {
    this.game = game;

    this.active = true;        // compass ON/OFF
    this.target = null;
<<<<<<< Updated upstream
    this.prevCDown = false;
=======

    this.showZombieRadar = false;

    this.prevZDown = false;
    this.prevCDown = false;    // track C key toggle
>>>>>>> Stashed changes
  }

  setTarget(x, y, label = "Objective") {
    this.target = { x, y, label };
  }

  clearTarget() {
    this.target = null;
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

  update() {
    const cDown = !!this.game.keys["c"];
    const cPressed = cDown && !this.prevCDown;

    if (cPressed) {
      this.active = !this.active;
    }

    this.prevCDown = cDown;

<<<<<<< Updated upstream
    if (!this.active) {
      this.target = null;
      return;
    }

    const path = String(this.game.currentMapPath || "").toLowerCase();
    const mapManager = this.getMapManager();

    // No guiding arrow on the starting bedroom map.
=======
  update() {
    const zDown = !!this.game.keys["z"];
    const zPressed = zDown && !this.prevZDown;
    this.prevZDown = zDown;
    if (zPressed) this.showZombieRadar = !this.showZombieRadar;

    // Toggle compass (C)
    const cDown = !!this.game.keys["c"];
    const cPressed = cDown && !this.prevCDown;
    this.prevCDown = cDown;
    if (cPressed) this.active = !this.active;

    const path = String(this.game.currentMapPath || "").toLowerCase();
    const mapManager = this.getMapManager();
    const progress = this.getNonSewerEnemyProgress();
    const mapCleared = progress.alive <= 0 && (progress.total > 0 || !!this.game.bossDefeated);
    const finalExitPoint = this.getFinalExitPoint(mapManager);

    // After clearing the map objective, keep compass guiding the player to the final gate.
    if (!this.game.gameWon && mapCleared && finalExitPoint) {
      this.setTarget(finalExitPoint.x, finalExitPoint.y, "Final Gate");
      return;
    }

>>>>>>> Stashed changes
    if (path.includes("bedroom") || path === "") {
      this.clearTarget();
      return;
    }

<<<<<<< Updated upstream
    // Objective phase:
    // 1) Before checking Beth's door -> point to Beth's door.
    // 2) After locked door check, before key -> point to sewer (or key when in sewer).
    // 3) After key, before unlock -> point back to Beth's door.
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
    this.clearTarget();
  }

  draw(ctx) {
<<<<<<< Updated upstream
    if (!this.active || !this.target) return;

    const player = this.game.cameraTarget;
    if (!player) return;

    const dx = this.target.x - player.x;
    const dy = this.target.y - player.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
=======
    const player = this.game.cameraTarget;
    if (!player) return;

    const hasObjectiveTarget = !!this.target;
    const showCompass = this.active && hasObjectiveTarget;
    const showRadar = !!this.showZombieRadar;

    if (!showCompass && !showRadar) return;

    if (showCompass) {
      const dx = this.target.x - player.x;
      const dy = this.target.y - player.y;
      const angle = Math.atan2(dy, dx);
      const distance = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const compassX = ctx.canvas.width - 86;
      const compassY = 146;
      const compassRadius = 36;

      // Compass body
      ctx.beginPath();
      ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(9, 13, 17, 0.74)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 222, 140, 0.9)";
      ctx.stroke();

      // Inner ring and crosshair
      ctx.beginPath();
      ctx.arc(compassX, compassY, compassRadius * 0.64, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 222, 140, 0.4)";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(compassX - compassRadius + 8, compassY);
      ctx.lineTo(compassX + compassRadius - 8, compassY);
      ctx.moveTo(compassX, compassY - compassRadius + 8);
      ctx.lineTo(compassX, compassY + compassRadius - 8);
      ctx.strokeStyle = "rgba(255, 222, 140, 0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal letters
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 240, 200, 0.95)";
      ctx.fillText("N", compassX, compassY - compassRadius - 9);
      ctx.fillText("E", compassX + compassRadius + 9, compassY);
      ctx.fillText("S", compassX, compassY + compassRadius + 9);
      ctx.fillText("W", compassX - compassRadius - 9, compassY);

      // Rotating objective needle
      ctx.save();
      ctx.translate(compassX, compassY);
      ctx.rotate(angle);
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 5;

      ctx.beginPath();
      ctx.moveTo(compassRadius - 8, 0);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fillStyle = "#ffd166";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#3d2c12";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // Objective label card
      const text = `${this.target.label} (${Math.round(distance)})`;
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textWidth = ctx.measureText(text).width;
      const cardWidth = Math.max(140, textWidth + 20);
      const cardHeight = 22;
      const cardX = compassX - cardWidth / 2;
      const cardY = compassY + compassRadius + 12;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      ctx.strokeStyle = "rgba(255, 230, 167, 0.85)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      ctx.fillStyle = "rgba(255,245,220,0.96)";
      ctx.fillText(text, compassX, cardY + cardHeight / 2);

      ctx.restore();
    }

    if (!showRadar) return;

    const enemies = this.getAliveEnemies();
    if (enemies.length === 0) return;

    const centerX = ctx.canvas.width - 80;
    const centerY = 295;
    const radius = 56;
    const innerRadius = radius - 8;
    const maxDetectDistance = 850;
>>>>>>> Stashed changes

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const arrowX = ctx.canvas.width - 70;
    const arrowY = 150;

    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.scale(1.0, 1.0);
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

    ctx.font = "12px monospace";
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
}