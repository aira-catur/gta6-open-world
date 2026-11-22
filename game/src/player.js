// player.js — Rico Marlin on foot: movement, sprint, punch combat and drawing.
// One job: everything the player character does while NOT inside a vehicle.

import { collideWithBuildings } from './city.js';

export class PlayerOnFoot {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = 13;
    this.health = 100;
    this.speedWalk = 165;
    this.speedSprint = 265;
    this.punchCooldown = 0;
    this.punchAnim = 0;
    this.walkCycle = 0;
    this.vehicle = null; // set while driving
  }

  get driving() { return this.vehicle !== null; }
  get speed() { return Math.hypot(this.vx, this.vy); }

  movePlayerOnFoot(dt, input, buildings) {
    if (this.driving) return;
    let mx = 0, my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const sp = sprint ? this.speedSprint : this.speedWalk;
    this.vx = (mx / len) * sp * (mx || my ? 1 : 0);
    this.vy = (my / len) * sp * (mx || my ? 1 : 0);
    if (mx || my) { this.angle = Math.atan2(my, mx); this.walkCycle += dt * (sprint ? 13 : 9); }
    this.x += this.vx * dt; this.y += this.vy * dt;
    [this.x, this.y] = collideWithBuildings(buildings, this.x, this.y, this.radius);
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.punchAnim = Math.max(0, this.punchAnim - dt * 5);
  }

  // Returns the point in front of Rico where a punch lands.
  startPunch() {
    if (this.punchCooldown > 0 || this.driving) return null;
    this.punchCooldown = 0.38; this.punchAnim = 1;
    return { x: this.x + Math.cos(this.angle) * 30, y: this.y + Math.sin(this.angle) * 30 };
  }

  hurt(amount) { this.health = Math.max(0, this.health - amount); }
  healFull() { this.health = 100; }
}

export function drawPlayer(ctx, player) {
  const { x, y } = player;
  ctx.save(); ctx.translate(x, y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0, 5, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(player.angle + Math.PI / 2);
  const step = Math.sin(player.walkCycle) * 5;
  // legs
  ctx.fillStyle = '#26324a';
  ctx.fillRect(-8, 2 + step * 0.4, 6, 11); ctx.fillRect(2, 2 - step * 0.4, 6, 11);
  // torso — Rico's teal jacket
  ctx.fillStyle = '#0e9aa7';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.fillRect(-11, -3, 22, 5);
  // punching arm
  if (player.punchAnim > 0) {
    ctx.fillStyle = '#f2c094'; ctx.fillRect(6, -26 * player.punchAnim, 6, 14);
  } else {
    ctx.fillStyle = '#f2c094'; ctx.fillRect(8, -4, 5, 10); ctx.fillRect(-13, -4, 5, 10);
  }
  // head + cap
  ctx.fillStyle = '#f2c094'; ctx.beginPath(); ctx.arc(0, -2, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(0, -3, 6.5, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();
  // name tag
  ctx.fillStyle = 'rgba(8,18,30,.75)'; ctx.fillRect(x - 26, y - 34, 52, 14);
  ctx.fillStyle = '#fff'; ctx.font = '700 10px Arial'; ctx.textAlign = 'center';
  ctx.fillText('RICO', x, y - 24);
}
