// Vector Illustrated Landmark Drawers in Retro Poster Style with Idle Micro-Animations

// Helper: draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawNationalTheatre(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, 14, 28, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Circular podium / base
  ctx.beginPath();
  ctx.ellipse(0, 10, 24, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#b89c74';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#221e18';
  ctx.stroke();

  // Colonnade base drum
  ctx.fillStyle = '#d8c29d';
  ctx.fillRect(-20, 3, 40, 8);
  ctx.strokeRect(-20, 3, 40, 8);

  // Vertical columns
  ctx.strokeStyle = '#221e18';
  ctx.lineWidth = 1.2;
  for (let c = -16; c <= 16; c += 8) {
    ctx.beginPath();
    ctx.moveTo(c, 3);
    ctx.lineTo(c, 11);
    ctx.stroke();
  }

  // The distinctive peaked cap / military hat roof (inverted cone with peaks)
  ctx.beginPath();
  ctx.moveTo(-22, 3);
  ctx.lineTo(-24, -4);
  ctx.lineTo(-14, -12);
  ctx.lineTo(0, -18); // center peak
  ctx.lineTo(14, -12);
  ctx.lineTo(24, -4);
  ctx.lineTo(22, 3);
  ctx.closePath();
  ctx.fillStyle = '#c48938';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#18120c';
  ctx.stroke();

  // Roof facets / folds
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-8, 3);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 3);
  ctx.moveTo(0, -18);
  ctx.lineTo(8, 3);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Idle Animation: Top beacon / crown spotlight
  const beaconPulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.beginPath();
  ctx.arc(0, -19, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 220, 100, ${0.7 + 0.3 * beaconPulse})`;
  ctx.fill();
  ctx.strokeStyle = '#d44a28';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ambient beacon glow ring
  ctx.beginPath();
  ctx.arc(0, -19, 4 + 3 * beaconPulse, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 215, 60, ${0.4 * (1 - beaconPulse)})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

export function drawCocoaHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(3, 15, 14, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // 26-storey Tower Body
  const tw = 16;
  const th = 38;
  ctx.fillStyle = '#6b3e20'; // Cocoa brown
  ctx.fillRect(-tw / 2, 12 - th, tw, th);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#1a1008';
  ctx.strokeRect(-tw / 2, 12 - th, tw, th);

  // Vertical terracotta facade fins
  ctx.fillStyle = '#c48938';
  ctx.fillRect(-tw / 2 + 2, 12 - th + 2, 4, th - 4);
  ctx.fillRect(tw / 2 - 6, 12 - th + 2, 4, th - 4);

  // Window grid lines
  ctx.strokeStyle = 'rgba(255, 230, 180, 0.5)';
  ctx.lineWidth = 0.8;
  for (let f = 12 - th + 5; f < 10; f += 4) {
    ctx.beginPath();
    ctx.moveTo(-tw / 2 + 2, f);
    ctx.lineTo(tw / 2 - 2, f);
    ctx.stroke();
  }

  // Rooftop plant room & communications antenna
  ctx.fillStyle = '#4a2810';
  ctx.fillRect(-4, 12 - th - 5, 8, 5);
  ctx.strokeRect(-4, 12 - th - 5, 8, 5);

  // Antenna mast
  ctx.beginPath();
  ctx.moveTo(0, 12 - th - 5);
  ctx.lineTo(0, 12 - th - 16);
  ctx.strokeStyle = '#221e18';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Idle Animation: Pulsing red aviation hazard light
  const redBlink = Math.sin(time * 4) > 0 ? 1 : 0.2;
  ctx.beginPath();
  ctx.arc(0, 12 - th - 16, 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(230, 40, 40, ${redBlink})`;
  ctx.fill();

  ctx.restore();
}

export function drawKanoDyePits(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Earthen ground platform
  ctx.beginPath();
  ctx.ellipse(0, 4, 24, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#b8905e';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2e2010';
  ctx.stroke();

  // Circular dye vats (pits dug in ground)
  const pits = [
    { x: -12, y: 0, r: 6 },
    { x: 2, y: 7, r: 5.5 },
    { x: 12, y: -2, r: 6 },
    { x: -2, y: -6, r: 5 },
  ];

  pits.forEach((p, idx) => {
    // Earthen rim
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.65, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8c6840';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#22140a';
    ctx.stroke();

    // Deep indigo liquid with subtle ripple
    const ripple = 0.5 + 0.3 * Math.sin(time * 2 + idx);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * 0.75, p.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1c2e4a'; // deep indigo
    ctx.fill();

    // Indigo highlight
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 1, (p.r * 0.4) * ripple, (p.r * 0.25) * ripple, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3a6ea5';
    ctx.fill();
  });

  // Wooden drying rack with draped indigo fabric
  ctx.strokeStyle = '#4a321e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.lineTo(-16, -18);
  ctx.moveTo(16, -4);
  ctx.lineTo(16, -18);
  ctx.moveTo(-18, -17);
  ctx.lineTo(18, -17);
  ctx.stroke();

  // Idle Animation: Hanging indigo fabrics swaying gently
  const sway = Math.sin(time * 2.5) * 2;
  ctx.fillStyle = '#203c68';
  ctx.beginPath();
  ctx.moveTo(-10, -17);
  ctx.lineTo(-4, -17);
  ctx.lineTo(-4 + sway, -8);
  ctx.lineTo(-10 + sway, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#d44a28'; // terracotta accent cloth
  ctx.beginPath();
  ctx.moveTo(2, -17);
  ctx.lineTo(8, -17);
  ctx.lineTo(8 + sway * 0.8, -7);
  ctx.lineTo(2 + sway * 0.8, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawNationalMosque(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 14, 26, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Mosque main hall base
  ctx.fillStyle = '#ede8dd';
  roundRect(ctx, -16, -2, 32, 14, 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1e1c18';
  ctx.stroke();

  // Arched entrance arcade
  ctx.fillStyle = '#c48938';
  for (let a = -10; a <= 10; a += 10) {
    ctx.beginPath();
    ctx.arc(a, 6, 3.5, Math.PI, 0);
    ctx.lineTo(a + 3.5, 12);
    ctx.lineTo(a - 3.5, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Golden Central Dome
  ctx.beginPath();
  ctx.arc(0, -2, 11, Math.PI, 0);
  ctx.fillStyle = '#e6a100'; // Gleaming gold
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#1e1c18';
  ctx.stroke();

  // Golden shimmer / highlight
  const shimmer = 0.5 + 0.5 * Math.sin(time * 2);
  ctx.beginPath();
  ctx.arc(-3, -5, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 245, 180, ${0.4 + 0.3 * shimmer})`;
  ctx.fill();

  // Crescent finial
  ctx.beginPath();
  ctx.arc(0, -14, 2, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = '#d49b18';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Four Slender Pencil Minarets
  const minarets = [-20, -13, 13, 20];
  minarets.forEach((mx, i) => {
    const mh = i === 0 || i === 3 ? 28 : 22;
    // Tower shaft
    ctx.fillStyle = '#f0ebe1';
    ctx.fillRect(mx - 1.5, 10 - mh, 3, mh);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#1e1c18';
    ctx.strokeRect(mx - 1.5, 10 - mh, 3, mh);

    // Conical golden tip
    ctx.beginPath();
    ctx.moveTo(mx - 2.5, 10 - mh);
    ctx.lineTo(mx, 10 - mh - 6);
    ctx.lineTo(mx + 2.5, 10 - mh);
    ctx.closePath();
    ctx.fillStyle = '#e6a100';
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

export function drawIndependenceArch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 12, 22, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Monumental Archway Body
  const aw = 28;
  const ah = 24;
  ctx.fillStyle = '#dfd6c5';
  ctx.fillRect(-aw / 2, 10 - ah, aw, ah);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#1a1814';
  ctx.strokeRect(-aw / 2, 10 - ah, aw, ah);

  // Central Arch Portal Opening
  ctx.beginPath();
  ctx.arc(0, 0, 7, Math.PI, 0);
  ctx.lineTo(7, 10);
  ctx.lineTo(-7, 10);
  ctx.closePath();
  ctx.fillStyle = '#18241b'; // Deep background through arch
  ctx.fill();
  ctx.stroke();

  // Top entablature lintel
  ctx.fillStyle = '#c48938';
  ctx.fillRect(-aw / 2 - 2, 10 - ah - 4, aw + 4, 4);
  ctx.strokeRect(-aw / 2 - 2, 10 - ah - 4, aw + 4, 4);

  // Crown Pedestal
  ctx.fillStyle = '#dfd6c5';
  ctx.fillRect(-8, 10 - ah - 10, 16, 6);
  ctx.strokeRect(-8, 10 - ah - 10, 16, 6);

  // Idle Animation: Black Star of Africa crest with golden aura
  const starPulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.beginPath();
  ctx.arc(0, 10 - ah - 15, 6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(230, 161, 0, ${0.3 * starPulse})`;
  ctx.fill();

  // 5-pointed Black Star
  ctx.save();
  ctx.translate(0, 10 - ah - 15);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * 4.5;
    const py = Math.sin(angle) * 4.5;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#0f140e';
  ctx.fill();
  ctx.strokeStyle = '#e6a100';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// --- City Zoom Landmarks (Lagos) ---

export function drawBalogunMarketLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.2 : 1.0);
  ctx.scale(s, s);

  // Vibrant scenario glowing ring
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.5);
  ctx.beginPath();
  ctx.arc(0, 0, 24 + 3 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(72, 120, 64, ${0.4 + 0.4 * pulse})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, 8, 22, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Cluster of market umbrellas
  const umbs = [
    { x: -10, y: 2, r: 10, col: '#d44a28' }, // Terracotta
    { x: 8, y: 4, r: 11, col: '#c48938' },  // Gold
    { x: -2, y: -6, r: 10, col: '#487840' }, // Green
    { x: 10, y: -5, r: 8, col: '#f5eedc' },  // Cream
  ];

  umbs.forEach((u, i) => {
    // Pole
    ctx.strokeStyle = '#2e261a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(u.x, u.y + 6);
    ctx.stroke();

    // Umbrella Canopy (slight flutter)
    const flutter = Math.sin(time * 3 + i) * 0.4;
    ctx.beginPath();
    ctx.arc(u.x, u.y - 2 + flutter, u.r, 0, Math.PI * 2);
    ctx.fillStyle = u.col;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#18120c';
    ctx.stroke();

    // Center cap
    ctx.beginPath();
    ctx.arc(u.x, u.y - 2 + flutter, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#18120c';
    ctx.fill();
  });

  ctx.restore();
}

export function drawObalendeDanfoLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.2 : 1.0);
  ctx.scale(s, s);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, 10, 24, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Transit park shelter roof
  ctx.fillStyle = '#3a4a3e';
  ctx.fillRect(-22, -18, 44, 4);
  ctx.strokeStyle = '#182018';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-22, -18, 44, 4);

  // Shelter poles
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.lineTo(-18, 8);
  ctx.moveTo(18, -14);
  ctx.lineTo(18, 8);
  ctx.stroke();

  // Row of 2 yellow Danfo buses parked, 1 lead bus idling forward
  // Idle Animation: Lead Danfo edges/nudges forward slightly with exhaust puff
  const nudge = Math.sin(time * 2.5) > 0.6 ? 2.5 : 0;
  const vibrate = Math.sin(time * 25) * 0.3;

  // Parked Danfo 1
  drawDanfoBus(ctx, -12, 0, 0);

  // Lead Danfo 2 (edging forward)
  drawDanfoBus(ctx, 4 + nudge, 4 + vibrate, 0);

  // Exhaust puff from lead Danfo
  if (nudge > 0) {
    const puff = 0.5 + 0.5 * Math.sin(time * 8);
    ctx.beginPath();
    ctx.arc(4 + nudge - 12, 8, 2.5 * puff, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 200, 200, ${0.6 * (1 - puff)})`;
    ctx.fill();
  }

  ctx.restore();
}

function drawDanfoBus(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Bus body
  const bw = 16;
  const bh = 9;
  ctx.fillStyle = '#f5bd1f'; // Iconic Danfo Yellow
  roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 2);
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = '#1c1608';
  ctx.stroke();

  // Twin black horizontal stripes
  ctx.fillStyle = '#1c1608';
  ctx.fillRect(-bw / 2, -1, bw, 2);

  // Windshield & windows
  ctx.fillStyle = '#9fd3e6';
  ctx.fillRect(bw / 2 - 3, -bh / 2 + 1.5, 2, bh - 3);

  // Wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(-bw / 2 + 2, -bh / 2 - 1, 3, 1.5);
  ctx.fillRect(-bw / 2 + 2, bh / 2 - 0.5, 3, 1.5);
  ctx.fillRect(bw / 2 - 5, -bh / 2 - 1, 3, 1.5);
  ctx.fillRect(bw / 2 - 5, bh / 2 - 0.5, 3, 1.5);

  ctx.restore();
}

/**
 * Kencom Stage, Nairobi — a matatu with its conductor hanging out of the door.
 * Matatus are painted, not plain: the graffiti bands are the point, and they
 * are what separates this from the danfo two landmarks up.
 */
export function drawKencomStageLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.2 : 1.0);
  ctx.scale(s, s);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, 10, 26, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Idling: the whole body trembles, and it nudges forward as it loads.
  const vibrate = Math.sin(time * 22) * 0.35;
  const nudge = Math.sin(time * 1.8) > 0.75 ? 2 : 0;

  ctx.save();
  ctx.translate(nudge, vibrate);

  const bw = 30;
  const bh = 14;

  // Body
  ctx.fillStyle = '#f2f0e6';
  roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 3);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1c1608';
  ctx.stroke();

  // Graffiti bands — the livery every Nairobi matatu carries.
  const bands = ['#E8412F', '#2FA8E0', '#F6B82C', '#11663F'];
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 3);
  ctx.clip();
  bands.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    const bx = -bw / 2 + 4 + i * 6;
    ctx.moveTo(bx, -bh / 2);
    ctx.lineTo(bx + 3.5, -bh / 2);
    ctx.lineTo(bx + 1, bh / 2);
    ctx.lineTo(bx - 2.5, bh / 2);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = '#1c1608';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 3);
  ctx.stroke();

  // Tinted windows
  ctx.fillStyle = '#2b3a42';
  ctx.fillRect(-bw / 2 + 3, -bh / 2 + 2, bw - 10, 4);
  // Windscreen
  ctx.fillStyle = '#9fd3e6';
  ctx.fillRect(bw / 2 - 5, -bh / 2 + 2, 3.5, bh - 5);

  // Wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(-bw / 2 + 4, bh / 2 - 0.5, 5, 2);
  ctx.fillRect(bw / 2 - 10, bh / 2 - 0.5, 5, 2);

  // The makanga, leaning out of the sliding door and calling the route.
  const lean = Math.sin(time * 3) * 1.2;
  ctx.save();
  ctx.translate(-bw / 2 - 1 + lean, 0);
  ctx.fillStyle = '#E8412F';
  roundRect(ctx, -2.5, -4, 5, 8, 1.5);
  ctx.fill();
  ctx.strokeStyle = '#1c1608';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -5.5, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#7a4a2a';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

export function drawYabaBukaLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.2 : 1.0);
  ctx.scale(s, s);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 10, 20, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Roadside Buka shopfront / shelter
  ctx.fillStyle = '#d8c5aa';
  roundRect(ctx, -16, -6, 20, 14, 2);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#221a10';
  ctx.stroke();

  // Corrugated zinc awning
  ctx.beginPath();
  ctx.moveTo(-18, -6);
  ctx.lineTo(6, -6);
  ctx.lineTo(4, -12);
  ctx.lineTo(-20, -12);
  ctx.closePath();
  ctx.fillStyle = '#8a9aa0';
  ctx.fill();
  ctx.stroke();

  // Wooden counter bench
  ctx.fillStyle = '#8c5830';
  ctx.fillRect(4, 0, 14, 8);
  ctx.strokeRect(4, 0, 14, 8);

  // Big aluminum cooking pot (Mama Put cauldron)
  ctx.beginPath();
  ctx.ellipse(11, 0, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#d0d8dc';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(6, 0, 10, 4);
  ctx.strokeRect(6, 0, 10, 4);

  // Glowing embers beneath the pot
  const emberGlow = 0.6 + 0.4 * Math.sin(time * 6);
  ctx.beginPath();
  ctx.arc(11, 5, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(230, 80, 20, ${emberGlow})`;
  ctx.fill();

  // Idle Animation: Animated curls of white steam rising from the pot
  for (let st = 0; st < 3; st++) {
    const tOffset = (time * 1.5 + st * 1.2) % 3;
    const steamY = 0 - tOffset * 7;
    const steamX = 11 + Math.sin(time * 3 + st * 2) * (2 + tOffset * 1.5);
    const steamOpacity = Math.max(0, 1 - tOffset / 3);
    const steamR = 1.5 + tOffset * 1.2;

    ctx.beginPath();
    ctx.arc(steamX, steamY, steamR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * steamOpacity})`;
    ctx.fill();
  }

  ctx.restore();
}

export function drawSurulereCompoundLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.2 : 1.0);
  ctx.scale(s, s);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 12, 22, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.4)';
  ctx.fill();

  // Two-storey Afro-Brazilian colonial compound house
  const hw = 26;
  const hh = 22;
  ctx.fillStyle = '#f0e6d6';
  roundRect(ctx, -hw / 2, 10 - hh, hw, hh, 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#221a12';
  ctx.stroke();

  // Terracotta tiled hip roof
  ctx.beginPath();
  ctx.moveTo(-hw / 2 - 3, 10 - hh);
  ctx.lineTo(hw / 2 + 3, 10 - hh);
  ctx.lineTo(hw / 2 - 4, 10 - hh - 8);
  ctx.lineTo(-hw / 2 + 4, 10 - hh - 8);
  ctx.closePath();
  ctx.fillStyle = '#c45a38';
  ctx.fill();
  ctx.stroke();

  // Veranda balustrade & second floor windows
  // Idle Animation: Warm breathing interior light through windows
  const lightBreath = 0.6 + 0.4 * Math.sin(time * 2);
  ctx.fillStyle = `rgba(255, 210, 90, ${lightBreath})`;
  ctx.fillRect(-9, 10 - hh + 4, 6, 5);
  ctx.fillRect(3, 10 - hh + 4, 6, 5);
  ctx.strokeStyle = '#3e2e20';
  ctx.lineWidth = 1;
  ctx.strokeRect(-9, 10 - hh + 4, 6, 5);
  ctx.strokeRect(3, 10 - hh + 4, 6, 5);

  // Entrance courtyard arch & wooden door
  ctx.beginPath();
  ctx.arc(0, 5, 4, Math.PI, 0);
  ctx.lineTo(4, 10);
  ctx.lineTo(-4, 10);
  ctx.closePath();
  ctx.fillStyle = '#4a3220';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawLekkiIkoyiBridgeLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Blue water ripple base
  ctx.beginPath();
  ctx.ellipse(0, 10, 24, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#204060';
  ctx.fill();

  // Road deck across Five Cowrie Creek
  ctx.fillStyle = '#607078';
  ctx.fillRect(-22, 4, 44, 4);
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = '#182024';
  ctx.strokeRect(-22, 4, 44, 4);

  // Distinctive triangular cable-stayed pylon
  ctx.beginPath();
  ctx.moveTo(-4, 10);
  ctx.lineTo(0, -22); // tall mast top
  ctx.lineTo(4, 10);
  ctx.closePath();
  ctx.fillStyle = '#eceff1';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#263238';
  ctx.stroke();

  // Radiating cable stays
  ctx.strokeStyle = 'rgba(240, 245, 250, 0.7)';
  ctx.lineWidth = 0.9;
  for (let c = 5; c <= 20; c += 5) {
    // Left cables
    ctx.beginPath();
    ctx.moveTo(0, -18 + c * 0.4);
    ctx.lineTo(-c, 4);
    ctx.stroke();
    // Right cables
    ctx.beginPath();
    ctx.moveTo(0, -18 + c * 0.4);
    ctx.lineTo(c, 4);
    ctx.stroke();
  }

  // Pylon top beacon
  ctx.beginPath();
  ctx.arc(0, -22, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3d00';
  ctx.fill();

  ctx.restore();
}

export function drawThirdMainlandBridgeLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  const s = scale * (isHovered ? 1.15 : 1.0);
  ctx.scale(s, s);

  // Open lagoon water
  ctx.beginPath();
  ctx.ellipse(0, 8, 28, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1b3b5a';
  ctx.fill();

  // Concrete piers in water
  ctx.fillStyle = '#cfd8dc';
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 1.2;
  for (let p = -18; p <= 18; p += 12) {
    ctx.fillRect(p - 2, 2, 4, 8);
    ctx.strokeRect(p - 2, 2, 4, 8);
  }

  // Sweeping curved viaduct deck
  ctx.fillStyle = '#eceff1';
  ctx.fillRect(-26, 0, 52, 4);
  ctx.strokeRect(-26, 0, 52, 4);

  // Moving Danfo bus on bridge
  const busPos = ((time * 12) % 48) - 24;
  drawDanfoBus(ctx, busPos, -1, 0);

  ctx.restore();
}

/**
 * Kejetia Market, Kumasi — a kente canopy over a stall, with the Ashanti gold
 * of the region. Drawn in the same flat, ink-outlined register as the others.
 */
export function drawKejetiaMarketLandmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  ctx.save();
  const s = scale * (isHovered ? 1.12 : 1);
  const sway = Math.sin(time / 900) * 0.6 * s;

  ctx.translate(x, y);

  // Ground shadow.
  ctx.fillStyle = 'rgba(29,21,16,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 17 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stall body.
  ctx.fillStyle = '#8A5A36';
  ctx.strokeStyle = '#1D1510';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.rect(-12 * s, -6 * s, 24 * s, 9 * s);
  ctx.fill();
  ctx.stroke();

  // Kente canopy: alternating gold, green, red and black bands.
  const bands = ['#E8B10A', '#118A4E', '#C8102E', '#17110C'];
  const canopyW = 30 * s;
  const bandW = canopyW / 8;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = bands[i % bands.length];
    ctx.beginPath();
    ctx.rect(-canopyW / 2 + i * bandW, -13 * s + sway, bandW, 6 * s);
    ctx.fill();
  }
  ctx.strokeStyle = '#1D1510';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.rect(-canopyW / 2, -13 * s + sway, canopyW, 6 * s);
  ctx.stroke();

  // Folded cloth on the counter.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = bands[(i + 1) % bands.length];
    ctx.beginPath();
    ctx.rect(-9 * s + i * 6.5 * s, -5 * s, 5 * s, 3 * s);
    ctx.fill();
    ctx.strokeStyle = '#1D1510';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
  }

  // A black star above, for Ghana.
  ctx.fillStyle = '#17110C';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 4.6 * s : 2 * s;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * r;
    const py = -19 * s + sway + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
