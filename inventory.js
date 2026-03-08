// inventory.js — Center popup inventory (toggle with I key)
// Aesthetic: post-apocalyptic worn notebook / field kit — dark, gritty, functional.

class Inventory {
  constructor(game, player) {
    this.game = game;
    this.player = player;
    this.isOpen = false;
    this.removeFromWorld = false;

    this.prevIDown = false;

    // Panel dimensions (calculated on first draw)
    this.panelW = 520;
    this.panelH = 420;
    this.panelX = 0;
    this.panelY = 0;

    // Slot layout
    this.slotSize = 72;
    this.slotPad = 12;
    this.slotsPerRow = 5;

    // Hovered / selected slot index (for tooltip)
    this.hoveredSlot = -1;

    // All possible items the inventory knows about
    // Add more here as you add items to the game
    this.ITEM_DEFS = {
      fist: {
        id: "fist",
        label: "Fists",
        type: "weapon",
        hotkey: "1",
        damage: 18,
        range: 62,
        description: "Your bare hands.\nNot great, but free.",
        spritePath: null,   // drawn as emoji/text fallback
        emoji: "✊"
      },
      bat: {
        id: "bat",
        label: "Baseball Bat",
        type: "weapon",
        hotkey: "2",
        damage: 32,
        range: 92,
        description: "A trusty bat.\nHits hard, good reach.",
        spritePath: "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Bat.png",
        emoji: "🏏"
      },
      knife: {
        id: "knife",
        label: "Knife",
        type: "weapon",
        hotkey: "3",
        damage: 24,
        range: 76,
        description: "Fast and precise.\nGood for tight spaces.",
        spritePath: "./PostApocalypse_AssetPack_v1.1.2/Objects/Pickable/Knife.png",
        emoji: "🔪"
      },
      healthpack: {
        id: "healthpack",
        label: "Health Pack",
        type: "consumable",
        hotkey: "4",
        healAmount: 40,
        description: "Restores 40 HP.\nPress 4 or click Use.",
        spritePath: null,
        emoji: "💊"
      }
    };

    // Buttons per slot (populated in draw)
    this._slotRects = [];
    this._dropBtnRect = null;
    this._useBtnRect = null;
    this._closeBtnRect = { x: 0, y: 0, w: 28, h: 28 };

    // Currently selected slot index in the rendered list
    this.selectedSlotIdx = -1;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.game.keys = {};
      this.selectedSlotIdx = -1;
      this.hoveredSlot = -1;
    }
    this.game.ignoreClicksUntil = performance.now() + 120;
    this.game.click = null;
  }

  pointInRect(p, r) {
    return p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // Returns ordered list of slots to display:
  // fist is always slot 0 (always available), then items in inventory
  getSlots() {
    const slots = [];

    // Fist always available
    slots.push({ def: this.ITEM_DEFS.fist, owned: true, alwaysAvailable: true });

    // Weapons from inventory
    const weaponOrder = ["bat", "knife"];
    for (const id of weaponOrder) {
      if (this.player.inventory[id]) {
        slots.push({ def: this.ITEM_DEFS[id], owned: true });
      }
    }

    // Consumables from inventory
    const consumableOrder = ["healthpack"];
    for (const id of consumableOrder) {
      if (this.player.inventory[id]) {
        const qty = this.player.inventory[id];
        slots.push({ def: this.ITEM_DEFS[id], owned: true, qty: typeof qty === "number" ? qty : 1 });
      }
    }

    return slots;
  }

  getSelectedSlot() {
    const slots = this.getSlots();
    if (this.selectedSlotIdx < 0 || this.selectedSlotIdx >= slots.length) return null;
    return slots[this.selectedSlotIdx];
  }

  isEquipped(def) {
    if (def.id === "fist") return !this.player.equippedWeapon;
    return this.player.equippedWeapon === def.id;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  equipSlot(slot) {
    if (!slot) return;
    const def = slot.def;
    if (def.type === "weapon") {
      if (def.id === "fist") {
        this.player.equippedWeapon = null;
      } else {
        this.player.equippedWeapon = def.id;
      }
    }
  }

  dropSelected() {
    const slot = this.getSelectedSlot();
    if (!slot || slot.alwaysAvailable) return; // can't drop fists
    this.player.removeItem(slot.def.id);
    // Remove from collectedItems so it can be picked up again if desired
    if (this.game.collectedItems) {
      for (const key of [...this.game.collectedItems]) {
        if (key.endsWith(`:${slot.def.id}`)) {
          this.game.collectedItems.delete(key);
        }
      }
    }
    this.selectedSlotIdx = -1;
  }

  useSelected() {
    const slot = this.getSelectedSlot();
    if (!slot) return;
    const def = slot.def;

    if (def.type === "consumable") {
      if (def.id === "healthpack") {
        const healed = Math.min(def.healAmount, this.player.maxHealth - this.player.health);
        this.player.health = Math.min(this.player.maxHealth, this.player.health + def.healAmount);
        this.game.showDialogue(`Used Health Pack! +${healed} HP`, 2000);
        // Decrement quantity
        if (typeof this.player.inventory[def.id] === "number") {
          this.player.inventory[def.id]--;
          if (this.player.inventory[def.id] <= 0) {
            this.player.removeItem(def.id);
            this.selectedSlotIdx = -1;
          }
        } else {
          this.player.removeItem(def.id);
          this.selectedSlotIdx = -1;
        }
      }
    } else if (def.type === "weapon") {
      this.equipSlot(slot);
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update() {
    const keys = this.game.keys;

    // Toggle I (press once)
    const iDown = !!keys["i"];
    const iPressed = iDown && !this.prevIDown;
    this.prevIDown = iDown;

    if (iPressed && !this.game.gameOver && !this.game.gameWon) {
      this.toggle();
      return;
    }

    // Number key weapon switching — works even when inventory is CLOSED
    if (!this.game.gameOver && !this.game.gameWon && !this.game.paused) {
      if (keys["1"]) { this.player.equippedWeapon = null;      keys["1"] = false; }
      if (keys["2"] && this.player.inventory["bat"])   { this.player.equippedWeapon = "bat";   keys["2"] = false; }
      if (keys["3"] && this.player.inventory["knife"]) { this.player.equippedWeapon = "knife"; keys["3"] = false; }
      if (keys["4"] && this.player.inventory["healthpack"]) {
        // Quick-use health pack with 4
        const hp = this.player.inventory["healthpack"];
        if (hp) {
          const healed = Math.min(40, this.player.maxHealth - this.player.health);
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
          this.game.showDialogue(`Used Health Pack! +${healed} HP`, 2000);
          if (typeof hp === "number") {
            this.player.inventory["healthpack"]--;
            if (this.player.inventory["healthpack"] <= 0) this.player.removeItem("healthpack");
          } else {
            this.player.removeItem("healthpack");
          }
        }
        keys["4"] = false;
      }
    }

    if (!this.isOpen) return;

    // While open: freeze gameplay
    this.game.keys = {};

    // Mouse hover
    if (this.game.mouse) {
      this.hoveredSlot = -1;
      const m = this.game.mouse;
      for (let i = 0; i < this._slotRects.length; i++) {
        const r = this._slotRects[i];
        if (this.pointInRect(m, r)) { this.hoveredSlot = i; break; }
      }
    }

    // Clicks
    if (this.game.click) {
      const c = this.game.click;
      this.game.click = null;

      // Close button
      if (this.pointInRect(c, this._closeBtnRect)) {
        this.toggle();
        return;
      }

      // Slot click → select
      for (let i = 0; i < this._slotRects.length; i++) {
        if (this.pointInRect(c, this._slotRects[i])) {
          this.selectedSlotIdx = i;

          // Single-click equip for weapons
          const slots = this.getSlots();
          const slot = slots[i];
          if (slot && slot.def.type === "weapon") this.equipSlot(slot);
          return;
        }
      }

      // Drop button
      if (this._dropBtnRect && this.pointInRect(c, this._dropBtnRect)) {
        this.dropSelected();
        return;
      }

      // Use button
      if (this._useBtnRect && this.pointInRect(c, this._useBtnRect)) {
        this.useSelected();
        return;
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.isOpen) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Panel position (centered)
    this.panelX = Math.round((W - this.panelW) / 2);
    this.panelY = Math.round((H - this.panelH) / 2);
    const px = this.panelX;
    const py = this.panelY;
    const pw = this.panelW;
    const ph = this.panelH;

    // ── Background dim
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, W, H);

    // ── Panel background (dark weathered look)
    ctx.fillStyle = "#1a1209";
    ctx.fillRect(px, py, pw, ph);

    // Grungy border — double line
    ctx.strokeStyle = "#5a3e1b";
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);
    ctx.strokeStyle = "#8b6234";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 4, py + 4, pw - 8, ph - 8);

    // Corner rivets
    this._drawRivet(ctx, px + 10, py + 10);
    this._drawRivet(ctx, px + pw - 10, py + 10);
    this._drawRivet(ctx, px + 10, py + ph - 10);
    this._drawRivet(ctx, px + pw - 10, py + ph - 10);

    // ── Title
    ctx.font = "bold 28px Creepster";
    ctx.fillStyle = "#c8982a";
    ctx.textAlign = "left";
    ctx.fillText("INVENTORY", px + 20, py + 38);

    // Hotkey reminder
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(180,150,80,0.6)";
    ctx.fillText("1=Fist  2=Bat  3=Knife  4=Healthpack  [I] close", px + 20, py + 55);

    // Divider
    ctx.strokeStyle = "#5a3e1b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 14, py + 62);
    ctx.lineTo(px + pw - 14, py + 62);
    ctx.stroke();

    // ── Close button (X)
    this._closeBtnRect = { x: px + pw - 34, y: py + 10, w: 24, h: 24 };
    ctx.fillStyle = "rgba(180,40,40,0.75)";
    ctx.fillRect(this._closeBtnRect.x, this._closeBtnRect.y, this._closeBtnRect.w, this._closeBtnRect.h);
    ctx.strokeStyle = "#ff6666";
    ctx.lineWidth = 1;
    ctx.strokeRect(this._closeBtnRect.x, this._closeBtnRect.y, this._closeBtnRect.w, this._closeBtnRect.h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("✕", this._closeBtnRect.x + 12, this._closeBtnRect.y + 17);

    // ── Slots
    const slots = this.getSlots();
    this._slotRects = [];
    const startX = px + 18;
    const startY = py + 74;

    for (let i = 0; i < slots.length; i++) {
      const col = i % this.slotsPerRow;
      const row = Math.floor(i / this.slotsPerRow);
      const sx = startX + col * (this.slotSize + this.slotPad);
      const sy = startY + row * (this.slotSize + this.slotPad);
      const r = { x: sx, y: sy, w: this.slotSize, h: this.slotSize };
      this._slotRects.push(r);

      const slot = slots[i];
      const equipped = this.isEquipped(slot.def);
      const selected = this.selectedSlotIdx === i;
      const hovered = this.hoveredSlot === i;

      this._drawSlot(ctx, r, slot, equipped, selected, hovered);
    }

    // ── Detail panel (right side)
    const detailX = startX + this.slotsPerRow * (this.slotSize + this.slotPad) + 4;
    const detailW = pw - (detailX - px) - 18;
    const detailY = startY;
    const detailH = ph - (startY - py) - 14;

    this._drawDetailPanel(ctx, detailX, detailY, detailW, detailH, slots);

    ctx.restore();
  }

  _drawSlot(ctx, r, slot, equipped, selected, hovered) {
    const def = slot.def;

    // Slot background
    let bgColor = "rgba(30,20,8,0.9)";
    if (equipped) bgColor = "rgba(60,100,30,0.85)";
    else if (selected) bgColor = "rgba(80,60,15,0.9)";
    else if (hovered) bgColor = "rgba(50,38,14,0.9)";

    ctx.fillStyle = bgColor;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // Border
    let borderColor = "#3a2a0a";
    if (equipped) borderColor = "#7abf3a";
    else if (selected) borderColor = "#c8982a";
    else if (hovered) borderColor = "#7a6030";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = equipped ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Equipped glow
    if (equipped) {
      ctx.strokeStyle = "rgba(120,200,50,0.25)";
      ctx.lineWidth = 4;
      ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    }

    // Item image or emoji fallback
    const sprite = def.spritePath ? ASSET_MANAGER.getAsset(def.spritePath) : null;
    const spriteReady = !!(sprite && sprite.complete && sprite.naturalWidth > 0);

    if (spriteReady) {
      const imgPad = 8;
      ctx.drawImage(sprite, r.x + imgPad, r.y + imgPad, r.w - imgPad * 2, r.h - imgPad * 2);
    } else {
      // Emoji fallback
      ctx.font = `${Math.round(r.w * 0.45)}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(def.emoji || "?", r.x + r.w / 2, r.y + r.h / 2 + Math.round(r.w * 0.16));
    }

    // Hotkey badge (top-left)
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(r.x + 2, r.y + 2, 16, 16);
    ctx.fillStyle = equipped ? "#aee86c" : "#a08050";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(def.hotkey, r.x + 10, r.y + 13);

    // Quantity badge (bottom-right) for consumables
    if (slot.qty && slot.qty > 1) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(r.x + r.w - 20, r.y + r.h - 18, 19, 17);
      ctx.fillStyle = "#e8c86c";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`x${slot.qty}`, r.x + r.w - 10, r.y + r.h - 5);
    }

    // "EQUIPPED" label
    if (equipped) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(r.x, r.y + r.h - 17, r.w, 17);
      ctx.fillStyle = "#aee86c";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EQUIPPED", r.x + r.w / 2, r.y + r.h - 5);
    }
  }

  _drawDetailPanel(ctx, x, y, w, h, slots) {
    // Panel bg
    ctx.fillStyle = "rgba(20,13,4,0.85)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#3a2a0a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const slot = this.selectedSlotIdx >= 0 ? slots[this.selectedSlotIdx] : null;

    if (!slot) {
      ctx.fillStyle = "rgba(140,110,60,0.4)";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Select an item", x + w / 2, y + h / 2 - 8);
      ctx.fillText("to see details", x + w / 2, y + h / 2 + 10);
      this._dropBtnRect = null;
      this._useBtnRect = null;
      return;
    }

    const def = slot.def;
    const pad = 12;
    let ty = y + pad + 16;

    // Item name
    ctx.font = "bold 17px Creepster";
    ctx.fillStyle = "#e8c86c";
    ctx.textAlign = "left";
    ctx.fillText(def.label, x + pad, ty);
    ty += 24;

    // Type badge
    const typeColor = def.type === "weapon" ? "#c05050" : "#50a050";
    ctx.fillStyle = typeColor;
    ctx.fillRect(x + pad, ty - 13, 58, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(def.type.toUpperCase(), x + pad + 29, ty);
    ty += 20;

    // Divider
    ctx.strokeStyle = "#3a2a0a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + pad, ty);
    ctx.lineTo(x + w - pad, ty);
    ctx.stroke();
    ty += 12;

    // Stats
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    if (def.type === "weapon") {
      ctx.fillStyle = "#e06060";
      ctx.fillText(`DMG  ${def.damage}`, x + pad, ty); ty += 18;
      ctx.fillStyle = "#60a0e0";
      ctx.fillText(`RNG  ${def.range}px`, x + pad, ty); ty += 18;
    } else if (def.type === "consumable" && def.healAmount) {
      ctx.fillStyle = "#60e090";
      ctx.fillText(`HEAL +${def.healAmount} HP`, x + pad, ty); ty += 18;
    }
    ty += 6;

    // Description (word-wrap)
    ctx.fillStyle = "rgba(200,180,130,0.85)";
    ctx.font = "11px monospace";
    const descLines = (def.description || "").split("\n");
    for (const line of descLines) {
      ctx.fillText(line, x + pad, ty);
      ty += 16;
    }
    ty += 8;

    // Hotkey reminder
    ctx.fillStyle = "rgba(140,110,60,0.7)";
    ctx.font = "10px monospace";
    ctx.fillText(`Hotkey: [${def.hotkey}]`, x + pad, ty);
    ty += 22;

    // ── Action buttons
    const btnW = w - pad * 2;
    const btnH = 28;

    // Use / Equip button
    const useLabel = def.type === "consumable" ? "USE" : "EQUIP";
    const useColor = this.isEquipped(def) ? "#3a5a1a" : "#2a4a10";
    const useBorderColor = this.isEquipped(def) ? "#7abf3a" : "#5a8a2a";
    this._useBtnRect = { x: x + pad, y: ty, w: btnW, h: btnH };
    ctx.fillStyle = useColor;
    ctx.fillRect(x + pad, ty, btnW, btnH);
    ctx.strokeStyle = useBorderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + pad, ty, btnW, btnH);
    ctx.fillStyle = this.isEquipped(def) ? "#aee86c" : "#c8e890";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.isEquipped(def) ? "✓ EQUIPPED" : useLabel, x + pad + btnW / 2, ty + 19);
    ty += btnH + 8;

    // Drop button (not for fists)
    if (!slot.alwaysAvailable) {
      this._dropBtnRect = { x: x + pad, y: ty, w: btnW, h: btnH };
      ctx.fillStyle = "rgba(80,20,10,0.85)";
      ctx.fillRect(x + pad, ty, btnW, btnH);
      ctx.strokeStyle = "#a03030";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + pad, ty, btnW, btnH);
      ctx.fillStyle = "#e07060";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("DROP", x + pad + btnW / 2, ty + 19);
    } else {
      this._dropBtnRect = null;
    }
  }

  _drawRivet(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#8b6234";
    ctx.fill();
    ctx.strokeStyle = "#c8982a";
    ctx.lineWidth = 1;
    ctx.stroke();

    // shine
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,120,0.5)";
    ctx.fill();
  }
}
