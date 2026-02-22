function drawHealthBar(ctx, currentHP, maxHP) {
  const width = 220;
  const height = 18;
  const margin = 20;

  // Bottom-left position
  const x = margin;
  const y = ctx.canvas.height - height - margin;

  // background
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

  // health percentage
  const percent = Math.max(0, Math.min(1, currentHP / maxHP));

  // color based on health
  if (percent > 0.6) ctx.fillStyle = "#2ecc71";
  else if (percent > 0.3) ctx.fillStyle = "#f1c40f";
  else ctx.fillStyle = "#e74c3c";

  ctx.fillRect(x, y, width * percent, height);

  // border
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, width, height);

  // text
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`HP: ${currentHP}/${maxHP}`, x + 6, y + 14);
}