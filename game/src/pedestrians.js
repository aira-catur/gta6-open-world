// pedestrians.js — Neon Harbor's walkers: sidewalk strolling, fleeing crime, getting knocked down.
// One job: the pedestrian crowd and its little brains.

import { isOnRoad, roadCenterLines, WORLD_SIZE } from './city.js';

const SHIRTS = ['#ff8fab', '#ffd166', '#8ecae6', '#95d5b2', '#f4a259', '#cdb4db', '#ff9770', '#70d6ff'];
let nextPedId = 1;

export class Pedestrian {
  constructor(x, y) {
    this.id = nextPedId++;
    this.x = x; this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 42 + Math.random() * 30;
    this.shirt = SHIRTS[this.id % SHIRTS.length];
    this.state = 'stroll'; // stroll | flee | down
    this.stateTimer = 0;
    this.radius = 10;
    this.walkCycle = Math.random() * 6;
    this.turnTimer = 2 + Math.random() * 4;
  }
}

export function spawnPedestrians(count = 34) {
  const centers = roadCenterLines();
  const peds = [];
  for (let i = 0; i < count; i++) {
    // walkers hug the sidewalks beside a random road
    const vertical = i % 2 === 0;
    const line = centers[i % centers.length] + (i % 3 === 0 ? 62 : -62);
    const along = 120 + ((i * 613) % (WORLD_SIZE - 240));
    peds.push(new Pedestrian(vertical ? line : along, vertical ? along : line));
  }
  return peds;
}

export function updatePedestrian(ped, dt, threat) {
  ped.stateTimer = Math.max(0, ped.stateTimer - dt);
  if (ped.state === 'down') { if (ped.stateTimer <= 0) { ped.state = 'flee'; ped.stateTimer = 3; } return; }
  if (threat && Math.hypot(threat.x - ped.x, threat.y - ped.y) < 120) {
    ped.state = 'flee'; ped.stateTimer = 1.6;
    ped.angle = Math.atan2(ped.y - threat.y, ped.x - threat.x);
  }
  const sp = ped.state === 'flee' ? 175 : ped.speed;
  ped.turnTimer -= dt;
  if (ped.turnTimer <= 0) { ped.turnTimer = 2 + Math.random() * 4; if (ped.state !== 'flee') ped.angle += (Math.random() - 0.5) * 1.6; }
  let nx = ped.x + Math.cos(ped.angle) * sp * dt;
  let ny = ped.y + Math.sin(ped.angle) * sp * dt;
  // pedestrians prefer sidewalks: if the step lands mid-road while strolling, turn along the curb
  if (ped.state === 'stroll' && isOnRoad(nx, ny) && Math.random() < 0.6) { ped.angle += Math.PI / 2; return; }
  ped.x = Math.max(16, Math.min(WORLD_SIZE - 16, nx));
  ped.y = Math.max(16, Math.min(WORLD_SIZE - 16, ny));
  ped.walkCycle += dt * (ped.state === 'flee' ? 14 : 8);
}

export function knockDownPedestrian(ped) {
  ped.state = 'down'; ped.stateTimer = 2.6;
}

export function drawPedestrian(ctx, ped) {
  ctx.save(); ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(0, 4, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (ped.state === 'down') {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c094'; ctx.beginPath(); ctx.arc(0, -11, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ff4040'; ctx.font = '900 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText('!', ped.x, ped.y - 18);
    return;
  }
  ctx.rotate(ped.angle + Math.PI / 2);
  const step = Math.sin(ped.walkCycle) * 4;
  ctx.fillStyle = '#3a4356'; ctx.fillRect(-6, 2 + step * 0.4, 5, 9); ctx.fillRect(1, 2 - step * 0.4, 5, 9);
  ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5a33'; ctx.beginPath(); ctx.arc(0, -2, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (ped.state === 'flee') {
    ctx.fillStyle = '#ff4040'; ctx.font = '900 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('!', ped.x, ped.y - 16);
  }
}
