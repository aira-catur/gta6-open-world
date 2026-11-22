// main.js — Neon Harbor, an original open-world crime game.
// GrandOpenWorldGame wires every system together: the city (city.js), Rico on foot
// (player.js), traffic + driving (vehicles.js), pedestrians (pedestrians.js), the
// Harbor Patrol and wanted stars (police.js), Vera's mission chain (missions.js),
// the HUD + minimap (hud.js), synth sound (audio.js) and saves (save.js).

import { buildCityGrid, drawCity, districtAt, WORLD_SIZE } from './city.js';
import { PlayerOnFoot, drawPlayer } from './player.js';
import { spawnTrafficFleet, updateTrafficCar, drivePlayerVehicle, collideVehicles, drawVehicle, TrafficCar, VEHICLE_MODELS } from './vehicles.js';
import { spawnPedestrians, updatePedestrian, knockDownPedestrian, drawPedestrian } from './pedestrians.js';
import { WantedSystem, PoliceResponse, PoliceOfficer, PoliceCruiser, drawPoliceOfficer } from './police.js';
import { MissionDirector, drawMissionMarker } from './missions.js';
import { HudPresenter } from './hud.js';
import { SoundEffects } from './audio.js';
import { saveProgress, loadProgress, clearProgress, hasSaveGame } from './save.js';
import { KeyboardControls } from './input.js';
import { requestedShotName, applyScreenshotScene } from './shots.js';

const SPAWN = { x: 348, y: 1248 };

export class GrandOpenWorldGame {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.camera = { x: SPAWN.x, y: SPAWN.y, w: 1280, h: 800, zoom: 1 };
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.input = new KeyboardControls();
    this.hud = new HudPresenter();
    this.sound = new SoundEffects();
    this.city = buildCityGrid();
    this.player = new PlayerOnFoot(SPAWN.x, SPAWN.y);
    this.cars = spawnTrafficFleet(26);
    // Vera's teal coupe: the marked Job 1 steal target, parked at Palm Court.
    this.missionCar = new TrafficCar(560, 300, Math.PI / 2, VEHICLE_MODELS[2], 'mission');
    this.missionCar.driverInside = false;
    this.cars.push(this.missionCar);
    this.peds = spawnPedestrians(34);
    this.wanted = new WantedSystem();
    this.police = new PoliceResponse();
    this.missions = new MissionDirector();
    this.money = 50;
    this.totalEarned = 0;
    this.timesBusted = 0;
    this.state = 'start'; // start | playing | paused | busted | won
    this.districtName = '';
    this.crimeCooldown = 0;
    this.lastTime = performance.now();
    this.wireButtons();
    this.showStartScreen();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.w = window.innerWidth;
    this.camera.h = window.innerHeight;
  }

  wireButtons() {
    const on = (id, fn) => document.getElementById(id).addEventListener('click', () => { this.sound.ensureContext(); fn(); });
    on('btnNew', () => { clearProgress(); this.resetStory(); this.beginGame(false); });
    on('btnContinue', () => this.continueGame());
    on('btnResume', () => this.togglePause(false));
    on('btnRestart', () => { clearProgress(); this.resetStory(); this.togglePause(false); this.beginGame(false); });
    on('btnBustedOk', () => { document.getElementById('bustedScreen').style.display = 'none'; this.state = 'playing'; });
    on('btnWinOk', () => { document.getElementById('winScreen').style.display = 'none'; this.state = 'playing'; });
  }

  showStartScreen() {
    document.getElementById('btnContinue').style.display = hasSaveGame() ? '' : 'none';
    this.state = 'start';
  }

  resetStory() {
    this.money = 50; this.totalEarned = 0; this.timesBusted = 0;
    this.missions = new MissionDirector();
    this.wanted.clear(); this.police.reset();
    this.player = new PlayerOnFoot(SPAWN.x, SPAWN.y);
    this.missionCar.x = 560; this.missionCar.y = 300; this.missionCar.speed = 0; this.missionCar.driverInside = false;
    if (this.missionCar.kind !== 'mission') this.missionCar.kind = 'mission';
  }

  beginGame(silent = false) {
    document.getElementById('startScreen').style.display = 'none';
    this.hud.showGameHud();
    this.state = 'playing';
    if (!this.missions.active && !this.missions.storyComplete) {
      const intro = this.missions.startMission();
      if (intro && !silent) this.hud.showToast(intro, 8);
    }
    this.persist();
  }

  continueGame() {
    const save = loadProgress();
    if (save) {
      this.money = save.money; this.totalEarned = save.totalEarned || 0; this.timesBusted = save.timesBusted || 0;
      this.missions.restore(save.missionIndex, save.completedCount || save.missionIndex);
    }
    this.beginGame(false);
    this.hud.showToast('Save loaded — Vera is still counting on you, Rico.', 4);
  }

  persist() {
    saveProgress({ money: this.money, missionIndex: this.missions.missionIndex, completedCount: this.missions.completedCount, totalEarned: this.totalEarned, timesBusted: this.timesBusted });
  }

  togglePause(force) {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    const toPause = force !== undefined ? force : this.state === 'playing';
    this.state = toPause ? 'paused' : 'playing';
    document.getElementById('pauseScreen').style.display = toPause ? 'flex' : 'none';
    if (toPause) {
      document.getElementById('pauseStats').textContent =
        `Cash $${Math.floor(this.money)} • Jobs done ${this.missions.completedCount}/3 • Total earned $${Math.floor(this.totalEarned)} • Busted ${this.timesBusted}×`;
    }
  }

  makePoliceCruiser(x, y) { return new PoliceCruiser(x, y); }
  makePoliceOfficer(x, y) { return new PoliceOfficer(x, y); }

  scatterTrafficNear(x, y) {
    // Pull a handful of fleet cars onto the roads framing the shot so scenes look alive.
    const spots = [[-260, -40, 0], [240, 60, Math.PI], [-60, -300, Math.PI / 2], [90, 300, -Math.PI / 2], [-420, 130, 0]];
    let n = 0;
    for (const car of this.cars) {
      if (car === this.missionCar || car.kind !== 'traffic' || n >= spots.length) continue;
      const [dx, dy, a] = spots[n++];
      car.x = Math.max(60, Math.min(WORLD_SIZE - 60, x + dx));
      car.y = Math.max(60, Math.min(WORLD_SIZE - 60, y + dy));
      car.angle = a; car.speed = car.targetSpeed;
    }
  }

  scatterPedsNear(x, y) {
    const spots = [[-120, 90], [130, -80], [-70, -140], [180, 150], [-200, -30], [60, 190]];
    this.peds.forEach((ped, i) => {
      if (i >= spots.length) return;
      ped.x = x + spots[i][0]; ped.y = y + spots[i][1]; ped.state = 'stroll';
    });
  }

  reportCrime(points, label) {
    this.wanted.addCrime(points, label);
    this.hud.showToast(`⚠ Crime witnessed: ${label} — wanted ${'★'.repeat(this.wanted.stars)}`, 3);
  }

  nearestCarWithin(x, y, dist) {
    let best = null, bd = dist;
    for (const car of [...this.cars, ...this.police.cruisers]) {
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  }

  tryEnterExitVehicle() {
    if (this.player.driving) {
      const car = this.player.vehicle;
      this.player.vehicle = null;
      car.speed = 0; car.driverInside = false;
      this.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      this.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      this.sound.blip(300, 0.08, 'sine', 0.12);
      return;
    }
    const car = this.nearestCarWithin(this.player.x, this.player.y, 56);
    if (!car) return;
    if (car.kind === 'police') { this.hud.showToast('Stealing a patrol cruiser is a great way to get 2 stars… try it at your own risk.', 3); }
    const wasOccupied = car.driverInside && car.kind === 'traffic';
    this.player.vehicle = car;
    car.driverInside = true;
    this.player.x = car.x; this.player.y = car.y;
    this.sound.playCarjack();
    // Mission: stealing Vera's marked coupe advances Job 1 and heats the streets.
    if (car === this.missionCar && this.missions.step && this.missions.step.kind === 'steal-marked') {
      this.processMissionEvents(this.missions.advanceStep([]));
      this.wanted.setMinimumStars(1);
      this.hud.showToast('You hot-wired Vera\'s coupe! Patrol alerted — deliver it!', 4);
    } else if (wasOccupied) {
      this.reportCrime(1, 'carjacking');
    } else if (car.kind === 'police') {
      this.reportCrime(2, 'stealing a patrol cruiser');
    }
  }

  tryPunch() {
    const hit = this.player.startPunch();
    if (!hit) return;
    this.sound.playPunch();
    for (const ped of this.peds) {
      if (Math.hypot(ped.x - hit.x, ped.y - hit.y) < 26 && ped.state !== 'down') {
        knockDownPedestrian(ped);
        this.reportCrime(0.6, 'assault');
        return;
      }
    }
    for (const o of this.police.officers) {
      if (Math.hypot(o.x - hit.x, o.y - hit.y) < 28 && o.downTimer <= 0) {
        o.downTimer = 3; o.health -= 30;
        this.reportCrime(1, 'attacking an officer');
        return;
      }
    }
  }

  processMissionEvents(events) {
    for (const ev of events) {
      if (ev.type === 'mission-complete') {
        this.money += ev.reward; this.totalEarned += ev.reward;
        this.sound.playCashReward();
        this.hud.showToast(`✔ ${ev.title} COMPLETE — +$${ev.reward}`, 5);
        this.persist();
      } else if (ev.type === 'story-complete') {
        this.state = 'won';
        document.getElementById('winStats').textContent =
          `Final cash $${Math.floor(this.money)} • Total earned $${Math.floor(this.totalEarned)} • Busted ${this.timesBusted}×`;
        document.getElementById('winScreen').style.display = 'flex';
        this.persist();
      } else if (ev.type === 'mission-start') {
        this.hud.showToast(ev.text, 8);
      } else if (ev.type === 'mission-failed') {
        this.sound.playMissionFail();
        this.hud.showToast(`✖ JOB FAILED — ${ev.reason} Restarting the job…`, 5);
      } else if (ev.type === 'step-complete') {
        this.sound.playStepComplete();
      }
    }
  }

  checkMissionSteps(dt) {
    const m = this.missions;
    if (!m.active || !m.step) return;
    const s = m.step;
    const px = this.player.driving ? this.player.vehicle.x : this.player.x;
    const py = this.player.driving ? this.player.vehicle.y : this.player.y;
    const dist = Math.hypot(px - s.x, py - s.y);
    if (s.kind === 'goto' && dist < 52) this.processMissionEvents(m.advanceStep([]));
    else if (s.kind === 'deliver-car' && this.player.vehicle === this.missionCar && dist < 64) this.processMissionEvents(m.advanceStep([]));
    else if (s.kind === 'pickup' && !this.player.driving && dist < 38) {
      m.carryingCrate = true;
      this.wanted.setMinimumStars(2);
      this.hud.showToast('Crate grabbed! The patrol is onto you — get it to Mercado Central!', 4);
      this.processMissionEvents(m.advanceStep([]));
    } else if (s.kind === 'deliver-any' && m.carryingCrate && dist < 60) {
      m.carryingCrate = false;
      this.processMissionEvents(m.advanceStep([]));
    } else if (s.kind === 'rob' && !this.player.driving && dist < 46) {
      m.robProgress += dt / 4;
      if (m.robProgress >= 1) {
        this.wanted.setMinimumStars(4);
        this.hud.showToast('Vault emptied! LOSE the patrol, then reach the hideout!', 4);
        this.processMissionEvents(m.advanceStep([]));
      }
    } else if (s.kind === 'escape' && this.wanted.stars === 0 && dist < 60) {
      this.processMissionEvents(m.advanceStep([]));
    }
    this.processMissionEvents(m.updateMissionTimer(dt, []));
  }

  getBusted() {
    this.timesBusted += 1;
    this.money = Math.max(0, this.money - 100);
    this.sound.playBusted();
    this.wanted.clear();
    this.police.reset();
    this.player.healFull();
    if (this.player.driving) { this.player.vehicle.speed = 0; this.player.vehicle = null; }
    this.player.x = SPAWN.x; this.player.y = SPAWN.y;
    const events = [];
    if (this.missions.active) this.missions.failMission(events, 'Busted by the Harbor Patrol.');
    this.processMissionEvents(events);
    this.state = 'busted';
    document.getElementById('bustedScreen').style.display = 'flex';
    this.persist();
  }

  updateGame(dt) {
    this.crimeCooldown = Math.max(0, this.crimeCooldown - dt);
    // player
    if (this.player.driving) {
      drivePlayerVehicle(this.player.vehicle, dt, this.input, this.city.buildings);
      this.player.x = this.player.vehicle.x; this.player.y = this.player.vehicle.y;
      this.player.health = Math.min(100, this.player.health + dt * 1.2);
    } else {
      this.player.movePlayerOnFoot(dt, this.input, this.city.buildings);
    }
    if (this.input.wasPressed('KeyE')) this.tryEnterExitVehicle();
    if (this.input.wasPressed('KeyF')) this.tryPunch();
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) this.togglePause();

    // traffic + pedestrians
    const playerCar = this.player.vehicle;
    for (const car of this.cars) updateTrafficCar(car, dt, this.cars, playerCar);
    const threat = playerCar && Math.abs(playerCar.speed) > 130 ? playerCar : null;
    for (const ped of this.peds) updatePedestrian(ped, dt, threat);

    // vehicle collisions (player car vs world, cruisers vs player)
    if (playerCar) {
      for (const other of [...this.cars, ...this.police.cruisers]) {
        if (other === playerCar) continue;
        const impact = collideVehicles(playerCar, other);
        if (impact > 90) {
          this.sound.playCrash();
          this.player.hurt(4);
          if (other.kind === 'police' && this.crimeCooldown <= 0) { this.reportCrime(1, 'ramming a patrol cruiser'); this.crimeCooldown = 2; }
        }
      }
      // running down a pedestrian is a serious witnessed crime
      for (const ped of this.peds) {
        if (ped.state !== 'down' && Math.abs(playerCar.speed) > 55 && Math.hypot(ped.x - playerCar.x, ped.y - playerCar.y) < 26) {
          knockDownPedestrian(ped);
          if (this.crimeCooldown <= 0) { this.reportCrime(1, 'hit-and-run'); this.crimeCooldown = 2; }
        }
      }
    }
    // traffic can clip pedestrians too (city feels alive, no wanted for AI)
    for (const car of this.cars) {
      if (car === playerCar || Math.abs(car.speed) < 60) continue;
      for (const ped of this.peds) {
        if (ped.state !== 'down' && Math.hypot(ped.x - car.x, ped.y - car.y) < 24) knockDownPedestrian(ped);
      }
    }

    // police response + wanted cool-down
    const result = this.police.updatePoliceResponse(dt, this.wanted, this.player, this.city.buildings);
    this.wanted.update(dt, result.seen);
    if (result.busted) { this.getBusted(); return; }
    // officers shove Rico when they catch him on foot
    if (!this.player.driving) {
      for (const o of this.police.officers) {
        if (o.downTimer <= 0 && Math.hypot(o.x - this.player.x, o.y - this.player.y) < 22) this.player.hurt(dt * 14);
      }
      if (this.player.health <= 0) { this.getBusted(); return; }
    }

    this.checkMissionSteps(dt);

    // interaction prompt
    if (!this.player.driving) {
      const near = this.nearestCarWithin(this.player.x, this.player.y, 56);
      this.hud.showPrompt(near ? `Press E — steal the ${near.kind === 'police' ? 'PATROL CRUISER' : near.kind === 'mission' ? 'TEAL COUPE' : near.model.name}` : '');
    } else this.hud.showPrompt('Press E — exit vehicle');

    // camera follows smoothly
    const tx = this.player.driving ? this.player.vehicle.x : this.player.x;
    const ty = this.player.driving ? this.player.vehicle.y : this.player.y;
    this.camera.x += (tx - this.camera.x) * Math.min(1, dt * 6);
    this.camera.y += (ty - this.camera.y) * Math.min(1, dt * 6);

    const dName = districtAt(tx, ty).name;
    if (dName !== this.districtName) this.districtName = dName;

    this.sound.updateAmbience(this.wanted.stars, this.player.driving ? this.player.vehicle.speed : null, this.input.wasPressed('KeyM'));
    this.hud.updateHudPanel(this, dt);
    this.hud.drawMinimap(this);
  }

  renderFrame() {
    const ctx = this.ctx, cam = this.camera;
    ctx.fillStyle = '#0b1622'; ctx.fillRect(0, 0, cam.w, cam.h);
    ctx.save();
    ctx.translate(cam.w / 2, cam.h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    drawCity(ctx, this.city, cam);
    const step = this.missions.active ? this.missions.step : null;
    // escape step: marker only matters once the stars are gone
    if (step && !(step.kind === 'escape' && this.wanted.stars > 0)) drawMissionMarker(ctx, step, performance.now());
    for (const ped of this.peds) {
      if (Math.abs(ped.x - cam.x) < cam.w / 2 + 60 && Math.abs(ped.y - cam.y) < cam.h / 2 + 60) drawPedestrian(ctx, ped);
    }
    for (const car of this.cars) {
      if (Math.abs(car.x - cam.x) < cam.w / 2 + 80 && Math.abs(car.y - cam.y) < cam.h / 2 + 80) drawVehicle(ctx, car, car === this.player.vehicle);
    }
    for (const c of this.police.cruisers) drawVehicle(ctx, c, c === this.player.vehicle);
    for (const o of this.police.officers) drawPoliceOfficer(ctx, o);
    if (!this.player.driving) drawPlayer(ctx, this.player);
    // off-screen mission direction arrow at the player's feet
    if (step) {
      const px = this.player.driving ? this.player.vehicle.x : this.player.x;
      const py = this.player.driving ? this.player.vehicle.y : this.player.y;
      const d = Math.hypot(step.x - px, step.y - py);
      if (d > 420) {
        const a = Math.atan2(step.y - py, step.x - px);
        ctx.save(); ctx.translate(px + Math.cos(a) * 64, py + Math.sin(a) * 64); ctx.rotate(a);
        ctx.fillStyle = '#37e0c8';
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    // wanted escape vignette: pulsing teal edge while hidden with stars
    if (this.wanted.escaping) {
      ctx.strokeStyle = 'rgba(55,224,200,.55)'; ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, cam.w - 6, cam.h - 6);
    }
  }

  gameLoop(now) {
    const dt = Math.min(0.033, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (this.state === 'playing') this.updateGame(dt);
    this.renderFrame();
    this.input.endFrame();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // Compact snapshot for automated play-testing.
  testState() {
    return {
      state: this.state,
      money: Math.floor(this.money),
      wanted: this.wanted.stars,
      driving: this.player.driving,
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y), health: Math.round(this.player.health) },
      missionIndex: this.missions.missionIndex,
      stepIndex: this.missions.stepIndex,
      stepKind: this.missions.step ? this.missions.step.kind : null,
      storyComplete: this.missions.storyComplete,
      cruisers: this.police.cruisers.length,
      officers: this.police.officers.length,
      bustMeter: Math.round(this.police.bustMeter * 100) / 100,
      cars: this.cars.length,
      peds: this.peds.length,
    };
  }
}

const game = new GrandOpenWorldGame();
window.__game = game;

// Screenshot scenes run after the first frame so the posed state is what renders.
const shotName = requestedShotName();
if (shotName && shotName !== 'start') {
  requestAnimationFrame(() => requestAnimationFrame(() => applyScreenshotScene(game, shotName)));
}
