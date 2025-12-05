import { UIManager } from './UIManager.js';
import { HandMenuSystem } from './HandMenuSystem.js';

export const InputSys = {
    video: document.querySelector('.input_video'),
    hands: null,
    camera: null,
    menuSystem: new HandMenuSystem(),

    // Shared State for Players
    // Each player has a session that "owns" them
    p1: { x: 0.25, y: 0.5, fist: false, visible: false, lastSeen: 0 },
    p2: { x: 0.75, y: 0.5, fist: false, visible: false, lastSeen: 0 },

    // Internal Session Tracking
    sessions: [], // Array of { id: 'p1'|'p2', x, y, fist, missingFrames }
    MAX_MISSING_FRAMES: 5,
    ENTRY_ZONE_P1: 0.35, // Left 35% of screen is P1 entry
    ENTRY_ZONE_P2: 0.65, // Right 35% of screen is P2 entry

    isReady: false,
    debugMode: false,
    mouse: { x: 0.5, y: 0.5, down: false },
    keys: {},

    async init() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const msg = "Camera access denied/unsupported. Please run on localhost/HTTPS.";
            console.error(msg);
            alert(msg);
            this.initDebug();
            return;
        }

        try {
            this.menuSystem.init();

            this.hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}` });
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
                selfieMode: true
            });
            this.hands.onResults(this.onResults.bind(this));

            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.hands) await this.hands.send({ image: this.video });
                },
                width: 640,
                height: 480
            });

            console.log("InputSys: Starting Camera...");
            const cameraPromise = this.camera.start();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Camera Timeout")), 5000));
            await Promise.race([cameraPromise, timeoutPromise]);
            console.log("InputSys: Camera started.");

        } catch (err) {
            console.error("InputSys: Init failed:", err);
            this.initDebug();
        }
    },

    initDebug() {
        this.debugMode = true;
        this.isReady = true;
        UIManager.hideLoading();

        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX / window.innerWidth;
            this.mouse.y = e.clientY / window.innerHeight;
            if (this.debugMode) {
                // In debug, Mouse controls P1 menu interaction
                this.menuSystem.update(
                    { x: this.mouse.x, y: this.mouse.y, visible: true },
                    { visible: false }
                );
            }
        });
        window.addEventListener('mousedown', () => this.mouse.down = true);
        window.addEventListener('mouseup', () => this.mouse.down = false);
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        const debugLoop = () => {
            if (this.debugMode) {
                this.updateDebug();
                requestAnimationFrame(debugLoop);
            }
        };
        debugLoop();
    },

    updateDebug() {
        // P1: Mouse
        this.p1.visible = true;
        this.p1.x = Math.max(0, Math.min(1, this.mouse.x));
        this.p1.y = Math.max(0, Math.min(1, this.mouse.y));
        this.p1.fist = this.mouse.down;

        // P2: Arrows
        let dx = 0, dy = 0;
        const speed = 0.015;
        if (this.keys['ArrowLeft']) dx = -speed;
        if (this.keys['ArrowRight']) dx = speed;
        if (this.keys['ArrowUp']) dy = -speed;
        if (this.keys['ArrowDown']) dy = speed;

        this.p2.visible = true;
        this.p2.x = Math.max(0, Math.min(1, this.p2.x + dx));
        this.p2.y = Math.max(0, Math.min(1, this.p2.y + dy));
        this.p2.fist = !!this.keys['Space'];
    },

    detectFist(lm) {
        const wrist = lm[0], tip = lm[8], mid = lm[9];
        // Simple heuristic: distance from tip to wrist vs scale of hand
        const dist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const scale = Math.hypot(mid.x - wrist.x, mid.y - wrist.y);
        return (dist / scale) < 1.4; // Relaxed threshold
    },

    onResults(results) {
        if (!this.isReady) {
            this.isReady = true;
            UIManager.hideLoading();
        }

        const newHands = [];

        // 1. Process Raw Landmaks
        if (results.multiHandLandmarks) {
            for (const lm of results.multiHandLandmarks) {
                const wrist = lm[0];
                const mid = lm[9];

                // Centroid (Shifted Up towards fingers as requested)
                const cx = wrist.x * 0.4 + mid.x * 0.6;
                const cy = wrist.y * 0.4 + mid.y * 0.6;

                // Interactive Box Mapping
                // Symmetrical Offset: Shift both hands "Inwards" towards center
                // Left Hand needs + (Right), Right Hand needs - (Left)
                const sideOffset = (cx < 0.5) ? 0.015 : -0.015;

                // X: Gentle expansion + Symmetrical Offset
                let mx = (cx - 0.02) / 0.96 + sideOffset;
                // Y: 0.1 margin (helps reach top/bottom bars)
                let my = (cy - 0.1) / 0.8;

                mx = Math.max(0, Math.min(1, mx));
                my = Math.max(0, Math.min(1, my));

                newHands.push({
                    x: mx,
                    y: my,
                    fist: this.detectFist(lm),
                    claimed: false
                });
            }
        }

        // 2. Session Tracking (The "Sticky" Logic)

        // A. Match existing sessions to closest new hands
        for (let session of this.sessions) {
            let bestDist = 0.3; // Max jump distance (approx 30% screen width per frame)
            let bestMatch = null;

            for (let hand of newHands) {
                if (hand.claimed) continue;
                const dist = Math.hypot(hand.x - session.x, hand.y - session.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestMatch = hand;
                }
            }

            if (bestMatch) {
                // Update Session
                session.x = bestMatch.x;
                session.y = bestMatch.y;
                session.fist = bestMatch.fist;
                session.missingFrames = 0;
                bestMatch.claimed = true;
            } else {
                session.missingFrames++;
            }
        }

        // B. Create new sessions for unmatched hands (Entry Zones)
        for (let hand of newHands) {
            if (hand.claimed) continue;

            let newId = null;

            // Check if P1 or P2 slot is free
            const p1Taken = this.sessions.some(s => s.id === 'p1');
            const p2Taken = this.sessions.some(s => s.id === 'p2');

            // Logic: Only spawn if in safe zone AND slot is empty
            if (!p1Taken && hand.x < this.ENTRY_ZONE_P1) {
                newId = 'p1';
            } else if (!p2Taken && hand.x > this.ENTRY_ZONE_P2) {
                newId = 'p2';
            }

            if (newId) {
                this.sessions.push({
                    id: newId,
                    x: hand.x,
                    y: hand.y,
                    fist: hand.fist,
                    missingFrames: 0
                });
            }
        }

        // C. Cleanup dead sessions
        this.sessions = this.sessions.filter(s => s.missingFrames < this.MAX_MISSING_FRAMES);

        // 3. Update Public State
        this.p1.visible = false;
        this.p2.visible = false;

        for (let session of this.sessions) {
            if (session.id === 'p1') {
                this.p1.x = session.x;
                this.p1.y = session.y;
                this.p1.fist = session.fist;
                this.p1.visible = true;
            } else if (session.id === 'p2') {
                this.p2.x = session.x;
                this.p2.y = session.y;
                this.p2.fist = session.fist;
                this.p2.visible = true;
            }
        }

        // Update UI
        this.menuSystem.update(this.p1, this.p2);
    }
};
