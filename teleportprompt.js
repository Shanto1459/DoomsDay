class TeleportPrompt {
  constructor(game) {
    this.game = game;
    this.btnYes = { x: 0, y: 0, w: 100, h: 40 };
    this.btnNo = { x: 0, y: 0, w: 100, h: 40 };
  }

  pointInRect(p, r) {
    return (
      p.x >= r.x &&
      p.x <= r.x + r.w &&
      p.y >= r.y &&
      p.y <= r.y + r.h
    );
  }

  update() {
    if (!this.game.pendingTeleport) return;

    // freeze movement while prompt is open
    this.game.keys = {};

    if (!this.game.click) return;

    const c = this.game.click;
    const tp = this.game.pendingTeleport;

    // YES button
    if (this.pointInRect(c, this.btnYes)) {
        this.game.pendingTeleport = null;
        this.game.click = null;

    if (tp && tp.mapManager && tp.portal) {
        tp.mapManager.transitionTo(tp.portal);
    }

    return;
    }

    // NO button
    if (this.pointInRect(c, this.btnNo)) {
      if (tp && tp.mapManager && tp.portal) {
        tp.mapManager.portalCooldown = 0.5;
        tp.mapManager.activePortalId = tp.portal.id;
      }

      this.game.pendingTeleport = null;
      this.game.click = null;
    }
  }

  draw(ctx) {
    if (!this.game.pendingTeleport) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, w, h);

    const panelW = 400;
    const panelH = 200;
    const x = w / 2 - panelW / 2;
    const y = h / 2 - panelH / 2;

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x, y, panelW, panelH);

    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, panelW, panelH);

    ctx.fillStyle = "white";
    ctx.font = "22px Arial";
    ctx.textAlign = "center";

    ctx.fillText("You are about to teleport.", w / 2, y + 60);
    ctx.fillText("Continue?", w / 2, y + 95);

    // YES button
    this.btnYes.x = w / 2 - 120;
    this.btnYes.y = y + 120;

    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(this.btnYes.x, this.btnYes.y, this.btnYes.w, this.btnYes.h);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.btnYes.x, this.btnYes.y, this.btnYes.w, this.btnYes.h);

    ctx.fillStyle = "white";
    ctx.fillText("YES", this.btnYes.x + this.btnYes.w / 2, this.btnYes.y + 27);

    // NO button
    this.btnNo.x = w / 2 + 20;
    this.btnNo.y = y + 120;

    ctx.fillStyle = "#b71c1c";
    ctx.fillRect(this.btnNo.x, this.btnNo.y, this.btnNo.w, this.btnNo.h);
    ctx.strokeStyle = "white";
    ctx.strokeRect(this.btnNo.x, this.btnNo.y, this.btnNo.w, this.btnNo.h);

    ctx.fillStyle = "white";
    ctx.fillText("NO", this.btnNo.x + this.btnNo.w / 2, this.btnNo.y + 27);

    ctx.restore();
  }
}