// hud.js — the on-screen furniture: DOM HUD panels, wanted stars, toasts, prompts
// and the live canvas Minimap (player, patrol, traffic, pedestrians, mission marker).
// One job: presentation. It reads game state, never changes it.

import { WORLD_SIZE, districtAt } from './city.js';

export class HudPresenter {
  constructor() {
    this.el = {};
    for (const id of ['hud', 'moneyVal', 'starsVal', 'hudMission', 'hudDistrict', 'hudSpeed', 'speedVal', 'healthBar', 'bustWrap', 'bustBar', 'toast', 'prompt', 'status']) {
      this.el[id] = document.getElementById(id);
    }
    this.minimap = document.getElementById('minimap');
    this.mm = this.minimap.getContext('2d');
    this.toastTimer = 0;
  }

  showGameHud() { this.el.hud.style.display = 'block'; }
  hideGameHud() { this.el.hud.style.display = 'none'; }

  showToast(text, seconds = 4) {
    this.el.toast.textContent = text;
    this.el.toast.style.display = 'block';
    this.toastTimer = seconds;
  }

  showPrompt(text) {
    if (text) { this.el.prompt.textContent = text; this.el.prompt.style.display = 'block'; }
    else this.el.prompt.style.display = 'none';
  }

  updateHudPanel(game, dt) {
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.toastTimer <= 0) this.el.toast.style.display = 'none';
    this.el.moneyVal.textContent = String(Math.max(0, Math.floor(game.money)));
    // wanted stars: lit gold vs dim
    let starsHtml = '';
    for (let i = 0; i < 5; i++) starsHtml += i < game.wanted.stars ? '<span class="lit">★</span>' : '★';
    this.el.starsVal.innerHTML = starsHtml;
    this.el.hudMission.innerHTML = game.missions.hudText(game.player.driving ? game.player.vehicle : game.player);
    const px = game.player.driving ? game.player.vehicle.x : game.player.x;
    const py = game.player.driving ? game.player.vehicle.y : game.player.y;
    this.el.hudDistrict.textContent = districtAt(px, py).name;
    const lbl = document.getElementById('starsLbl');
    if (lbl) lbl.textContent = game.wanted.stars === 0 ? 'WANTED' : (game.wanted.escaping ? 'ESCAPING — BREAK SIGHT!' : 'WANTED — PATROL ACTIVE');
    if (game.player.driving) {
      this.el.hudSpeed.style.display = 'block';
      this.el.speedVal.textContent = String(Math.round(Math.abs(game.player.vehicle.speed) * 0.36));
    } else this.el.hudSpeed.style.display = 'none';
    this.el.healthBar.style.width = `${Math.max(0, game.player.health)}%`;
    if (game.police.bustMeter > 0.03 && game.wanted.stars > 0) {
      this.el.bustWrap.style.display = 'block';
      this.el.bustBar.style.width = `${Math.min(100, game.police.bustMeter * 100)}%`;
    } else this.el.bustWrap.style.display = 'none';
    this.el.status.textContent = `Cash ${Math.floor(game.money)}, wanted ${game.wanted.stars} stars, ${districtAt(px, py).name}`;
  }

  // The minimap: whole city shrunk to 190px, refreshed every frame with live blips.
  drawMinimap(game) {
    const mm = this.mm, S = 190, k = S / WORLD_SIZE;
    mm.fillStyle = '#2c4356'; mm.fillRect(0, 0, S, S);
    // city blocks
    mm.fillStyle = '#3d5a75';
    for (let bx = 0; bx < 5; bx++) for (let by = 0; by < 5; by++) {
      mm.fillRect((bx * 450 + 96) * k, (by * 450 + 96) * k, 354 * k, 354 * k);
    }
    // roads
    mm.fillStyle = '#16222e';
    for (let i = 0; i < 6; i++) {
      mm.fillRect(i * 450 * k, 0, 96 * k, S);
      mm.fillRect(0, i * 450 * k, S, 96 * k);
    }
    // mission marker
    const step = game.missions.step;
    if (step && game.missions.active) {
      mm.fillStyle = '#37e0c8';
      mm.beginPath(); mm.arc(step.x * k, step.y * k, 5 + Math.sin(performance.now() / 200) * 1.5, 0, Math.PI * 2); mm.fill();
    }
    // traffic
    mm.fillStyle = '#cfd8dc';
    for (const c of game.cars) mm.fillRect(c.x * k - 1.5, c.y * k - 1.5, 3, 3);
    // pedestrians
    mm.fillStyle = '#ffd166';
    for (const p of game.peds) mm.fillRect(p.x * k - 1, p.y * k - 1, 2, 2);
    // police cruisers + officers flash blue/red
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    for (const c of game.police.cruisers) {
      mm.fillStyle = flash ? '#ff4040' : '#3f8cff';
      mm.beginPath(); mm.arc(c.x * k, c.y * k, 3.4, 0, Math.PI * 2); mm.fill();
    }
    mm.fillStyle = '#3f8cff';
    for (const o of game.police.officers) mm.fillRect(o.x * k - 1.5, o.y * k - 1.5, 3, 3);
    // player arrow
    const px = (game.player.driving ? game.player.vehicle.x : game.player.x) * k;
    const py = (game.player.driving ? game.player.vehicle.y : game.player.y) * k;
    const ang = game.player.driving ? game.player.vehicle.angle : game.player.angle;
    mm.save(); mm.translate(px, py); mm.rotate(ang);
    mm.fillStyle = '#ffd75e';
    mm.beginPath(); mm.moveTo(9, 0); mm.lineTo(-6, -6); mm.lineTo(-6, 6); mm.closePath(); mm.fill();
    mm.strokeStyle = '#231600'; mm.lineWidth = 1.4; mm.stroke();
    mm.restore();
    // viewport box
    mm.strokeStyle = 'rgba(255,255,255,.5)'; mm.lineWidth = 1;
    const vw = game.camera.w * k, vh = game.camera.h * k;
    mm.strokeRect(px - vw / 2, py - vh / 2, vw, vh);
  }
}
