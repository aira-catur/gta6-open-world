// vehicles.js — every car in Neon Harbor: the traffic fleet, arcade driving physics,
// carjacking entry/exit and vehicle drawing (civilian, mission and patrol liveries share drawVehicle).
import { collideWithBuildings, isOnRoad, roadCenterLines, WORLD_SIZE } from './city.js';

export const VEHICLE_MODELS = [
  { name: 'Brisa Compact', color: '#e63946', topSpeed: 330, accel: 260 },
  { name: 'Ola Sedan', color: '#4f86c6', topSpeed: 360, accel: 280 },
  { name: 'Coral Coupe', color: '#f4a259', topSpeed: 410, accel: 330 },
  { name: 'Vista Van', color: '#6a994e', topSpeed: 300, accel: 230 },
  { name: 'Pearl Taxi', color: '#ffd23f', topSpeed: 350, accel: 270 },
  { name: 'Marlin Pickup', color: '#8d99ae', topSpeed: 340, accel: 260 },
];

let nextVehicleId = 1;

export class TrafficCar {
  constructor(x, y, angle, model, kind = 'traffic') {
    this.id = nextVehicleId++;
    this.x = x; this.y = y; this.angle = angle;
    this.speed = 0; this.model = model; this.kind = kind;
    this.w = 46; this.h = 24; this.radius = 20;
    this.driverInside = kind !== 'parked';
    this.health = 100;
    this.honkTimer = 0;
    this.stuckTimer = 0;
    this.targetSpeed = 95 + (this.id % 5) * 14;
  }
  get velocity() { return this.speed; }
}

export function spawnTrafficFleet(count = 26) {
  const centers = roadCenterLines();
  const fleet = [];
  for (let i = 0; i < count; i++) {
    const model = VEHICLE_MODELS[i % VEHICLE_MODELS.length];
    const vertical = i % 2 === 0;
    const line = centers[i % centers.length];
    const along = 200 + ((i * 397) % (WORLD_SIZE - 400));
    const dir = i % 4 < 2 ? 1 : -1;
    const laneOff = dir > 0 ? 22 : -22;
    const car = vertical
      ? new TrafficCar(line + laneOff, along, dir > 0 ? Math.PI / 2 : -Math.PI / 2, model)
      : new TrafficCar(along, line + laneOff, dir > 0 ? 0 : Math.PI, model);
    car.speed = car.targetSpeed;
    fleet.push(car);
  }
  // a few parked cars on block edges for easy early steals
  const parkedSpots = [[560, 330], [1010, 780], [1460, 330], [1910, 1230], [560, 1680], [2360, 2130]];
  parkedSpots.forEach(([x, y], i) => {
    const car = new TrafficCar(x, y, i % 2 ? 0 : Math.PI / 2, VEHICLE_MODELS[(i + 2) % VEHICLE_MODELS.length], 'parked');
    car.speed = 0; fleet.push(car);
  });
  return fleet;
}

// Traffic brains: follow the lane, slow for the car ahead, turn at some intersections.
export function updateTrafficCar(car, dt, allCars, playerCar) {
  if (car.kind === 'parked' || car === playerCar) return;
  if (!car.driverInside) return; // a car the player stepped out of stays where it was left
  let desired = car.targetSpeed;
  const fx = car.x + Math.cos(car.angle) * 58, fy = car.y + Math.sin(car.angle) * 58;
  for (const other of allCars) {
    if (other === car) continue;
    const d = Math.hypot(other.x - fx, other.y - fy);
    if (d < 44) { desired = Math.min(desired, Math.max(0, (other.speed || 0) - 10)); }
  }
  if (playerCar && Math.hypot(playerCar.x - fx, playerCar.y - fy) < 52) desired = 0;
  car.speed += Math.sign(desired - car.speed) * Math.min(Math.abs(desired - car.speed), 190 * dt);
  if (car.speed < 4 && desired > 0) { car.stuckTimer += dt; } else car.stuckTimer = 0;
  if (car.stuckTimer > 1.6) { // nudge around a jam by turning at the next crossing feel
    car.angle += Math.PI / 2; car.stuckTimer = 0; car.speed = 40;
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // keep traffic on the road network: if we drifted onto a block, snap back to nearest road lane
  if (!isOnRoad(car.x, car.y)) {
    const centers = roadCenterLines();
    let bestX = centers[0], bestY = centers[0], bd = 1e9;
    for (const c of centers) { const d = Math.abs(c - car.x); if (d < bd) { bd = d; bestX = c; } }
    bd = 1e9;
    for (const c of centers) { const d = Math.abs(c - car.y); if (d < bd) { bd = d; bestY = c; } }
    if (Math.abs(bestX - car.x) < Math.abs(bestY - car.y)) { car.x = bestX + (Math.cos(car.angle) > 0 ? 0 : 0) + (Math.sin(car.angle) > 0 ? 22 : -22) * 0; car.x = bestX + (Math.abs(Math.sin(car.angle)) > 0.5 ? (Math.sin(car.angle) > 0 ? 22 : -22) : 0); car.angle = Math.sin(car.angle) > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { car.y = bestY + (Math.abs(Math.cos(car.angle)) > 0.5 ? (Math.cos(car.angle) > 0 ? 22 : -22) : 0); car.angle = Math.cos(car.angle) > 0 ? 0 : Math.PI; }
  }
  car.x = Math.max(30, Math.min(WORLD_SIZE - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD_SIZE - 30, car.y));
}

// Arcade driving for the vehicle the player currently owns.
export function drivePlayerVehicle(car, dt, input, buildings) {
  const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : 0;
  const back = (input.isDown('KeyS') || input.isDown('ArrowDown')) ? 1 : 0;
  const left = (input.isDown('KeyA') || input.isDown('ArrowLeft')) ? 1 : 0;
  const right = (input.isDown('KeyD') || input.isDown('ArrowRight')) ? 1 : 0;
  const brake = input.isDown('Space');
  if (fwd) car.speed += car.model.accel * dt;
  if (back) car.speed -= (car.speed > 10 ? 420 : 150) * dt;
  car.speed -= car.speed * (brake ? 2.6 : 0.55) * dt;
  car.speed = Math.max(-130, Math.min(car.model.topSpeed, car.speed));
  if (Math.abs(car.speed) < 2 && !fwd && !back) car.speed = 0;
  const steer = (right - left) * 1.9 * Math.min(1, Math.abs(car.speed) / 120) * Math.sign(car.speed || 1);
  car.angle += steer * dt * (brake ? 1.35 : 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const px = car.x, py = car.y;
  [car.x, car.y] = collideWithBuildings(buildings, car.x, car.y, 22);
  if ((car.x !== px || car.y !== py) && Math.abs(car.speed) > 60) car.speed *= 0.4; // building scrape bleeds speed
  return Math.abs(car.speed);
}

// Circle collision between two cars; returns impact speed or 0.
export function collideVehicles(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy), min = a.radius + b.radius - 6;
  if (d === 0 || d >= min) return 0;
  const push = (min - d) / 2, nx = dx / d, ny = dy / d;
  a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
  const impact = Math.abs(a.speed - b.speed);
  a.speed *= 0.55; if (b.kind !== 'player') b.speed *= 0.55;
  return impact;
}

export function drawVehicle(ctx, car, isPlayerCar = false) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(2, 5, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
  // wheels
  ctx.fillStyle = '#14181f';
  ctx.fillRect(-17, -15, 11, 6); ctx.fillRect(7, -15, 11, 6); ctx.fillRect(-17, 9, 11, 6); ctx.fillRect(7, 9, 11, 6);
  // body
  ctx.fillStyle = car.kind === 'police' ? '#f2f5f7' : (car.kind === 'mission' ? '#12b5a5' : car.model.color);
  ctx.beginPath(); ctx.roundRect(-24, -12, 48, 24, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.stroke();
  if (car.kind === 'police') {
    ctx.fillStyle = '#1b3a5c'; ctx.fillRect(-24, -4, 48, 8);
    ctx.fillStyle = '#fff'; ctx.font = '800 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('PATROL', 0, 3);
    const flash = Math.floor(performance.now() / 280) % 2 === 0;
    ctx.fillStyle = flash ? '#ff4040' : '#ffd0d0'; ctx.fillRect(-8, -6, 7, 4);
    ctx.fillStyle = flash ? '#cfe6ff' : '#3f8cff'; ctx.fillRect(1, -6, 7, 4);
  }
  if (car.kind === 'mission') {
    ctx.fillStyle = '#083f39'; ctx.font = '800 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('VERA', 0, 3);
  }
  if (car.kind === 'taxi' || car.model.name === 'Pearl Taxi') {
    ctx.fillStyle = '#231600'; ctx.font = '800 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, -14);
  }
  // cabin + windshield
  ctx.fillStyle = '#bfe6f5'; ctx.beginPath(); ctx.roundRect(-9, -9, 17, 18, 4); ctx.fill();
  ctx.fillStyle = 'rgba(20,40,60,.65)'; ctx.fillRect(6, -9, 5, 18);
  // headlights
  ctx.fillStyle = '#fff6bf'; ctx.fillRect(22, -9, 3, 5); ctx.fillRect(22, 4, 3, 5);
  ctx.fillStyle = '#ff5d5d'; ctx.fillRect(-25, -9, 3, 5); ctx.fillRect(-25, 4, 3, 5);
  ctx.restore();
  if (isPlayerCar) {
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.moveTo(car.x, car.y - 40 + Math.sin(performance.now() / 300) * 3);
    ctx.lineTo(car.x - 8, car.y - 52); ctx.lineTo(car.x + 8, car.y - 52);
    ctx.closePath(); ctx.fill();
  }
}
