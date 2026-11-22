// shots.js — deterministic screenshot scenes for the entry's screenshots/ folder.
// One job: when the page is opened with ?shot=<name>, pose the live game into a real,
// playable state (cover chase, on-foot market, high-wanted pursuit, vault robbery)
// so the maker's screenshots are honest renders of systems that actually run.
// Every pose sits on a real road or sidewalk — never on a rooftop.

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
    // Midtown: Rico drives the stolen teal coupe east on the market road, wanted 3,
    // two cruisers on his tail, the Job 2 delivery beacon glowing ahead of him,
    // traffic and pedestrians all around. The whole game in one frame.
    game.missions.restore(1, 1);
    game.missions.stepIndex = 2;
    game.missions.carryingCrate = true;
    game.money = 1250; game.totalEarned = 1250;
    posePlayerDriving(game, 1248, 927, 0, 235); // eastbound lane of the y=900 road
    game.wanted.stars = 3; game.wanted.heat = 0.4; game.wanted.seenNow = true;
    poseCruiser(game, 1085, 934, 0.08, 250);
    poseCruiser(game, 995, 966, -0.06, 245);
    poseOfficer(game, 1335, 1015); poseOfficer(game, 1170, 870);
    game.scatterTrafficNear(1248, 927);
    game.scatterPedsNear(1248, 927);
  } else if (name === 'foot') {
    // On foot in Palm Heights at the start of Job 1: the teal coupe waits in its glow
    // one block north, traffic rolls past, the crowd strolls the sidewalks.
    game.missions.restore(0, 0);
    game.money = 50;
    game.player.x = 505; game.player.y = 352; game.player.angle = 0.6;
    game.camera.x = game.player.x; game.camera.y = game.player.y;
    game.scatterTrafficNear(505, 352);
    game.scatterPedsNear(505, 352);
  } else if (name === 'chase') {
    // Five-star pursuit down the Harbor straight: cruisers boxing Rico in at speed.
    game.missions.restore(2, 2);
    game.missions.stepIndex = 2;
    game.money = 2900; game.totalEarned = 2900;
    posePlayerDriving(game, 975, 1900, Math.PI / 2, 320); // southbound lane of the x=900 road
    game.wanted.stars = 5; game.wanted.heat = 0.7; game.wanted.seenNow = true;
    poseCruiser(game, 968, 1748, Math.PI / 2, 330);
    poseCruiser(game, 922, 2052, -Math.PI / 2, 300);
    poseCruiser(game, 1400, 1848, Math.PI, 310);
    poseOfficer(game, 1015, 1985); poseOfficer(game, 880, 1830);
    game.scatterTrafficNear(975, 1900);
    game.scatterPedsNear(975, 1900);
  } else if (name === 'mission') {
    // The Sunset Vault robbery in progress: Rico in the bank glow, bag 62% full,
    // a cruiser swinging into the street below and officers closing in on foot.
    game.missions.restore(2, 2);
    game.missions.stepIndex = 1;
    game.missions.robProgress = 0.62;
    game.money = 2050; game.totalEarned = 2050;
    game.player.x = 2298; game.player.y = 360; game.player.angle = -0.8;
    game.camera.x = game.player.x; game.camera.y = game.player.y;
    game.wanted.stars = 4; game.wanted.heat = 0.3; game.wanted.seenNow = true;
    poseCruiser(game, 2285, 520, -0.5, 60);
    poseOfficer(game, 2262, 295); poseOfficer(game, 2335, 445); poseOfficer(game, 2270, 470);
    game.scatterTrafficNear(2298, 360);
    game.scatterPedsNear(2298, 360);
  }
  game.renderFrame();
  // Freeze the simulation on the posed frame: the screenshot must show exactly this
  // state, not whatever the chase AI does in the next two seconds. Rendering and the
  // HUD keep refreshing (siren lights flash, the marker bobs) but nothing moves.
  game.state = 'shot';
}
