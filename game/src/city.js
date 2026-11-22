// city.js — Neon Harbor's street grid, districts, named buildings, palms and streetlights.
// One job: build the static city and paint it. No gameplay lives here.

export const WORLD_SIZE = 2700;
export const ROAD_PITCH = 450;
export const ROAD_WIDTH = 96;
export const ROAD_COUNT = 6;

export const DISTRICTS = [
  { name: 'PALM HEIGHTS', x: 0, y: 0, color: '#e8d8a8', accent: '#c9a86a' },
  { name: 'DOWNTOWN NEON', x: 900, y: 0, color: '#d9c9b8', accent: '#8fa3b8' },
  { name: 'SOL BANK DISTRICT', x: 1800, y: 0, color: '#e3d3ae', accent: '#b89a55' },
  { name: 'NEON MARKET', x: 0, y: 900, color: '#ecd9b0', accent: '#c98d5f' },
  { name: 'MIDTOWN COURTS', x: 900, y: 900, color: '#e0d6ba', accent: '#9aa578' },
  { name: 'UNIVERSITY ROW', x: 1800, y: 900, color: '#d8dcbc', accent: '#7d9b76' },
  { name: 'HARBOR DOCKS', x: 0, y: 1800, color: '#cdbfa4', accent: '#7d8b99' },
  { name: 'FISHERMAN WHARF', x: 900, y: 1800, color: '#d3c5a5', accent: '#a5805c' },
  { name: 'SUNSET MARINA', x: 1800, y: 1800, color: '#e6d3ac', accent: '#c2a15e' },
];

const BUILDING_NAMES = [
  'Sol Bank Tower', 'Hotel Marlin', 'Palm Court Flats', 'Neon Arcade', 'Café Brisa',
  'Harbor Gym', 'Vera Motors', 'Sunset Cinema', 'Marina Pharmacy', 'City Library',
  'Taco Brasa', 'Hotel Coral', 'Pearl Offices', 'Neon Records', 'Dockside Diner',
  'Palm Laundromat', 'Surf Shop Ola', 'City Clinic', 'The Gilded Crab', 'Radio Bahia',
  'Courthouse', 'Fire Station 9', 'Bus Depot', 'Skyline Lofts', 'Mercado Central',
  'Jade Dentist', 'Port Authority', 'Sail Makers', 'Neon Chapel', 'Vista Mall',
  'Harbor School', 'Print House', 'Casa Verde', 'The Lookout Bar', 'Ferry Office',
  'Aquarium', 'Bike Rental', 'Casa Sol', 'Night Pharmacy', 'Pier Hotel',
];

const ROOF_COLORS = ['#e2725b', '#5b8e7d', '#f4a259', '#7d6ba8', '#4f86c6', '#bc4b51', '#6a994e', '#d68c45', '#577590', '#b56576', '#43aa8b', '#e07a5f'];

export function districtAt(x, y) {
  const col = Math.min(2, Math.max(0, Math.floor(x / 900)));
  const row = Math.min(2, Math.max(0, Math.floor(y / 900)));
  return DISTRICTS[row * 3 + col];
}

export function isOnRoad(x, y) {
  const mx = ((x % ROAD_PITCH) + ROAD_PITCH) % ROAD_PITCH;
  const my = ((y % ROAD_PITCH) + ROAD_PITCH) % ROAD_PITCH;
  return mx < ROAD_WIDTH || my < ROAD_WIDTH;
}

export function roadCenterLines() {
  const lines = [];
  for (let i = 0; i < ROAD_COUNT; i++) lines.push(i * ROAD_PITCH + ROAD_WIDTH / 2);
  return lines;
}

// Seeded layout: one or two buildings inside every block, each with a name and roof colour.
export function buildCityGrid() {
  const buildings = [];
  const palms = [];
  const lamps = [];
  let nameIdx = 0;
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let bx = 0; bx < ROAD_COUNT - 1; bx++) {
    for (let by = 0; by < ROAD_COUNT - 1; by++) {
      const x0 = bx * ROAD_PITCH + ROAD_WIDTH + 22;
      const y0 = by * ROAD_PITCH + ROAD_WIDTH + 22;
      const inner = ROAD_PITCH - ROAD_WIDTH - 44;
      const two = rnd() > 0.45;
      const mk = (ox, oy, w, h) => {
        buildings.push({
          x: x0 + ox, y: y0 + oy, w, h,
          name: BUILDING_NAMES[nameIdx++ % BUILDING_NAMES.length],
          color: ROOF_COLORS[Math.floor(rnd() * ROOF_COLORS.length)],
          floors: 2 + Math.floor(rnd() * 9),
        });
      };
      if (two) { mk(0, 0, inner * 0.46, inner); mk(inner * 0.54, 0, inner * 0.46, inner * 0.55); }
      else mk(0, 0, inner, inner * 0.8);
      // palms on the block corners, lamps along the roads
      palms.push({ x: x0 - 12, y: y0 - 12 }, { x: x0 + inner + 12, y: y0 + inner + 6 });
      lamps.push({ x: bx * ROAD_PITCH + ROAD_WIDTH + 6, y: by * ROAD_PITCH + 40 });
      lamps.push({ x: bx * ROAD_PITCH + 40, y: by * ROAD_PITCH + ROAD_WIDTH + 6 });
    }
  }
  return { buildings, palms, lamps };
}

export function buildingAt(buildings, x, y, pad = 0) {
  for (const b of buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// Push a circle out of every building AABB; returns corrected [x, y].
export function collideWithBuildings(buildings, x, y, r) {
  for (const b of buildings) {
    const nx = Math.max(b.x, Math.min(b.x + b.w, x));
    const ny = Math.max(b.y, Math.min(b.y + b.h, y));
    const dx = x - nx, dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { return [x, b.y - r]; }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r; y = ny + (dy / d) * r;
    }
  }
  return [Math.max(r, Math.min(WORLD_SIZE - r, x)), Math.max(r, Math.min(WORLD_SIZE - r, y))];
}

export function drawCity(ctx, city, cam) {
  const vx = cam.x - cam.w / 2 - 40, vy = cam.y - cam.h / 2 - 40;
  const vw = cam.w + 80, vh = cam.h + 80;
  // district ground
  for (const d of DISTRICTS) {
    if (d.x + 900 < vx || d.y + 900 < vy || d.x > vx + vw || d.y > vy + vh) continue;
    ctx.fillStyle = d.color; ctx.fillRect(d.x, d.y, 900, 900);
  }
  // sidewalks + asphalt
  ctx.fillStyle = '#b7ab90';
  for (let i = 0; i < ROAD_COUNT; i++) {
    const p = i * ROAD_PITCH;
    ctx.fillRect(p - 8, 0, ROAD_WIDTH + 16, WORLD_SIZE);
    ctx.fillRect(0, p - 8, WORLD_SIZE, ROAD_WIDTH + 16);
  }
  ctx.fillStyle = '#3d4450';
  for (let i = 0; i < ROAD_COUNT; i++) {
    const p = i * ROAD_PITCH;
    ctx.fillRect(p, 0, ROAD_WIDTH, WORLD_SIZE);
    ctx.fillRect(0, p, WORLD_SIZE, ROAD_WIDTH);
  }
  // lane dashes
  ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 4; ctx.setLineDash([26, 22]);
  for (const c of roadCenterLines()) {
    ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, WORLD_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(WORLD_SIZE, c); ctx.stroke();
  }
  ctx.setLineDash([]);
  // crosswalks at intersections
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < ROAD_COUNT; i++) for (let j = 0; j < ROAD_COUNT; j++) {
    const x = i * ROAD_PITCH, y = j * ROAD_PITCH;
    if (x + ROAD_WIDTH < vx || y + ROAD_WIDTH < vy || x > vx + vw || y > vy + vh) continue;
    for (let s = 0; s < 4; s++) ctx.fillRect(x + 8 + s * 22, y + 4, 12, 10);
    for (let s = 0; s < 4; s++) ctx.fillRect(x + 8 + s * 22, y + ROAD_WIDTH - 14, 12, 10);
  }
  // buildings: shadow, walls, roof, name
  for (const b of city.buildings) {
    if (b.x + b.w < vx || b.y + b.h < vy || b.x > vx + vw || b.y > vy + vh) continue;
    ctx.fillStyle = 'rgba(60,40,20,.35)'; ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    ctx.strokeStyle = 'rgba(40,25,10,.55)'; ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    const rows = Math.floor(b.h / 26), cols = Math.floor(b.w / 26);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ctx.fillRect(b.x + 10 + c * 26, b.y + 10 + r * 26, 9, 12);
    if (cam.zoom > 0.8) {
      ctx.fillStyle = '#2b1c08'; ctx.font = '700 13px Arial'; ctx.textAlign = 'center';
      ctx.fillText(b.name.toUpperCase(), b.x + b.w / 2, b.y + b.h + 17);
    }
  }
  // palms
  for (const p of city.palms) {
    if (p.x < vx || p.y < vy || p.x > vx + vw || p.y > vy + vh) continue;
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 14); ctx.stroke();
    ctx.strokeStyle = '#3e9b4f'; ctx.lineWidth = 3;
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - 14);
      ctx.lineTo(p.x + 4 + Math.cos(ang) * 17, p.y - 14 + Math.sin(ang) * 8 - 4); ctx.stroke();
    }
  }
  // street lamps
  ctx.fillStyle = '#ffe9a8';
  for (const l of city.lamps) {
    if (l.x < vx || l.y < vy || l.x > vx + vw || l.y > vy + vh) continue;
    ctx.beginPath(); ctx.arc(l.x, l.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // harbor water along the south edge strip
  ctx.fillStyle = '#2e7fb8'; ctx.fillRect(0, WORLD_SIZE - 26, WORLD_SIZE, 26);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let x = 20; x < WORLD_SIZE; x += 90) ctx.fillRect(x, WORLD_SIZE - 16, 34, 3);
}
