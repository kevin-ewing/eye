/* ---------- sketch.js ---------- */
let eyes = []
let nextSpawn = 0
let spawningOff = false

const MAX_TRIES = 1000
const BASE_RADIUS = 120
const SPAWN_WAIT = [1000, 7000]

let BG_COLOR
const EYE_WHITE_COLOR = "#fcfaf2"

const MIN_MINOR_SCALE = 0.175
const MAX_MINOR_SCALE = 0.4

function setup() {
    createCanvas(windowWidth, windowHeight)
    strokeCap(ROUND)
    pixelDensity(4)
    frameRate(60)

    colorMode(HSB, 360, 100, 100, 100)
    BG_COLOR = color(random(0, 360), 20, 80)

    eyes.push(new Eye(width / 2, height / 2))
    nextSpawn = millis() + random(...SPAWN_WAIT)

    /* -------- handle device rotate / resize -------- */
    window.addEventListener("orientationchange", resetSketch)
}

function draw() {
    background(BG_COLOR)

    /* cursor change if over any eye */
    let over = false
    for (const e of eyes) {
        if (e.isInside(mouseX, mouseY)) {
            over = true
            break
        }
    }
    cursor(over ? HAND : ARROW)

    /* draw all eyes */
    for (const e of eyes) e.draw()

    /* timed spawning */
    if (!spawningOff && millis() > nextSpawn) trySpawnEye()
}

/* ---------- spawn helpers ---------- */
function trySpawnEye() {
    for (let t = 0; t < MAX_TRIES; t++) {
        const scl = random(MIN_MINOR_SCALE, MAX_MINOR_SCALE)
        const margin = BASE_RADIUS * scl * 0.8

        const cx = random(-margin, width + margin)
        const cy = random(-margin, height + margin)

        if (nonOverlap(cx, cy, scl)) {
            eyes.push(new Eye(cx, cy, scl))
            nextSpawn = millis() + random(...SPAWN_WAIT)
            return
        }
    }
    spawningOff = true
}

function nonOverlap(cx, cy, scl) {
    const rNew = BASE_RADIUS * scl
    return eyes.every(
        (e) => dist(cx, cy, e.cx, e.cy) >= rNew + BASE_RADIUS * e.scale * 1.3
    )
}

/* ---------- events ---------- */
function mouseReleased() {
    for (const e of eyes) if (e.isInside(mouseX, mouseY)) e.reset()
}

function touchEnded() {
    for (const e of eyes) if (e.isInside(mouseX, mouseY)) e.reset()
    return false
}

function windowResized() {
    resetSketch()
}

/* ---------- resize / rotate helper ---------- */
function resetSketch() {
    resizeCanvas(windowWidth, windowHeight)

    /* keep BG_COLOR and existing eyes; translate everything so the
       first eye stays centred, and move pupils immediately */
    if (eyes.length) {
        const dx = width / 2 - eyes[0].cx
        const dy = height / 2 - eyes[0].cy
        for (const e of eyes) {
            e.cx += dx
            e.cy += dy
            e.pX += dx          // keep pupil aligned
            e.pY += dy
            if (e.idleTarget) { // maintain idle target offset
                e.idleTarget.x += dx
                e.idleTarget.y += dy
            }
        }
    }

    spawningOff = false
    nextSpawn = millis() + random(...SPAWN_WAIT)
}
