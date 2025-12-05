import { GameBase } from './GameBase.js';
import { AudioSys } from '../modules/AudioManager.js';

export class PongGame extends GameBase {
    constructor(w, h, config) {
        super(w, h);
        this.cfg = config;
        this.pw = 25; this.ph = 140;
        this.p1 = { x: 40, y: h / 2, w: this.pw, h: this.ph, vy: 0, prevY: h / 2 };
        this.p2 = { x: w - 40 - 25, y: h / 2, w: this.pw, h: this.ph, vy: 0, prevY: h / 2 };
        this.speeds = { easy: 6, normal: 9, hard: 13 };
    }

    update(dt, inputSys) {
        const ts = dt * 60;
        const lerp = 0.6 * ts;

        // Paddle Movement
        const updatePaddle = (p, inp) => {
            const targetY = (inp.y * this.h) - (this.ph / 2);
            const clampY = Math.max(0, Math.min(this.h - this.ph, targetY));
            p.prevY = p.y;
            p.y += (clampY - p.y) * lerp;
            p.vy = p.y - p.prevY;
        };
        updatePaddle(this.p1, inputSys.p1);
        updatePaddle(this.p2, inputSys.p2);

        if (this.state === 'serving') {
            const p = this.server === 1 ? this.p1 : this.p2;
            this.ball.y = p.y + this.ph / 2 - this.ball.r / 2;
            this.ball.x = (this.server === 1) ? p.x + this.pw + 10 : p.x - this.ball.r - 10;

            if (this.checkServe(inputSys.p1, inputSys.p2)) {
                const spd = this.speeds[this.cfg.diff];
                const dirX = (this.server === 1) ? 1 : -1;
                const dirY = p.vy * 0.15;
                const mag = Math.hypot(dirX, dirY) || 1;
                this.ball.vx = (dirX / mag) * spd;
                this.ball.vy = (dirY / mag) * spd;
                if (Math.abs(this.ball.vx) < 4) this.ball.vx = dirX * 4;
                AudioSys.hit();
            }
        } else {
            this.ball.x += this.ball.vx * ts;
            this.ball.y += this.ball.vy * ts;

            // Walls (with position correction)
            if (this.ball.y <= 0) {
                this.ball.y = 0;
                this.ball.vy = Math.abs(this.ball.vy); // Force down
                AudioSys.wall();
            } else if (this.ball.y + this.ball.r >= this.h) {
                this.ball.y = this.h - this.ball.r;
                this.ball.vy = -Math.abs(this.ball.vy); // Force up
                AudioSys.wall();
            }

            // Collision
            const hit = (p) => (this.ball.x < p.x + this.pw && this.ball.x + this.ball.r > p.x &&
                this.ball.y < p.y + this.ph && this.ball.y + this.ball.r > p.y);

            if ((hit(this.p1) && this.ball.vx < 0) || (hit(this.p2) && this.ball.vx > 0)) {
                // Position Correction: Push ball out of paddle to prevent sticking
                if (this.ball.vx < 0) this.ball.x = this.p1.x + this.pw;
                else this.ball.x = this.p2.x - this.ball.r;

                this.ball.vx *= -1.05;

                // Add spin/angle based on hit position
                const p = (this.ball.x < this.w / 2) ? this.p1 : this.p2;
                const offset = (this.ball.y + this.ball.r / 2) - (p.y + this.ph / 2);
                this.ball.vy += offset * 0.15;

                // Cap max vertical speed to prevent "teleporting"
                this.ball.vy = Math.max(-15, Math.min(15, this.ball.vy));

                AudioSys.hit();
            }

            // Score
            if (this.ball.x < -50) { this.p2Score++; AudioSys.score(); this.resetRound(1); }
            if (this.ball.x > this.w + 50) { this.p1Score++; AudioSys.score(); this.resetRound(2); }
        }
    }

    draw(ctx, colors, theme) {
        this.drawNet(ctx, theme);
        const drawRect = (e, c) => { ctx.fillStyle = c; ctx.fillRect(e.x, e.y, e.w || this.ball.r, e.h || this.ball.r); };
        drawRect(this.p1, colors.p1);
        drawRect(this.p2, colors.p2);
        drawRect(this.ball, colors.ball);
        if (this.state === 'serving') this.drawServeText(ctx);
    }
}