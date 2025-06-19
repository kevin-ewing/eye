/* ---------- sketch.js ---------- */
let eyes = [];     // all eyes
let nextSpawn = 0;      // time to try adding another eye
let spawningOff = false;  // set true after 100-fail limit

const MAX_TRIES = 1000;
const BASE_RADIUS = 120;
const SPAWN_WAIT = [1000, 7500]; // ms range between spawns

function setup() {
    createCanvas(windowWidth, windowHeight);
    strokeCap(ROUND); pixelDensity(4);
    frameRate(60)

    eyes.push(new Eye(width / 2, height / 2));         // start with one
    nextSpawn = millis() + random(...SPAWN_WAIT);
}

function draw() {
    background(255);

    /* cursor change if over any eye */
    let over = false;
    for (const e of eyes) {
        if (e.isInside(mouseX, mouseY)) { over = true; break; }
    }
    cursor(over ? HAND : ARROW);

    /* draw all eyes */
    for (const e of eyes) e.draw();

    /* timed spawning */
    if (!spawningOff && millis() > nextSpawn) trySpawnEye();
}

/* ---------- spawn helpers ---------- */
function trySpawnEye() {
    for (let t = 0; t < MAX_TRIES; t++) {
        const scl = 0.5;                               // half-size eye
        const margin = BASE_RADIUS * scl * 0.8;        // how far off-screen is allowed

        // centre can be slightly beyond each edge
        const cx = random(-margin, width  + margin);
        const cy = random(-margin, height + margin);

        if (nonOverlap(cx, cy, scl)) {
            eyes.push(new Eye(cx, cy, scl));
            nextSpawn = millis() + random(...SPAWN_WAIT);
            return;
        }
    }
    spawningOff = true;                                // couldn't place
}

function nonOverlap(cx, cy, scl) {
    const rNew = BASE_RADIUS * scl;
    return eyes.every(e => dist(cx, cy, e.cx, e.cy) >= rNew + BASE_RADIUS * e.scale * 1.3) ;
}

/* ---------- events ---------- */
function mouseReleased() {
    for (const e of eyes) if (e.isInside(mouseX, mouseY)) e.reset();
}

function touchEnded() {
    for (const e of eyes) if (e.isInside(mouseX, mouseY)) e.reset();
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // keep existing eyes, but prevent spawning onto canvas edges
}
