// shots.js — deterministic screenshot scenes for the entry's screenshots/ folder.
// One job: when the page is opened with ?shot=<name>, pose the live game into a real,
// playable state (cover chase, on-foot market, high-wanted pursuit, vault robbery)
// so the maker's screenshots are honest renders of systems that actually run.

export function requestedShotName() {
  return new URLSearchParams(location.search).get('shot') || '';
}

// Pose helpers shared by the scenes: place the player car and patrol units on real roads.
function posePlayerDriving(game, x, y, angle, speed) {
  const car = game.missionCar;
  car.x = x; car.y = y; car.angle = angle; car.speed = speed;
  game.player.vehicle = car;
  game.player.x = x; game.player.y = y;
  game.camera.x = x; game.camera.y = y;
  return car;
}

function poseCruiser(game, x, y, angle, speed) {
  const cruiser = game.makePoliceCruiser(x, y);
  cruiser.angle = angle; cruiser.speed = speed;
  game.police.cruisers.push(cruiser);
  return cruiser;
}

function poseOfficer(game, x, y) {
  const officer = game.makePoliceOfficer(x, y);
  game.police.officers.push(officer);
  return officer;
}

export function applyScreenshotScene(game, name) {
  if (!name) return;
  game.beginGame(true);
  if (name === 'cover') {
    // Downtown Neon: Rico drives the stolen teal coupe, wanted 3, patrol on his tail,
    // Job 2 delivery marker live, traffic and pedestrians all around. The full game in one frame.
    game.missions.restore(1, 1);
    game.missions.stepIndex = 2;
    game.money = 1250; game.totalEarned = 1250;
    posePlayerDriving(game, 1248, 1240, 0, 235);
    game.wanted.stars = 3; game.wanted.heat = 0.4;
    poseCruiser(game, 1105, 1210, 0.15, 250);
    poseCruiser(game, 1060, 1295, -0.1, 245);
    poseOfficer(game, 1330, 1330); poseOfficer(game, 1180, 1150);
    game.scatterTrafficNear(1248, 1240);
    game.scatterPedsNear(1248, 1240);
  } else if (name === 'foot') {
    // On foot in Neon Market at the start of Job 1: marker beacon, parked cars, crowd.
    game.missions.restore(0, 0);
    game.money = 50;
    game.player.x = 470; game.player.y = 395; game.player.angle = 0.6;
    game.camera.x = game.player.x; game.camera.y = game.player.y;
    game.scatterTrafficNear(470, 395);
    game.scatterPedsNear(470, 395);
  } else if (name === 'chase') {
    // Five-star pursuit on the Harbor straight: cruisers boxing Rico in at speed.
    game.missions.restore(2, 2);
    game.missions.stepIndex = 2;
    game.money = 2900; game.totalEarned = 2900;
    posePlayerDriving(game, 348, 1900, Math.PI / 2, 320);
    game.wanted.stars = 5; game.wanted.heat = 0.7;
    poseCruiser(game, 330, 1745, Math.PI / 2, 330);
    poseCruiser(game, 395, 1770, Math.PI / 2, 325);
    poseCruiser(game, 300, 2065, Math.PI / 2, 300);
    poseOfficer(game, 420, 1980); poseOfficer(game, 275, 1850);
    game.scatterTrafficNear(348, 1900);
    game.scatterPedsNear(348, 1900);
  } else if (name === 'mission') {
    // The Sunset Vault robbery in progress: Rico in the bank glow, bag 62% full, patrol closing in.
    game.missions.restore(2, 2);
    game.missions.stepIndex = 1;
    game.missions.robProgress = 0.62;
    game.money = 2050; game.totalEarned = 2050;
    game.player.x = 2298; game.player.y = 360; game.player.angle = -0.8;
    game.camera.x = game.player.x; game.camera.y = game.player.y;
    game.wanted.stars = 4; game.wanted.heat = 0.3;
    poseCruiser(game, 2170, 470, -0.7, 60);
    poseOfficer(game, 2210, 300); poseOfficer(game, 2380, 430); poseOfficer(game, 2260, 470);
    game.scatterTrafficNear(2298, 360);
    game.scatterPedsNear(2298, 360);
  }
  game.renderFrame();
}
