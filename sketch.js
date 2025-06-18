const EYE_MOMENTUM = 0.2

// 20 px wider than the eye and ±100 px vertical buffer
const H_MARGIN = 20
const V_MARGIN = 100

// pupil parameters
const PUPIL_MIN = 20
const PUPIL_MAX = 70
const PUPIL_CONSTRICT_SPEED = 0.1
const PUPIL_DILATE_SPEED = 0.03

// palette
const EYE_COLORS = [
    "#29363f",
    "#32608e",
    "#517590",
    "#6190b8",
    "#6aa4bb",
    "#576b94",
    "#6994a6",
    "#769aac",
    "#a0c5d2",
    "#c3eaf2",
    "#3a3e33",
    "#495032",
    "#656c50",
    "#7a7a53",
    "#a8b38b",
    "#506150",
    "#687752",
    "#778267",
    "#b3cab4",
    "#9da890",
    "#5b431e",
    "#7a4f14",
    "#845e39",
    "#754024",
    "#8b5322",
    "#ab6e41",
    "#5f403a",
    "#5a352d",
    "#503018",
    "#3f261a",
    "#102c40",
    "#1b3d4d",
    "#2f536b",
    "#4d6d88",
    "#8db1c5",
    "#d1e5ee",
    "#2c3f34",
    "#3c5f45",
    "#4c7b59",
    "#5f926c",
    "#769d7c",
    "#8fb296",
    "#b9d0bd",
    "#a57f37",
    "#85602b",
    "#6c4c27",
    "#4a3320",
    "#312214",
    "#7c6f62",
    "#9f9d91",
    "#c5c3b9",
]

/* ---------- shared mouse-/idle-tracking state ---------- */
let lastMouseX = 0,
    lastMouseY = 0,
    lastMoveTime = 0
let jitterOffset = { x: 0, y: 0 },
    nextJitterTime = 0
let idleTarget = null,
    nextIdleTargetTime = 0

/* ---------- Eye class ---------- */
class Eye {
    constructor(cx, cy) {
        this.cx = cx
        this.cy = cy
        this.reset()

        this.pX = this.cx
        this.pY = this.cy
    }

    reset() {
        this.blinkProg = 0
        this.lastBlink = millis()
        this.nextDelay = random(2000, 6000)

        this.irisColor = color(random(EYE_COLORS))
        this.eyeLidStrokeWeight = random(15, 50)
        this.eyeLidMaskWidthOffset = min(
            random(5, 30),
            this.eyeLidStrokeWeight - 5
        )
        this.eyeLidMaskHeightOffset = min(
            random(10, 50),
            this.eyeLidStrokeWeight - 5
        )
        this.eyeLashCount = random() > 0.025 ? int(random(7, 11)) : 0
        this.eyeLashSweep = random(50, 120)
        this.eyeLidTopFactor = random(115, 160)
        this.eyeLidBottomFactor = random(95, 135)

        this.pupilDiameter = random(PUPIL_MIN + 10, PUPIL_MAX - 10)
        this.pupilPulse = 0
    }

    /* ---- per-frame update ---- */
    draw() {
        const open = this.calculateOpenness()
        this.drawPupil(open)
        this.drawLids(open)
    }

    /* ---- blinking ---- */
    calculateOpenness(blinkSpeed = 0.08) {
        let o = 1
        if (this.blinkProg > 0) {
            this.blinkProg += blinkSpeed
            o =
                this.blinkProg < 0.5
                    ? map(this.blinkProg, 0, 0.5, 1, 0)
                    : map(this.blinkProg, 0.5, 1, 0, 1)
            if (this.blinkProg >= 1) this.blinkProg = 0
        } else if (millis() - this.lastBlink > this.nextDelay) {
            this.blinkProg = 0.01
            this.lastBlink = millis()
            this.nextDelay = random(2000, 6000)
        }
        return o
    }

    /* ---- pupil dynamics ---- */
    updatePupilDiameter(speed, stimulus) {
        if (stimulus) {
            this.pupilPulse = random(-8, 12)
        } else {
            this.pupilPulse *= 0.9
        }

        const speedNorm = constrain(speed / 25, 0, 1)
        const speedTarget = lerp(this.pupilDiameter, PUPIL_MAX, speedNorm)
        const target = constrain(
            speedTarget + this.pupilPulse,
            PUPIL_MIN,
            PUPIL_MAX
        )

        if (this.pupilDiameter > target) {
            this.pupilDiameter -=
                (this.pupilDiameter - target) * PUPIL_CONSTRICT_SPEED
        } else {
            this.pupilDiameter +=
                (target - this.pupilDiameter) * PUPIL_DILATE_SPEED
        }
        return this.pupilDiameter
    }

    pupilTarget() {
        const rx = 80,
            ry = 65,
            sensitivity = 0.7,
            now = millis()
        let stimulus = false

        const moved = dist(mouseX, mouseY, lastMouseX, lastMouseY)
        if (moved > 3) {
            lastMouseX = mouseX
            lastMouseY = mouseY
            lastMoveTime = now
            idleTarget = null
            stimulus = true
        }

        if (now - lastMoveTime > 3000) {
            if (!idleTarget || now > nextIdleTargetTime) {
                const a = random(TWO_PI),
                    r = pow(random(), 2) * 0.8
                idleTarget = {
                    x: this.cx + cos(a) * rx * r,
                    y: this.cy + sin(a) * ry * r * 0.3,
                }
                nextIdleTargetTime = now + random(800, 1800)
                stimulus = true
            }
        }

        let dx = 0,
            dy = 0
        if (idleTarget) {
            dx = idleTarget.x - this.cx
            dy = idleTarget.y - this.cy
        } else if (lastMoveTime > 0) {
            let nx = ((mouseX - this.cx) / (width / 2)) * sensitivity
            let ny = ((mouseY - this.cy) / (height / 2)) * sensitivity
            dx = nx * rx
            dy = ny * ry

            if (now > nextJitterTime) {
                const a = random(TWO_PI),
                    r = pow(random(), 2) * 0.2
                jitterOffset.x = cos(a) * rx * r
                jitterOffset.y = sin(a) * ry * r
                nextJitterTime = now + random(1000, 3000)
                stimulus = true
            }
            dx += jitterOffset.x
            dy += jitterOffset.y

            const t2 = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
            if (t2 > 1) {
                const k = 1 / Math.sqrt(t2)
                dx *= k
                dy *= k
            }
        }
        return { x: this.cx + dx, y: this.cy + dy, stimulus }
    }

    drawPupil(open) {
        const { x: tx, y: ty, stimulus } = this.pupilTarget()
        const prevX = this.pX,
            prevY = this.pY
        this.pX += (tx - this.pX) * EYE_MOMENTUM
        this.pY += (ty - this.pY) * EYE_MOMENTUM

        const speed = dist(prevX, prevY, this.pX, this.pY)
        const d = this.updatePupilDiameter(speed, stimulus)

        noStroke()
        fill(this.irisColor)
        circle(this.pX, this.pY, 80)
        fill(0)
        circle(this.pX, this.pY, d)
    }

    /* ---- lids & lashes ---- */
    drawLids(open) {
        const cx = this.cx,
            cy = this.cy
        const upPadX = this.eyeLidMaskWidthOffset,
            upPadY = this.eyeLidMaskHeightOffset
        const upStartX = cx - 100,
            upEndX = cx + 100
        const upArcH = open * this.eyeLidTopFactor
        const upMaskStartX = upStartX - upPadX,
            upMaskEndX = upEndX + upPadX
        const upMaskArcH = upArcH + upPadY

        const lowPadX = this.eyeLidMaskWidthOffset,
            lowPadY = this.eyeLidMaskHeightOffset
        const lowStartX = cx - 100,
            lowEndX = cx + 100
        const lowArcH = open * -this.eyeLidBottomFactor
        const lowMaskStartX = lowStartX - lowPadX,
            lowMaskEndX = lowEndX + lowPadX
        const lowMaskArcH = lowArcH - lowPadY

        push()
        strokeCap(SQUARE)

        /* upper & lower lid strokes */
        noFill()
        stroke(0)
        strokeWeight(this.eyeLidStrokeWeight)
        beginShape()
        vertex(upStartX, cy)
        quadraticVertex(cx, cy - upArcH, upEndX, cy)
        endShape()
        beginShape()
        vertex(lowStartX, cy)
        quadraticVertex(cx, cy - lowArcH, lowEndX, cy)
        endShape()
        noStroke()
        fill(0)
        circle(upStartX, cy, this.eyeLidStrokeWeight)
        circle(upEndX, cy, this.eyeLidStrokeWeight)
        pop()

        /* white masks */
        noStroke();
        fill(255);

        /* upper mask */
        beginShape()
        vertex(upMaskStartX, cy)
        quadraticVertex(cx, cy - upMaskArcH, upMaskEndX, cy)
        vertex(upMaskEndX + H_MARGIN, cy)
        vertex(upMaskEndX + H_MARGIN, cy - V_MARGIN)
        vertex(upMaskStartX - H_MARGIN, cy - V_MARGIN)
        vertex(upMaskStartX - H_MARGIN, cy)
        endShape(CLOSE)

        /* lower mask */
        beginShape()
        vertex(lowMaskStartX, cy)
        quadraticVertex(cx, cy - lowMaskArcH, lowMaskEndX, cy)
        vertex(lowMaskEndX + H_MARGIN, cy)
        vertex(lowMaskEndX + H_MARGIN, cy + V_MARGIN)
        vertex(lowMaskStartX - H_MARGIN, cy + V_MARGIN)
        vertex(lowMaskStartX - H_MARGIN, cy)
        endShape(CLOSE)

        /* lashes */
        if (this.eyeLashCount === 0) return
        stroke(0)
        strokeWeight(
            (this.eyeLidStrokeWeight +
                this.eyeLidMaskWidthOffset +
                this.eyeLidMaskHeightOffset) /
                4
        )
        strokeCap(
            this.eyeLidStrokeWeight - this.eyeLidMaskWidthOffset < 10
                ? ROUND
                : SQUARE
        )
        noFill()
        const lashLen = 60
        for (let i = 1; i < this.eyeLashCount - 1; i++) {
            const t = i / (this.eyeLashCount - 1)
            const bx =
                (1 - t) ** 2 * upStartX + 2 * (1 - t) * t * cx + t ** 2 * upEndX
            const by =
                (1 - t) ** 2 * cy +
                2 * (1 - t) * t * (cy - upArcH) +
                t ** 2 * cy
            const dir = t - 0.5
            const ctrlDX = dir * this.eyeLashSweep,
                ctrlDY = -lashLen * 0.35
            const tipDX = dir * this.eyeLashSweep * 0.6,
                tipDY = -lashLen
            push()
            translate(bx, by)
            scale(1, open)
            beginShape()
            vertex(0, 0)
            quadraticVertex(ctrlDX, ctrlDY, tipDX, tipDY)
            endShape()
            pop()
        }
    }
}

/* ---------- p5 setup ---------- */
let eyeObj

function setup() {
    createCanvas(windowWidth, windowHeight)
    strokeCap(ROUND)
    pixelDensity(4)
    eyeObj = new Eye(width / 2, height / 2)
}

function draw() {
    background(255)
    eyeObj.draw()
}

/* ---------- events ---------- */
function mouseReleased() {
    eyeObj.reset()
}
function touchEnded() {
    eyeObj.reset()
    return false
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight)
    eyeObj = new Eye(width / 2, height / 2)
}
