// missions.js — Vera Sol's chained three-job story for Neon Harbor.
// One job: the MissionDirector state machine — markers, step text, timers, rewards,
// failure and the unlock chain (job N+1 only opens when job N is paid).

export const MISSION_CHAIN = [
  {
    id: 'first-wheels',
    title: 'JOB 1 — FIRST WHEELS FOR VERA',
    giver: 'Vera Sol (phone)',
    intro: 'Vera: "Rico! A teal Vera Motors coupe is parked by Palm Court. Take it — hot, fast, no questions — and bring it to my garage in the Market."',
    reward: 450,
    steps: [
      { kind: 'goto', label: 'Reach the teal coupe at Palm Court', x: 560, y: 300 },
      { kind: 'steal-marked', label: 'STEAL the teal coupe (walk up, press E)', x: 560, y: 300 },
      { kind: 'deliver-car', label: 'Deliver the coupe to Vera\'s Garage', x: 548, y: 1398 },
    ],
  },
  {
    id: 'harbor-crate',
    title: 'JOB 2 — HARBOR CRATE RUN',
    giver: 'Vera Sol (phone)',
    intro: 'Vera: "A crate fell off a boat at the Harbor Docks. Grab it on foot, get wheels, and drop it at Mercado Central. The patrol will smell it — move!"',
    reward: 800,
    timeLimit: 170,
    steps: [
      { kind: 'goto', label: 'Reach the smuggled crate at Harbor Docks', x: 348, y: 1848 },
      { kind: 'pickup', label: 'Pick up the crate (walk into the glow)', x: 348, y: 1848 },
      { kind: 'deliver-any', label: 'Deliver the crate to Mercado Central — timer running!', x: 948, y: 1248 },
    ],
  },
  {
    id: 'sunset-vault',
    title: 'JOB 3 — THE SUNSET VAULT',
    giver: 'Vera Sol (phone)',
    intro: 'Vera: "Last one, Rico. Sol Bank Tower, sunset vault. Walk in, fill the bag, then LOSE the patrol and reach my Palm Heights hideout clean."',
    reward: 1500,
    steps: [
      { kind: 'goto', label: 'Reach Sol Bank Tower', x: 2298, y: 348 },
      { kind: 'rob', label: 'ROB the vault — stand in the glow and hold your nerve', x: 2298, y: 348 },
      { kind: 'escape', label: 'Lose the patrol (★ to zero), then reach the Palm Hideout', x: 200, y: 556 },
    ],
  },
];

export class MissionDirector {
  constructor() {
    this.missionIndex = 0;
    this.stepIndex = 0;
    this.active = false;
    this.storyComplete = false;
    this.timer = 0;
    this.robProgress = 0;
    this.carryingCrate = false;
    this.completedCount = 0;
  }

  get mission() { return MISSION_CHAIN[this.missionIndex] || null; }
  get step() { return this.mission ? this.mission.steps[this.stepIndex] : null; }

  startMission() {
    if (!this.mission) { this.storyComplete = true; return null; }
    this.active = true; this.stepIndex = 0; this.robProgress = 0; this.carryingCrate = false;
    this.timer = this.mission.timeLimit || 0;
    return this.mission.intro;
  }

  restore(missionIndex, completedCount) {
    this.missionIndex = missionIndex; this.completedCount = completedCount;
    this.storyComplete = missionIndex >= MISSION_CHAIN.length;
    if (!this.storyComplete) this.startMission();
  }

  // Advance when main.js reports the step's condition is met. Returns events for HUD/sound.
  advanceStep(events) {
    const m = this.mission;
    this.stepIndex += 1; this.robProgress = 0;
    if (this.stepIndex >= m.steps.length) {
      this.active = false; this.completedCount += 1;
      const reward = m.reward;
      this.missionIndex += 1;
      events.push({ type: 'mission-complete', reward, title: m.title });
      if (this.missionIndex >= MISSION_CHAIN.length) { this.storyComplete = true; events.push({ type: 'story-complete' }); }
      else { const intro = this.startMission(); events.push({ type: 'mission-start', text: intro }); }
      return events;
    }
    events.push({ type: 'step-complete' });
    return events;
  }

  failMission(events, reason) {
    this.active = false; this.stepIndex = 0; this.robProgress = 0; this.carryingCrate = false;
    events.push({ type: 'mission-failed', reason });
    const intro = this.startMission();
    events.push({ type: 'mission-start', text: intro });
    return events;
  }

  updateMissionTimer(dt, events) {
    if (!this.active || !this.mission || !this.mission.timeLimit) return events;
    if (this.stepIndex >= 2) { // timer only bites during the delivery leg
      this.timer -= dt;
      if (this.timer <= 0) return this.failMission(events, 'Out of time — the buyer walked away.');
    }
    return events;
  }

  hudText(player) {
    if (this.storyComplete) return '<b>FREE ROAM</b> — Vera\'s chain is done. Stack cash, dodge the patrol.';
    if (!this.mission || !this.step) return '';
    const s = this.step;
    const d = Math.round(Math.hypot(player.x - s.x, player.y - s.y));
    let extra = '';
    if (this.mission.timeLimit && this.stepIndex >= 2) extra = ` &nbsp; ⏱ <b>${Math.max(0, Math.ceil(this.timer))}s</b>`;
    if (s.kind === 'rob') extra = ` &nbsp; 💰 <b>${Math.floor(this.robProgress * 100)}%</b>`;
    if (s.kind === 'escape') extra = '';
    return `<b>${this.mission.title}</b><br>${s.label} <span class="dist">${d}m</span>${extra}`;
  }
}

export function drawMissionMarker(ctx, step, time) {
  if (!step) return;
  const bob = Math.sin(time / 280) * 8;
  const { x, y } = step;
  // ground glow ring
  ctx.strokeStyle = '#37e0c8'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y, 40 + Math.sin(time / 200) * 5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(55,224,200,.16)';
  ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
  // beacon column
  const grad = ctx.createLinearGradient(0, y - 320, 0, y);
  grad.addColorStop(0, 'rgba(55,224,200,0)'); grad.addColorStop(1, 'rgba(55,224,200,.5)');
  ctx.fillStyle = grad; ctx.fillRect(x - 9, y - 320, 18, 320);
  // floating diamond
  ctx.fillStyle = '#37e0c8';
  ctx.save(); ctx.translate(x, y - 84 + bob); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-15, -15, 30, 30); ctx.restore();
  ctx.fillStyle = '#06302a'; ctx.font = '900 15px Arial'; ctx.textAlign = 'center';
  ctx.fillText('GO', x, y - 79 + bob);
}
