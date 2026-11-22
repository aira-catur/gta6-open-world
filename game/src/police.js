// police.js — the Harbor Patrol: the 1–5 star WantedSystem, foot officers and patrol cruisers
// that chase, ram and bust the player, plus the escape/cool-down rules.
// One job: law enforcement. Crimes are reported in by main.js through WantedSystem.addCrime.

import { collideWithBuildings, WORLD_SIZE } from './city.js';
import { TrafficCar, VEHICLE_MODELS } from './vehicles.js';

export class WantedSystem {
  constructor() {
    this.stars = 0;
    this.heat = 0;          // fractional progress toward the next star
    this.coolTimer = 0;     // seconds unseen before a star drops
    this.lastSeenAt = 0;
    this.seenNow = false;
  }
  addCrime(points, label) {
    this.heat += points;
    while (this.heat >= 1 && this.stars < 5) { this.stars += 1; this.heat -= 1; }
    if (this.stars >= 5) this.heat = Math.min(this.heat, 0.99);
    this.coolTimer = 0;
    return label;
  }
  setMinimumStars(n) {
    if (this.stars < n) { this.stars = n; this.heat = Math.max(this.heat, 0.2); }
    this.coolTimer = 0;
  }
  // seen: any officer/cruiser within sight range this frame.
  update(dt, seen) {
    this.seenNow = seen;
    if (this.stars === 0) return;
    if (seen) { this.coolTimer = 0; return; }
    this.coolTimer += dt;
    const needed = 8; // seconds hidden per star
    if (this.coolTimer >= needed) { this.stars -= 1; this.coolTimer = 0; this.heat = 0; }
  }
  clear() { this.stars = 0; this.heat = 0; this.coolTimer = 0; }
  get escaping() { return this.stars > 0 && !this.seenNow; }
}

export class PoliceOfficer {
  constructor(x, y) {
    this.x = x; this.y = y; this.angle = 0;
    this.speed = 205; this.radius = 12; this.health = 30;
    this.state = 'chase'; this.walkCycle = 0; this.downTimer = 0;
  }
}

export class PoliceCruiser extends TrafficCar {
  constructor(x, y) {
    super(x, y, 0, VEHICLE_MODELS[1], 'police');
    this.targetSpeed = 390;
    this.ramCooldown = 0;
  }
}

export class PoliceResponse {
  constructor() {
    this.officers = [];
    this.cruisers = [];
    this.spawnTimer = 0;
    this.bustMeter = 0;
  }

  desiredUnits(stars) {
    return { cruisers: stars >= 2 ? Math.min(4, stars - 1) : (stars === 1 ? 1 : 0), officers: stars >= 1 ? Math.min(4, stars) : 0 };
  }

  // Spawn units at road edges near (but not on top of) the player.
  updatePoliceResponse(dt, wanted, player, buildings) {
    const want = this.desiredUnits(wanted.stars);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.4;
      if (this.cruisers.length < want.cruisers) {
        const a = Math.random() * Math.PI * 2, d = 560 + Math.random() * 160;
        const x = Math.max(40, Math.min(WORLD_SIZE - 40, player.x + Math.cos(a) * d));
        const y = Math.max(40, Math.min(WORLD_SIZE - 40, player.y + Math.sin(a) * d));
        this.cruisers.push(new PoliceCruiser(x, y));
      }
      if (this.officers.length < want.officers) {
        const a = Math.random() * Math.PI * 2, d = 420 + Math.random() * 120;
        const x = Math.max(30, Math.min(WORLD_SIZE - 30, player.x + Math.cos(a) * d));
        const y = Math.max(30, Math.min(WORLD_SIZE - 30, player.y + Math.sin(a) * d));
        this.officers.push(new PoliceOfficer(x, y));
      }
    }
    // trim far-away excess when wanted falls
    if (this.cruisers.length > want.cruisers + 1) this.cruisers = this.cruisers.filter(c => Math.hypot(c.x - player.x, c.y - player.y) < 1000);
    if (wanted.stars === 0) { this.officers = []; if (this.cruisers.length > 1) this.cruisers.splice(1); }

    let nearest = Infinity;
    // cruisers chase the player's position (or car)
    for (const c of this.cruisers) {
      const tx = player.driving ? player.vehicle.x : player.x;
      const ty = player.driving ? player.vehicle.y : player.y;
      const dist = Math.hypot(tx - c.x, ty - c.y);
      nearest = Math.min(nearest, dist);
      const desiredAngle = Math.atan2(ty - c.y, tx - c.x);
      let diff = desiredAngle - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const top = player.driving ? 400 : 250;
      c.speed += Math.sign(Math.min(top, 130 + dist * 0.55) - c.speed) * 260 * dt;
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      [c.x, c.y] = collideWithBuildings(buildings, c.x, c.y, 22);
      c.ramCooldown = Math.max(0, c.ramCooldown - dt);
    }
    // officers chase on foot, slower than a sprinting player but relentless
    for (const o of this.officers) {
      if (o.downTimer > 0) { o.downTimer -= dt; continue; }
      const tx = player.driving ? player.vehicle.x : player.x;
      const ty = player.driving ? player.vehicle.y : player.y;
      const dist = Math.hypot(tx - o.x, ty - o.y);
      nearest = Math.min(nearest, dist);
      o.angle = Math.atan2(ty - o.y, tx - o.x);
      const sp = player.driving ? 60 : o.speed;
      o.x += Math.cos(o.angle) * sp * dt;
      o.y += Math.sin(o.angle) * sp * dt;
      [o.x, o.y] = collideWithBuildings(buildings, o.x, o.y, o.radius);
      o.walkCycle += dt * 11;
    }
    this.officers = this.officers.filter(o => !(o.downTimer > 0 && o.health <= 0) || o.downTimer > -5);

    // BUSTED rule: police close + player slow/stopped fills the meter.
    const playerSpeed = player.driving ? Math.abs(player.vehicle.speed) : player.speed;
    const anyClose = nearest < 62;
    if (wanted.stars > 0 && anyClose && playerSpeed < 30) this.bustMeter += dt / 2.1;
    else this.bustMeter = Math.max(0, this.bustMeter - dt * 0.8);
    return { nearest, seen: nearest < 540, busted: this.bustMeter >= 1 };
  }

  reset() { this.officers = []; this.cruisers = []; this.bustMeter = 0; }
}

export function drawPoliceOfficer(ctx, o) {
  ctx.save(); ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0, 4, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (o.downTimer > 0) ctx.rotate(Math.PI / 2);
  else ctx.rotate(o.angle + Math.PI / 2);
  const step = Math.sin(o.walkCycle) * 4;
  ctx.fillStyle = '#16283f'; ctx.fillRect(-6, 2 + step * 0.4, 5, 9); ctx.fillRect(1, 2 - step * 0.4, 5, 9);
  ctx.fillStyle = '#1b3a5c'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.fillRect(-3, -6, 6, 4);
  ctx.fillStyle = '#e8c39e'; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#12263f'; ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#7dd7ff'; ctx.font = '800 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('PATROL', o.x, o.y - 20);
}
