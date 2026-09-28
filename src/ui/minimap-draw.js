// Minimap canvas primitives: dots, rings, labels, edge arrows. Pure 2D-context helpers.
const FONT = '600 9px Orbitron, Rajdhani, sans-serif';

export function dot(ctx, x, z, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, z, r, 0, Math.PI * 2);
  ctx.fill();
}

export function glowDot(ctx, x, z, r, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  dot(ctx, x, z, r, color);
  ctx.restore();
}

export function ring(ctx, x, z, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, z, r, 0, Math.PI * 2);
  ctx.stroke();
}

export function text(ctx, str, x, y, align, color) {
  ctx.font = FONT;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Triangle on the square map's border, pointing from the center toward (x, z).
export function edgeArrow(ctx, size, x, z, color) {
  const h = size / 2;
  const a = Math.atan2(z - h, x - h);
  const t = (h - 7) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
  ctx.save();
  ctx.translate(h + Math.cos(a) * t, h + Math.sin(a) * t);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-3, -4);
  ctx.lineTo(-3, 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// Arrow pointing up (-y) rotated by rot radians clockwise; optional cyan halo.
export function shipArrow(ctx, x, z, rot, color, halo) {
  if (halo) ring(ctx, x, z, 9, halo);
  ctx.save();
  ctx.translate(x, z);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 2.5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();
}
