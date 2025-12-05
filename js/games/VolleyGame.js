import { GameBase } from './GameBase.js';
import { AudioSys } from '../modules/AudioManager.js';

export class VolleyGame extends GameBase {
    constructor(w, h, config) {
        super(w, h);
        this.cfg = config;
        this.slimeR = 60;
        this.netH = 220;
        this.gravity = { easy: 0.25, normal: 0.45, hard: 0.7 }[config.diff];

        this.p1 = { x: w * 0.25, y: h, vy: 0 };
        this.p2 = { x: w * 0.75, y: h, vy: 0 };
    }

    update(dt, inputSys) {
        const ts = dt * 60;

        const updateSlime = (p, inp, isLeft) => {
            const tx = inp.x * this.w;
            const min = isLeft ? this.slimeR : this.w / 2 + this.slimeR;
            const max = isLeft ? this.w / 2 - this.slimeR : this.w - this.slimeR;
            p.x += (Math.max(min, Math.min(max, tx)) - p.x) * 0.2 * ts;
            if (inp.y < 0.3 && p.y >= this.h) p.vy = -15;
            p.y += p.vy * ts;
            p.vy += this.gravity * ts;
            if (p.y > this.h) { p.y = this.h; p.vy = 0; }
        };
        updateSlime(this.p1, inputSys.p1, true);
        updateSlime(this.p2, inputSys.p2, false);

        if (this.state === 'serving') {
            const p = this.server === 1 ? this.p1 : this.p2;
            this.ball.x = p.x;
            this.ball.y = p.y - 120;

            if (this.checkServe(inputSys.p1, inputSys.p2)) {
                this.ball.vy = -12;
                this.ball.vx = (this.server === 1) ? 8 : -8;
                AudioSys.hit();
            }
        } else {
            this.ball.vy += 0.25 * ts;
            this.ball.x += this.ball.vx * ts;
            this.ball.y += this.ball.vy * ts;

            // Net Collision
            if (this.ball.y > this.h - this.netH) {
                if (Math.abs(this.ball.x - this.w / 2) < this.ball.r + 5) {
                    this.ball.vx *= -0.8;
                    this.ball.x = this.ball.x < this.w / 2 ? this.w / 2 - 30 : this.w / 2 + 30;
                    AudioSys.wall();
                }
            }
            if (this.ball.x < this.ball.r || this.ball.x > this.w - this.ball.r) { this.ball.vx *= -0.8; AudioSys.wall(); }
            if (this.ball.y < -300) this.ball.vy *= -1;

            [this.p1, this.p2].forEach(p => {
                const dx = this.ball.x - p.x, dy = this.ball.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.slimeR + this.ball.r) {
                    const ang = Math.atan2(dy, dx);
                    const spd = Math.min(20, Math.hypot(this.ball.vx, this.ball.vy) + 2);
                    this.ball.vx = Math.cos(ang) * spd;
                    this.ball.vy = Math.sin(ang) * spd;
                    this.ball.x += Math.cos(ang) * ((this.slimeR + this.ball.r) - dist);
                    this.ball.y += Math.sin(ang) * ((this.slimeR + this.ball.r) - dist);
                    AudioSys.hit();
                }
            });

            if (this.ball.y > this.h - this.ball.r) {
                if (this.ball.x < this.w / 2) { this.p2Score++; AudioSys.score(); this.resetRound(1); }
                else { this.p1Score++; AudioSys.score(); this.resetRound(2); }
            }
        }
    }

    draw(ctx, colors, theme) {
        // Custom Net for Volley
        ctx.strokeStyle = (theme === 'camera') ? 'rgba(255,255,255,0.4)' : '#555';
        ctx.lineWidth = 4; ctx.setLineDash([20, 20]);
        ctx.beginPath(); ctx.moveTo(this.w / 2, this.h); ctx.lineTo(this.w / 2, this.h - this.netH); ctx.stroke(); ctx.setLineDash([]);

        const drawSlime = (p, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, this.slimeR, Math.PI, 0); ctx.fill(); };
        drawSlime(this.p1, colors.p1);
        drawSlime(this.p2, colors.p2);

        ctx.fillStyle = colors.ball;
        ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill();

        if (this.state === 'serving') this.drawServeText(ctx);
    }
}