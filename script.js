// ==================================================================
// CYBERPUNK 2077: PIXEL SIDE RACER v3
// Bright sunset palette + 3 diverse zones + detailed cars
// ==================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- UI ----------
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const speedValueEl = document.getElementById('speedValue');
const gearValueEl = document.getElementById('gearValue');
const timeDisplayEl = document.getElementById('timeDisplay');
const positionValueEl = document.getElementById('positionValue');
const lapValueEl = document.getElementById('lapValue');
const finalScoreEl = document.getElementById('finalScore');
const finalSpeedEl = document.getElementById('finalSpeed');
const finalTimeEl = document.getElementById('finalTime');
const finalPositionEl = document.getElementById('finalPosition');
const finalHighScoreEl = document.getElementById('finalHighScore');
const newRecordText = document.getElementById('newRecordText');
const nosBarEl = document.getElementById('nosBar');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pbCanvas = document.getElementById('progressbar');
const pbCtx = pbCanvas.getContext('2d');
pbCtx.imageSmoothingEnabled = false;

// ---------- CONSTANTS ----------
const VW = 480, VH = 270;
const BASE_Y = 195;
const TRACK_LENGTH = 6000;
const TOTAL_LAPS = 3;
const TOTAL_RACERS = 5;
const TOTAL_WORLD = TRACK_LENGTH * TOTAL_LAPS;
const ZONE_LENGTH = TRACK_LENGTH / 3;
const MAX_SPEED = 220;
const ACCEL = 90;
const BRAKE = 160;
const DRAG = 0.35;
const NOS_MULT = 1.8;

// ---------- CYBER SUNSET PALETTE (LIGHTER) ----------
const C = {
    skyTop:    '#1a1547',   // deep indigo (dusk)
    skyMid:    '#4a2a7a',   // purple
    skyMag:    '#a83366',   // magenta
    skyOrange: '#ff6a44',   // orange
    skyGold:   '#ffb055',   // gold horizon
    sun:       '#ffe066',
    sunGlow:   '#ff9944',
    yellow:    '#FCEE0A',
    pink:      '#FF00FF',
    cyan:      '#00FFFF',
    orange:    '#ff8844',
    white:     '#ffffff',
    road:      '#6a6578',   // lighter road
    roadDark:  '#504b5d',
    roadLine:  '#ffeeaa',
    ground:    '#5a4a6a',
    groundDark:'#3a2a4a'
};

// ---------- STATE ----------
let gameState = 'START';
let clock = 0;
let lastTime = 0;
let raceTime = 0;
let nosAmount = 100;
let isNosActive = false;
let highScore = parseInt(localStorage.getItem('cyberpunkRacerHighScore') || '0');
let gameInitialized = false;

const keys = { w:false, a:false, s:false, d:false,
               ArrowUp:false, ArrowLeft:false, ArrowDown:false, ArrowRight:false,
               Shift:false };
window.addEventListener('keydown', e => { if (e.key in keys) keys[e.key] = true; });
window.addEventListener('keyup',   e => { if (e.key in keys) keys[e.key] = false; });

let camX = 0;

const player = {
    x: 0, y: 0, v: 0,
    wheel: 0, wheelRadius: 7,
    tilt: 0,
    type: 'bmw',
    bodyColor: '#c92a2a',
    accent: C.yellow,
    rimColor: '#f0f0f0',
    lap: 1, distance: 0,
    maxSpeedReached: 0
};

let aiRacers = [];
let stars = [];
let bgObjects = [];     // parallax 0.25
let midObjects = [];    // parallax 1.0 (zones)
let propObjects = [];   // roadside
let particles = [];
let rainDrops = [];

// ==================================================================
// TERRAIN
// ==================================================================
function terrainY(x) {
    const ampMod = 18 + Math.sin(x * 0.0008) * 8;
    const freqMod = 0.005 + Math.sin(x * 0.0004 + 1) * 0.002;
    return BASE_Y
        + Math.sin(x * freqMod) * ampMod
        + Math.sin(x * 0.019 + 1.7) * 8
        + Math.sin(x * 0.0032 + 0.5) * 22;
}
function terrainSlope(x) {
    const dx = 0.5;
    return (terrainY(x + dx) - terrainY(x - dx)) / (2 * dx);
}

// ==================================================================
// ZONE HELPER (0 = Downtown, 1 = Neon Arcade, 2 = Industrial)
// ==================================================================
function getZoneAt(wx) {
    const localX = ((wx % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
    return Math.floor(localX / ZONE_LENGTH);
}
function pickWindowColor(zone) {
    if (zone === 0) return [C.cyan, '#ffffff', C.yellow][Math.floor(Math.random()*3)];
    if (zone === 1) return [C.yellow, C.pink, C.orange][Math.floor(Math.random()*3)];
    return [C.orange, '#ffaa44', '#ff6666'][Math.floor(Math.random()*3)];
}

// ==================================================================
// INIT
// ==================================================================
function init() {
    // Stars (top of sky only, sunset sky)
    for (let i = 0; i < 55; i++) {
        stars.push({
            x: Math.random() * VW * 4,
            y: Math.random() * 55,
            s: Math.random() < 0.8 ? 1 : 2,
            c: Math.random() < 0.5 ? '#ffffff' : C.cyan
        });
    }

    // Background skyline (parallax 0.25)
    for (let wx = -200; wx < 5500; wx += 38) {
        if (Math.random() < 0.25) continue;
        bgObjects.push({
            x: wx,
            w: 28 + Math.random() * 24,
            h: 50 + Math.random() * 60,
            zone: getZoneAt(wx * 4),
            lights: Array.from({length: 5}, () => ({
                dx: Math.random(), dy: Math.random(),
                c: Math.random() < 0.4 ? C.yellow :
                   Math.random() < 0.6 ? C.pink : C.cyan
            }))
        });
    }

    // Midground (parallax 1.0)
    for (let wx = -200; wx < TOTAL_WORLD + 400; wx += 55) {
        if (Math.random() < 0.2) continue;
        const zone = getZoneAt(wx);
        const b = {
            x: wx,
            zone: zone,
            w: 32 + Math.random() * 32,
            h: zone === 0 ? 65 + Math.random() * 65 :
               zone === 1 ? 45 + Math.random() * 45 :
                            35 + Math.random() * 40,
            lights: []
        };
        const cols = Math.max(2, Math.floor(b.w / 6));
        const rows = Math.max(2, Math.floor(b.h / 6));
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                if (Math.random() < 0.45) continue;
                b.lights.push({ i, j, c: pickWindowColor(zone) });
            }
        }
        // Zone extras
        if (zone === 0) {
            b.antenna = Math.random() < 0.5;
            b.billboard = Math.random() < 0.35 ? {
                color: [C.yellow, C.pink, C.cyan][Math.floor(Math.random()*3)],
                text: Math.floor(Math.random() * 999)
            } : null;
        } else if (zone === 1) {
            b.neonSign = Math.random() < 0.75;
            b.signColor = [C.yellow, C.pink, C.cyan, C.orange][Math.floor(Math.random()*4)];
            b.signW = 14 + Math.random() * 18;
        } else {
            b.chimney = Math.random() < 0.6;
            b.tank = Math.random() < 0.4;
        }
        midObjects.push(b);
    }

    // Roadside props
    for (let wx = -100; wx < TOTAL_WORLD + 400; wx += 90) {
        const zone = getZoneAt(wx);
        const types = zone === 0 ? ['lamp', 'hydrant', 'sign'] :
                      zone === 1 ? ['neon', 'arcade', 'hologram'] :
                                   ['barrel', 'crate', 'antenna'];
        propObjects.push({
            x: wx, zone, type: types[Math.floor(Math.random()*types.length)]
        });
    }

    // AI racers
    aiRacers = [
        { type:'merc',    bodyColor:'#3a3a6a', accent:C.cyan,   rimColor:'#00aaff', x: -80,  v: 0, wheel: 0, wheelRadius: 7,   tilt: 0, lap: 1, distance: -80,  targetSpeed: 180, personality: 0.8 },
        { type:'porsche', bodyColor:'#e8b72a', accent:C.pink,   rimColor:'#dddddd', x: -160, v: 0, wheel: 0, wheelRadius: 7,   tilt: 0, lap: 1, distance: -160, targetSpeed: 175, personality: 0.6 },
        { type:'ford',    bodyColor:'#2a5a3a', accent:'#FF4400', rimColor:'#333333', x: -240, v: 0, wheel: 0, wheelRadius: 7.5, tilt: 0, lap: 1, distance: -240, targetSpeed: 190, personality: 1.0 },
        { type:'bmw',     bodyColor:'#5a2a5a', accent:C.yellow, rimColor:'#ffcc00', x: -320, v: 0, wheel: 0, wheelRadius: 7,   tilt: 0, lap: 1, distance: -320, targetSpeed: 172, personality: 0.7 }
    ];

    // Rain
    for (let i = 0; i < 55; i++) {
        rainDrops.push({
            x: Math.random() * VW, y: Math.random() * VH,
            v: 100 + Math.random() * 70, l: 3 + Math.random() * 3
        });
    }

    highScoreDisplay.innerText = highScore;
    gameInitialized = true;
    console.log('✅ Engine ready');
}

// ==================================================================
// WHEEL SPRITE
// ==================================================================
function drawWheel(cx, cy, r, angle, rimColor) {
    ctx.fillStyle = '#0e0e12';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Spokes
    const s = Math.cos(angle) * r * 0.5;
    const s2 = Math.sin(angle) * r * 0.5;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s2); ctx.lineTo(cx + s, cy + s2);
    ctx.moveTo(cx - s2, cy + s); ctx.lineTo(cx + s2, cy - s);
    ctx.stroke();
}

// ==================================================================
// CAR SPRITES — detailed, distinct silhouettes
// ==================================================================
function drawShadow() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 34, 2, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawBMW(car) {
    const bc = car.bodyColor, ac = car.accent, rc = car.rimColor;
    const wb = 44, wr = car.wheelRadius;
    drawShadow();
    // Wheels behind
    drawWheel(-wb/2, -wr, wr, car.wheel, rc);
    drawWheel( wb/2, -wr, wr, car.wheel, rc);
    // Chassis
    ctx.fillStyle = '#1a1a24'; ctx.fillRect(-33, -8, 66, 6);
    // Lower body
    ctx.fillStyle = bc; ctx.fillRect(-33, -14, 66, 6);
    // Upper shoulder
    ctx.fillRect(-28, -20, 56, 6);
    // Cabin windows
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(-20, -24, 30, 4);   // side window
    ctx.fillRect(10, -22, 8, 6);     // windshield
    ctx.fillRect(-22, -22, 4, 4);    // rear
    // Roof
    ctx.fillStyle = bc; ctx.fillRect(-16, -27, 26, 2);
    // Neon side stripe
    ctx.fillStyle = ac; ctx.fillRect(-30, -13, 60, 1);
    // Underbody glow
    ctx.fillStyle = ac; ctx.globalAlpha = 0.6;
    ctx.fillRect(-30, -3, 60, 2); ctx.globalAlpha = 1;
    // Headlight
    ctx.fillStyle = '#ffffff'; ctx.fillRect(30, -14, 3, 3);
    ctx.fillStyle = 'rgba(255,255,200,0.5)'; ctx.fillRect(33, -13, 3, 2);
    // BMW kidney grilles
    ctx.fillStyle = '#000'; ctx.fillRect(31, -12, 2, 4); ctx.fillRect(33, -12, 2, 4);
    ctx.fillStyle = '#cccccc'; ctx.fillRect(30, -12, 1, 4); ctx.fillRect(35, -12, 1, 4);
    // Taillight
    ctx.fillStyle = '#ff2030'; ctx.fillRect(-33, -14, 3, 3);
    ctx.fillStyle = 'rgba(255,50,80,0.5)'; ctx.fillRect(-36, -14, 3, 3);
    // Bumper
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-33, -8, 3, 5); ctx.fillRect(28, -8, 5, 4);
    // Side skirt
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-24, -6, 48, 2);
    // Door line + handle
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-2, -18, 1, 10);
    ctx.fillStyle = '#dddddd'; ctx.fillRect(-1, -13, 3, 1);
    // Mirror
    ctx.fillStyle = bc; ctx.fillRect(11, -22, 5, 2);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(10, -22, 2, 2);
}

function drawMerc(car) {
    const bc = car.bodyColor, ac = car.accent, rc = car.rimColor;
    const wb = 48, wr = car.wheelRadius;
    drawShadow();
    drawWheel(-wb/2, -wr, wr, car.wheel, rc);
    drawWheel( wb/2, -wr, wr, car.wheel, rc);
    // Chassis
    ctx.fillStyle = '#1a1a24'; ctx.fillRect(-34, -8, 68, 6);
    // Lower body — longer
    ctx.fillStyle = bc; ctx.fillRect(-34, -14, 68, 6);
    // Upper body
    ctx.fillRect(-30, -19, 62, 5);
    // Long hood (front) slopes
    ctx.fillStyle = bc;
    ctx.fillRect(6, -22, 28, 3);
    ctx.fillRect(14, -24, 18, 2);
    // Cabin (rear)
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(-24, -24, 26, 5);
    ctx.fillRect(-6, -25, 6, 6);
    // Roof
    ctx.fillStyle = bc; ctx.fillRect(-20, -27, 20, 2);
    // Side stripe
    ctx.fillStyle = ac; ctx.fillRect(-32, -13, 64, 1);
    // Underglow
    ctx.fillStyle = ac; ctx.globalAlpha = 0.55;
    ctx.fillRect(-32, -3, 64, 2); ctx.globalAlpha = 1;
    // Projector headlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(31, -13, 2.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(200,220,255,0.5)';
    ctx.beginPath(); ctx.arc(34, -13, 2.5, 0, Math.PI*2); ctx.fill();
    // AMG grille — vertical bars
    ctx.fillStyle = '#000'; ctx.fillRect(29, -11, 5, 3);
    ctx.fillStyle = '#dddddd';
    for (let i = 0; i < 4; i++) ctx.fillRect(29 + i, -11, 1, 3);
    // Taillight strip
    ctx.fillStyle = '#ff2030'; ctx.fillRect(-34, -14, 4, 3);
    // Rear bumper + chrome
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-34, -8, 4, 5);
    ctx.fillStyle = '#cccccc'; ctx.fillRect(-30, -8, 20, 1);
    // Quad exhaust
    ctx.fillStyle = '#222';
    ctx.fillRect(-34, -6, 3, 2);
    ctx.fillRect(-30, -6, 3, 2);
    // Side skirt
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-24, -6, 50, 2);
    // Door + handle
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-4, -18, 1, 10);
    ctx.fillStyle = '#dddddd'; ctx.fillRect(-3, -13, 3, 1);
    // Mirror
    ctx.fillStyle = bc; ctx.fillRect(8, -22, 5, 2);
}

function drawPorsche(car) {
    const bc = car.bodyColor, ac = car.accent, rc = car.rimColor;
    const wb = 42, wr = car.wheelRadius;
    drawShadow();
    drawWheel(-wb/2, -wr, wr, car.wheel, rc);
    drawWheel( wb/2, -wr, wr, car.wheel, rc);
    // Chassis
    ctx.fillStyle = '#1a1a24'; ctx.fillRect(-32, -8, 64, 6);
    // Body — rounded
    ctx.fillStyle = bc; ctx.fillRect(-32, -14, 64, 6);
    // Upper body — low slung
    ctx.fillRect(-26, -19, 52, 5);
    // Cabin (forward)
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(-14, -23, 26, 5);
    // Windshield slope (fast)
    ctx.fillRect(10, -21, 8, 4);
    ctx.fillRect(16, -19, 4, 3);
    // Rear window slopes down (911 signature)
    ctx.fillRect(-22, -22, 8, 4);
    ctx.fillRect(-26, -20, 5, 3);
    // Roof
    ctx.fillStyle = bc; ctx.fillRect(-12, -25, 22, 2);
    // Rear engine deck bump
    ctx.fillRect(-28, -16, 8, 2);
    // Side stripe
    ctx.fillStyle = ac; ctx.fillRect(-28, -13, 56, 1);
    // Underglow
    ctx.fillStyle = ac; ctx.globalAlpha = 0.6;
    ctx.fillRect(-28, -3, 56, 2); ctx.globalAlpha = 1;
    // Round headlight (Porsche signature)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(28, -13, 2, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(28, -13, 3.5, 0, Math.PI*2); ctx.stroke();
    // Taillight bar (911 across)
    ctx.fillStyle = '#ff2030';
    ctx.fillRect(-32, -15, 4, 2);
    ctx.fillRect(-28, -15, 3, 1);
    // Central exhausts (911 dual)
    ctx.fillStyle = '#222';
    ctx.fillRect(-33, -6, 2, 2); ctx.fillRect(-30, -6, 2, 2);
    // Ducktail spoiler
    ctx.fillStyle = bc; ctx.fillRect(-32, -19, 6, 2);
    // Side skirt
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-22, -6, 44, 2);
    // Door line
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-2, -18, 1, 10);
    // Mirror
    ctx.fillStyle = bc; ctx.fillRect(6, -21, 5, 2);
}

function drawFord(car) {
    const bc = car.bodyColor, ac = car.accent, rc = car.rimColor;
    const wb = 46, wr = car.wheelRadius;
    drawShadow();
    drawWheel(-wb/2, -wr, wr, car.wheel, rc);
    drawWheel( wb/2, -wr, wr, car.wheel, rc);
    // Chassis — wider
    ctx.fillStyle = '#1a1a24'; ctx.fillRect(-34, -8, 68, 6);
    // Lower body
    ctx.fillStyle = bc; ctx.fillRect(-34, -15, 68, 7);
    // Wide fenders (muscle)
    ctx.fillRect(-34, -14, 8, 6);
    ctx.fillRect( 26, -14, 8, 6);
    // Upper body — boxy
    ctx.fillRect(-28, -21, 58, 6);
    // Hood scoop
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(6, -23, 12, 2);
    // Cabin — boxy
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(-18, -26, 28, 5);
    ctx.fillRect(10, -24, 6, 5);
    // Roof
    ctx.fillStyle = bc; ctx.fillRect(-14, -29, 22, 3);
    // Neon stripe
    ctx.fillStyle = ac; ctx.fillRect(-30, -14, 60, 1);
    // Underglow
    ctx.fillStyle = ac; ctx.globalAlpha = 0.6;
    ctx.fillRect(-30, -3, 60, 2); ctx.globalAlpha = 1;
    // Triple-bar headlight (Ford)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(29, -15 + i * 2, 4, 1);
    }
    ctx.fillStyle = 'rgba(255,255,200,0.4)';
    ctx.fillRect(33, -16, 3, 5);
    // Grille (dark + pony)
    ctx.fillStyle = '#000'; ctx.fillRect(28, -12, 6, 4);
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(30, -11, 2, 2);  // pony approx
    // Triple-bar taillight
    ctx.fillStyle = '#ff2030';
    for (let i = 0; i < 3; i++) ctx.fillRect(-34, -15 + i * 2, 4, 1);
    // Rear spoiler
    ctx.fillStyle = bc; ctx.fillRect(-34, -22, 8, 2);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-34, -20, 2, 3);
    // Dual exhaust
    ctx.fillStyle = '#222';
    ctx.fillRect(-33, -5, 3, 2); ctx.fillRect(-28, -5, 3, 2);
    // Side skirt
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-24, -6, 50, 2);
    // Door line
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-2, -19, 1, 11);
    ctx.fillStyle = '#dddddd'; ctx.fillRect(-1, -13, 3, 1);
    // Mirror
    ctx.fillStyle = bc; ctx.fillRect(8, -23, 5, 2);
}

function drawCar(car, isPlayer) {
    const sx = car.x - camX;
    if (sx < -80 || sx > VW + 80) return;
    const sy = terrainY(car.x);
    ctx.save();
    const bounce = Math.sin(clock * 18 + car.x * 0.05) * 0.35 * Math.abs(car.v / MAX_SPEED);
    ctx.translate(Math.round(sx), Math.round(sy + bounce));
    ctx.rotate(car.tilt);

    if (car.type === 'bmw')      drawBMW(car);
    else if (car.type === 'merc')    drawMerc(car);
    else if (car.type === 'porsche') drawPorsche(car);
    else if (car.type === 'ford')    drawFord(car);

    // Player extras
    if (isPlayer) {
        // Number "77" on door
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('77', -8, -12);

        // NOS flames
        if (isNosActive && car.v > 40) {
            const fl = 8 + Math.random() * 12;
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = i < 2 ? C.cyan : (i < 4 ? '#88eeff' : '#ffffff');
                ctx.globalAlpha = 0.7 - i * 0.12;
                const flicker = Math.random() * 4;
                ctx.fillRect(-35 - i * 3 - flicker, -10 + i * 0.5, 4, 3);
            }
            ctx.globalAlpha = 1;
        }
    }

    ctx.restore();
}

// ==================================================================
// DRAW SKY (bright sunset)
// ==================================================================
function drawSky() {
    // Gradient — bright sunset
    const g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.35, C.skyMid);
    g.addColorStop(0.62, C.skyMag);
    g.addColorStop(0.82, C.skyOrange);
    g.addColorStop(1, C.skyGold);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, 165);

    // Stars (top portion only)
    stars.forEach(s => {
        let sx = (s.x - camX * 0.05) % (VW * 4);
        if (sx < 0) sx += VW * 4;
        if (sx > VW + 5) return;
        ctx.fillStyle = s.c;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(Math.floor(sx), Math.floor(s.y), s.s, s.s);
        ctx.globalAlpha = 1;
    });

    // Giant glowing sun on horizon
    let sunX = (200 - camX * 0.05) % (VW * 4);
    if (sunX < -100) sunX += VW * 4;

    // Sun glow layers
    ctx.fillStyle = 'rgba(255,153,68,0.25)';
    ctx.beginPath();
    ctx.arc(sunX, 130, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,224,102,0.5)';
    ctx.beginPath();
    ctx.arc(sunX, 130, 28, 0, Math.PI * 2);
    ctx.fill();

    // Sun disc
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.arc(sunX, 130, 20, 0, Math.PI * 2);
    ctx.fill();

    // Sun stripes (Cyberpunk aesthetic)
    ctx.fillStyle = C.skyGold;
    for (let i = 0; i < 5; i++) {
        const y = 120 + i * 4;
        ctx.fillRect(sunX - 20, y, 40, 2);
    }
}

// ==================================================================
// DRAW DISTANT SKYLINE (parallax 0.25)
// ==================================================================
function drawDistantSkyline() {
    const offset = camX * 0.25;
    const totalW = 5500;
    bgObjects.forEach(b => {
        let bx = b.x - offset;
        bx = ((bx % totalW) + totalW) % totalW - 200;
        if (bx < -60 || bx > VW + 60) return;

        // Building body — silhouette in sunset
        const zone = getZoneAt(camX + bx / 0.25); // approx
        let color;
        if (b.zone === 0) color = '#2a2058';
        else if (b.zone === 1) color = '#4a2050';
        else color = '#3a2818';

        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(bx), 155 - b.h, b.w, b.h);

        // Windows
        b.lights.forEach(l => {
            const wx = bx + 3 + Math.floor(l.dx * (b.w - 6));
            const wy = 155 - b.h + 4 + Math.floor(l.dy * (b.h - 8));
            ctx.fillStyle = l.c;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(wx, wy, 2, 2);
        });
        ctx.globalAlpha = 1;
    });
}

// ==================================================================
// DRAW MIDGROUND BUILDINGS (3 zones, parallax 1.0)
// ==================================================================
function drawMidBuildings() {
    midObjects.forEach(b => {
        const bx = b.x - camX;
        if (bx < -100 || bx > VW + 100) return;

        const by = 155 - b.h;

        if (b.zone === 0) {
            // Downtown — tall purple
            ctx.fillStyle = '#3d2a6a';
            ctx.fillRect(Math.floor(bx), by, b.w, b.h);
            // Rooftop cap
            ctx.fillStyle = '#2a1a4a';
            ctx.fillRect(Math.floor(bx - 2), by - 3, b.w + 4, 3);
            // Antenna
            if (b.antenna) {
                ctx.fillStyle = '#1a1030';
                ctx.fillRect(Math.floor(bx + b.w/2), by - 20, 2, 20);
                // Red beacon
                ctx.fillStyle = '#ff3040';
                ctx.fillRect(Math.floor(bx + b.w/2) - 1, by - 22, 4, 3);
                ctx.fillStyle = 'rgba(255,80,90,0.5)';
                ctx.fillRect(Math.floor(bx + b.w/2) - 2, by - 23, 6, 5);
            }
            // Billboard
            if (b.billboard) {
                const bw = b.w + 4, bh = 12;
                const bbX = Math.floor(bx - 2), bbY = by - bh - 8;
                ctx.fillStyle = '#000';
                ctx.fillRect(bbX - 1, bbY - 1, bw + 2, bh + 2);
                ctx.fillStyle = b.billboard.color;
                ctx.fillRect(bbX, bbY, bw, bh);
                // "Text" pixels
                ctx.fillStyle = '#000';
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(bbX + 3 + i * 6, bbY + 3, 4, 6);
                }
                // Glow
                ctx.fillStyle = b.billboard.color;
                ctx.globalAlpha = 0.2;
                ctx.fillRect(bbX - 3, bbY - 3, bw + 6, bh + 6);
                ctx.globalAlpha = 1;
            }
        } else if (b.zone === 1) {
            // Neon Arcade — magenta with huge signs
            ctx.fillStyle = '#5a2a5a';
            ctx.fillRect(Math.floor(bx), by, b.w, b.h);
            // Roof trim
            ctx.fillStyle = '#3a1a3a';
            ctx.fillRect(Math.floor(bx - 2), by - 3, b.w + 4, 3);
            // Neon sign
            if (b.neonSign) {
                const sw = b.signW || 20;
                const sh = 10;
                const sx = Math.floor(bx + (b.w - sw) / 2);
                const sy = by - sh - 5;
                // Frame
                ctx.fillStyle = '#000';
                ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);
                // Sign
                ctx.fillStyle = b.signColor;
                ctx.fillRect(sx, sy, sw, sh);
                // Text (pixel bars)
                ctx.fillStyle = '#000';
                for (let i = 0; i < Math.floor(sw / 5); i++) {
                    ctx.fillRect(sx + 2 + i * 5, sy + 3, 3, 4);
                }
                // Glow
                ctx.fillStyle = b.signColor;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(sx - 4, sy - 4, sw + 8, sh + 8);
                ctx.globalAlpha = 1;
            }
        } else {
            // Industrial — rust/brown
            ctx.fillStyle = '#4a3428';
            ctx.fillRect(Math.floor(bx), by, b.w, b.h);
            // Rust patches
            ctx.fillStyle = '#3a2418';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(
                    Math.floor(bx + Math.random() * b.w * 0.5),
                    Math.floor(by + Math.random() * b.h * 0.5),
                    4, 3
                );
            }
            // Chimney
            if (b.chimney) {
                ctx.fillStyle = '#3a2a1a';
                ctx.fillRect(Math.floor(bx + 4), by - 22, 6, 22);
                // Red light on top
                ctx.fillStyle = '#ff5020';
                ctx.fillRect(Math.floor(bx + 5), by - 24, 4, 2);
                // Smoke
                ctx.fillStyle = 'rgba(200,180,150,0.4)';
                ctx.beginPath();
                ctx.arc(bx + 7, by - 30, 3, 0, Math.PI*2);
                ctx.arc(bx + 5 + Math.sin(clock*0.7)*2, by - 38, 4, 0, Math.PI*2);
                ctx.fill();
            }
            // Round tank
            if (b.tank) {
                ctx.fillStyle = '#3a3028';
                ctx.beginPath();
                ctx.arc(bx + b.w - 8, by + 8, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2a2018';
                ctx.fillRect(bx + b.w - 12, by + 6, 8, 2);
            }
        }

        // Common: windows
        b.lights.forEach(l => {
            const wx = bx + 3 + l.i * 6;
            const wy = by + 4 + l.j * 6;
            if (wx > bx + b.w - 3 || wy > 150) return;
            ctx.fillStyle = l.c;
            ctx.fillRect(Math.floor(wx), Math.floor(wy), 2, 2);
        });
    });
}

// ==================================================================
// DRAW ROAD + TERRAIN
// ==================================================================
function drawRoadAndTerrain() {
    // Sample terrain points
    const step = 3;
    const points = [];
    for (let sx = 0; sx <= VW + step; sx += step) {
        points.push({ x: sx, y: terrainY(camX + sx) });
    }

    // Ground fill (below terrain) — lighter ground
    ctx.fillStyle = C.ground;
    ctx.beginPath();
    ctx.moveTo(0, points[0].y + 6);
    for (let p of points) ctx.lineTo(p.x, p.y + 6);
    ctx.lineTo(VW, VH);
    ctx.lineTo(0, VH);
    ctx.closePath();
    ctx.fill();

    // Road body
    ctx.fillStyle = C.road;
    ctx.beginPath();
    ctx.moveTo(0, points[0].y);
    for (let p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(VW, VH);
    ctx.lineTo(0, VH);
    ctx.closePath();
    ctx.fill();

    // Darker road underlayer (to give depth)
    ctx.fillStyle = C.roadDark;
    ctx.beginPath();
    ctx.moveTo(0, points[0].y + 3);
    for (let p of points) ctx.lineTo(p.x, p.y + 3);
    ctx.lineTo(VW, VH);
    ctx.lineTo(0, VH);
    ctx.closePath();
    ctx.fill();

    // Asphalt texture (moving dashes)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const dashStart = Math.floor(camX / 40) * 40;
    for (let wx = dashStart; wx < camX + VW + 40; wx += 40) {
        const sx = wx - camX;
        const sy = terrainY(wx) + 10;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 12, 1);
    }

    // Yellow dashed lane (mid road)
    ctx.fillStyle = C.yellow;
    const laneStart = Math.floor(camX / 45) * 45;
    for (let wx = laneStart; wx < camX + VW + 45; wx += 45) {
        const sx = wx - camX;
        const sy = terrainY(wx) + 1;
        const slope = terrainSlope(wx);
        for (let t = 0; t < 14; t++) {
            ctx.fillRect(Math.floor(sx + t), Math.floor(sy + slope * t), 1, 2);
        }
    }

    // Cyan top edge (horizon line of road)
    ctx.fillStyle = C.cyan;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i], p2 = points[i+1];
        const slope = (p2.y - p1.y) / (p2.x - p1.x || 1);
        for (let x = p1.x; x < p2.x; x++) {
            const y = p1.y - 1 + slope * (x - p1.x);
            ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        }
    }

    // Pink bottom edge
    ctx.fillStyle = C.pink;
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i], p2 = points[i+1];
        const slope = (p2.y - p1.y) / (p2.x - p1.x || 1);
        for (let x = p1.x; x < p2.x; x++) {
            const y = p1.y + 8 + slope * (x - p1.x);
            ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        }
    }
}

// ==================================================================
// DRAW ROADSIDE PROPS
// ==================================================================
function drawProps() {
    propObjects.forEach(p => {
        const sx = p.x - camX;
        if (sx < -50 || sx > VW + 50) return;
        const sy = terrainY(p.x);

        if (p.type === 'lamp') {
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 44), 2, 44);
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 44), 8, 2);
            const col = (Math.floor(p.x / 90) % 2 === 0) ? C.yellow : C.cyan;
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(sx + 6), Math.floor(sy - 42), 4, 3);
            ctx.globalAlpha = 0.3;
            ctx.fillRect(Math.floor(sx + 4), Math.floor(sy - 46), 8, 10);
            ctx.globalAlpha = 1;
        } else if (p.type === 'hydrant') {
            ctx.fillStyle = '#c02030';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 8), 4, 8);
            ctx.fillRect(Math.floor(sx - 1), Math.floor(sy - 10), 6, 3);
            ctx.fillStyle = '#ff5060';
            ctx.fillRect(Math.floor(sx + 1), Math.floor(sy - 11), 2, 2);
        } else if (p.type === 'sign') {
            // Small neon sign
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 20), 2, 20);
            ctx.fillStyle = C.cyan;
            ctx.fillRect(Math.floor(sx - 3), Math.floor(sy - 26), 8, 8);
            ctx.globalAlpha = 0.4;
            ctx.fillRect(Math.floor(sx - 5), Math.floor(sy - 28), 12, 12);
            ctx.globalAlpha = 1;
        } else if (p.type === 'neon') {
            // Vertical neon strip
            const col = Math.random() < 0.5 ? C.pink : C.cyan;
            ctx.fillStyle = col;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 26), 2, 26);
            ctx.globalAlpha = 0.3;
            ctx.fillRect(Math.floor(sx - 2), Math.floor(sy - 28), 6, 30);
            ctx.globalAlpha = 1;
        } else if (p.type === 'arcade') {
            // Arcade cabinet
            ctx.fillStyle = '#4a1a5a';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 16), 10, 16);
            ctx.fillStyle = C.yellow;
            ctx.fillRect(Math.floor(sx + 2), Math.floor(sy - 14), 6, 6);
            ctx.fillStyle = C.pink;
            ctx.fillRect(Math.floor(sx + 2), Math.floor(sy - 6), 6, 2);
        } else if (p.type === 'hologram') {
            // Holographic circle
            ctx.strokeStyle = C.cyan;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx + 3, sy - 18, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = C.cyan;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(Math.floor(sx - 4), Math.floor(sy - 26), 14, 14);
            ctx.globalAlpha = 1;
        } else if (p.type === 'barrel') {
            ctx.fillStyle = '#8a3020';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 12), 7, 12);
            ctx.fillStyle = '#4a1810';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 8), 7, 1);
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 5), 7, 1);
            ctx.fillStyle = C.orange;
            ctx.fillRect(Math.floor(sx + 2), Math.floor(sy - 10), 3, 1);
        } else if (p.type === 'crate') {
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 10), 10, 10);
            ctx.fillStyle = '#3a2010';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 5), 10, 1);
            ctx.fillRect(Math.floor(sx + 4), Math.floor(sy - 10), 1, 10);
        } else if (p.type === 'antenna') {
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 24), 2, 24);
            ctx.fillStyle = '#ff3040';
            ctx.fillRect(Math.floor(sx), Math.floor(sy - 26), 2, 2);
        }
    });
}

// ==================================================================
// FINISH LINE
// ==================================================================
function drawFinishLine() {
    for (let lap = 1; lap <= TOTAL_LAPS; lap++) {
        const fwX = lap * TRACK_LENGTH;
        const sx = fwX - camX;
        if (sx < -30 || sx > VW + 30) continue;
        const baseY = terrainY(fwX);

        // Posts
        ctx.fillStyle = '#111122';
        ctx.fillRect(Math.floor(sx - 14), Math.floor(baseY - 58), 4, 58);
        ctx.fillRect(Math.floor(sx + 10), Math.floor(baseY - 58), 4, 58);

        // Top arch (yellow)
        ctx.fillStyle = C.yellow;
        ctx.fillRect(Math.floor(sx - 14), Math.floor(baseY - 58), 28, 4);
        // Yellow glow
        ctx.globalAlpha = 0.3;
        ctx.fillRect(Math.floor(sx - 18), Math.floor(baseY - 62), 36, 12);
        ctx.globalAlpha = 1;

        // Checker flag on road
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#111';
                ctx.fillRect(Math.floor(sx - 9 + i * 3), Math.floor(baseY + j * 3), 3, 3);
            }
        }

        // Label text (pixel dots)
        ctx.fillStyle = C.pink;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(Math.floor(sx - 8 + i * 5), Math.floor(baseY - 50), 3, 3);
        }
    }
}

// ==================================================================
// RAIN + PARTICLES
// ==================================================================
function drawRain() {
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.4)';
    ctx.lineWidth = 1;
    rainDrops.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(Math.floor(r.x), Math.floor(r.y));
        ctx.lineTo(Math.floor(r.x - 1), Math.floor(r.y + r.l));
        ctx.stroke();
    });
}
function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y), p.s, p.s);
    });
    ctx.globalAlpha = 1;
}

// ==================================================================
// PHYSICS
// ==================================================================
function updateTerrain(car) {
    car.y = terrainY(car.x);
    const slope = terrainSlope(car.x);
    const targetTilt = Math.atan(slope * 0.9);
    car.tilt += (targetTilt - car.tilt) * 0.15;
}

function updatePlayer(dt) {
    const accelInput = (keys.w || keys.d || keys.ArrowUp || keys.ArrowRight) ? 1 : 0;
    const brakeInput = (keys.s || keys.a || keys.ArrowDown || keys.ArrowLeft) ? 1 : 0;

    if (keys.Shift && nosAmount > 0 && player.v > 10) {
        isNosActive = true;
        nosAmount -= 30 * dt;
        nosBarEl.style.width = Math.max(0, nosAmount) + '%';
    } else {
        isNosActive = false;
        if (nosAmount < 100) {
            nosAmount += 8 * dt;
            nosBarEl.style.width = Math.min(100, nosAmount) + '%';
        }
    }

    const mult = isNosActive ? NOS_MULT : 1;
    if (accelInput) player.v += ACCEL * mult * dt;
    else if (brakeInput) player.v -= BRAKE * dt;
    else {
        player.v -= player.v * DRAG * dt;
        if (Math.abs(player.v) < 1) player.v = 0;
    }
    player.v -= player.v * 0.15 * dt;

    const maxV = MAX_SPEED * (isNosActive ? 1.35 : 1);
    if (player.v > maxV) player.v = maxV;
    if (player.v < -60) player.v = -60;

    const vAbs = Math.abs(player.v);
    if (vAbs > player.maxSpeedReached) player.maxSpeedReached = vAbs;

    player.x += player.v * dt;
    player.wheel += (player.v * dt) / player.wheelRadius;
    player.distance = player.x;

    const newLap = Math.floor(player.x / TRACK_LENGTH) + 1;
    if (newLap > player.lap) {
        player.lap = newLap;
        if (player.lap > TOTAL_LAPS) { endRace(); return; }
    }

    updateTerrain(player);

    scoreEl.innerText = Math.floor(player.x);
    speedValueEl.innerText = Math.floor(vAbs * 1.2);
    gearValueEl.innerText = player.v > 170 ? '5' :
                            player.v > 130 ? '4' :
                            player.v > 90  ? '3' :
                            player.v > 40  ? '2' :
                            player.v > 3   ? '1' :
                            player.v < -1  ? 'R' : 'N';
    lapValueEl.innerText = Math.min(player.lap, TOTAL_LAPS) + '/' + TOTAL_LAPS;
}

function updateAI(ai, dt) {
    const vary = Math.sin(clock * 0.7 + ai.personality * 10) * 15;
    const target = ai.targetSpeed + vary;
    if (ai.v < target) ai.v += 60 * dt;
    else ai.v -= 40 * dt;
    ai.x += ai.v * dt;
    ai.wheel += (ai.v * dt) / ai.wheelRadius;
    ai.distance = ai.x;
    ai.lap = Math.floor(ai.x / TRACK_LENGTH) + 1;
    updateTerrain(ai);
}

function updateRain(dt) {
    rainDrops.forEach(r => {
        r.y += r.v * dt;
        r.x -= 30 * dt;
        if (r.y > VH) { r.y = -5; r.x = Math.random() * VW + 40; }
        if (r.x < -5) r.x = VW + 5;
    });
}
function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 60 * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// ==================================================================
// RANKING / PROGRESS
// ==================================================================
function getRanking() {
    const list = [{ isPlayer: true, total: player.x }];
    aiRacers.forEach(a => list.push({ isPlayer: false, total: a.x }));
    list.sort((a, b) => b.total - a.total);
    return list;
}
function updateRanking() {
    const pos = getRanking().findIndex(r => r.isPlayer) + 1;
    positionValueEl.innerText = pos + '/' + TOTAL_RACERS;
}
function drawProgressBar() {
    pbCtx.clearRect(0, 0, 240, 40);
    pbCtx.fillStyle = 'rgba(0,0,0,0.7)';
    pbCtx.fillRect(0, 0, 240, 40);
    pbCtx.fillStyle = C.cyan;
    pbCtx.fillRect(6, 18, 228, 2);
    pbCtx.fillStyle = C.yellow;
    for (let i = 1; i <= TOTAL_LAPS; i++) {
        const x = 6 + (228 / TOTAL_LAPS) * i;
        pbCtx.fillRect(x, 12, 1, 14);
    }
    pbCtx.fillStyle = '#aaa';
    pbCtx.font = '6px monospace';
    pbCtx.fillText('L1', 8, 10);
    pbCtx.fillText('L2', 84, 10);
    pbCtx.fillText('L3', 160, 10);
    pbCtx.fillText('FIN', 216, 10);
    aiRacers.forEach(ai => {
        const prog = ai.x / (TRACK_LENGTH * TOTAL_LAPS);
        const x = 6 + Math.min(228, Math.max(0, prog) * 228);
        pbCtx.fillStyle = ai.accent;
        pbCtx.fillRect(x - 2, 24, 4, 4);
    });
    const pprog = player.x / (TRACK_LENGTH * TOTAL_LAPS);
    const px = 6 + Math.min(228, Math.max(0, pprog) * 228);
    pbCtx.fillStyle = '#ffffff';
    pbCtx.fillRect(px - 2, 15, 4, 8);
    pbCtx.fillStyle = C.yellow;
    pbCtx.fillRect(px - 3, 14, 6, 1);
    pbCtx.fillRect(px - 3, 23, 6, 1);
}

// ==================================================================
// RENDER
// ==================================================================
function render() {
    drawSky();
    drawDistantSkyline();
    drawMidBuildings();
    drawRoadAndTerrain();
    drawProps();
    drawFinishLine();

    // Cars
    aiRacers.forEach(a => drawCar(a, false));
    drawCar(player, true);

    drawParticles();
    drawRain();

    // Soft vignette (very subtle on light map)
    const vg = ctx.createRadialGradient(VW/2, VH/2, VH*0.5, VW/2, VH/2, VH);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,0,40,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);
}

// ==================================================================
// MAIN LOOP
// ==================================================================
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (gameState === 'PLAYING') {
        clock += dt;
        raceTime += dt;
        updatePlayer(dt);
        if (gameState !== 'PLAYING') { render(); return; }
        aiRacers.forEach(ai => updateAI(ai, dt));
        updateRain(dt);
        updateParticles(dt);
        camX = player.x - VW * 0.35;
        updateRanking();
        updateClockHUD();
        drawProgressBar();
    } else if (gameState === 'START') {
        clock += dt;
        updateRain(dt);
        camX += 25 * dt;
        aiRacers.forEach(ai => {
            ai.x += 45 * dt;
            ai.wheel += 5 * dt;
            updateTerrain(ai);
        });
    } else if (gameState === 'GAMEOVER') {
        clock += dt;
        updateRain(dt);
        updateParticles(dt);
    }
    render();
}

function updateClockHUD() {
    const m = Math.floor(raceTime / 60);
    const s = Math.floor(raceTime % 60);
    timeDisplayEl.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ==================================================================
// START / END
// ==================================================================
function startGame() {
    if (!gameInitialized) return;
    gameState = 'PLAYING';
    raceTime = 0;
    clock = 0;
    nosAmount = 100;
    nosBarEl.style.width = '100%';
    particles = [];

    player.x = 0;
    player.v = 0;
    player.wheel = 0;
    player.lap = 1;
    player.distance = 0;
    player.maxSpeedReached = 0;
    player.tilt = 0;
    updateTerrain(player);

    const startPositions = [-60, -140, -220, -300];
    aiRacers.forEach((ai, i) => {
        ai.x = startPositions[i];
        ai.v = 0;
        ai.wheel = 0;
        ai.lap = 1;
        ai.distance = ai.x;
        ai.tilt = 0;
        updateTerrain(ai);
    });

    camX = player.x - VW * 0.35;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
}

function endRace() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    const pos = getRanking().findIndex(r => r.isPlayer) + 1;
    finalScoreEl.innerText = Math.floor(player.distance);
    finalSpeedEl.innerText = Math.floor(player.maxSpeedReached * 1.2);
    finalTimeEl.innerText = timeDisplayEl.innerText;
    finalPositionEl.innerText = pos + ' из ' + TOTAL_RACERS;

    if (player.distance > highScore) {
        highScore = Math.floor(player.distance);
        localStorage.setItem('cyberpunkRacerHighScore', highScore);
        newRecordText.classList.remove('hidden');
    } else {
        newRecordText.classList.add('hidden');
    }
    finalHighScoreEl.innerText = highScore;
}

startBtn.addEventListener('click', () => {
    if (!gameInitialized) {
        startBtn.textContent = 'ЗАГРУЗКА...';
        setTimeout(() => { startBtn.textContent = 'ЗАПУСТИТЬ ДВИГАТЕЛЬ'; }, 700);
        return;
    }
    startGame();
});
restartBtn.addEventListener('click', startGame);

// ==================================================================
// BOOT
// ==================================================================
try {
    init();
    lastTime = performance.now();
    requestAnimationFrame(loop);
    console.log('🎮 Night City Pixel Racer v3: booted');
} catch (e) {
    console.error('Init error:', e);
    startBtn.textContent = 'ОШИБКА: ' + e.message;
    startBtn.style.color = '#ff003c';
}