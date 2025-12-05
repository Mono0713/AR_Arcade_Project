export class GameBase {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.p1Score = 0;
        this.p2Score = 0;
        this.state = 'serving';
        this.server = 1;
        this.ball = { x: 0, y: 0, r: 15, vx: 0, vy: 0 };
        this.serveStartTime = 0;
    }

    resetRound(winner) {
        this.state = 'serving';
        this.server = winner;
        this.serveStartTime = Date.now();
        this.ball.vx = 0;
        this.ball.vy = 0;
    }

    checkServe(p1Input, p2Input) {
        const elapsed = Date.now() - this.serveStartTime;
        const autoServe = elapsed > 5000;
        const activeInput = (this.server === 1) ? p1Input : p2Input;

        if (activeInput.fist || autoServe) {
            this.state = 'playing';
            return true; // Trigger start
        }
        return false;
    }

    drawNet(ctx, theme) {
        ctx.strokeStyle = (theme === 'camera') ? 'rgba(255,255,255,0.4)' : '#555';
        ctx.lineWidth = 4; ctx.setLineDash([20, 20]);
        ctx.beginPath();
        // Pong style default
        ctx.moveTo(this.w / 2, 0); ctx.lineTo(this.w / 2, this.h);
        ctx.stroke(); ctx.setLineDash([]);
    }

    drawServeText(ctx) {
        const timeLeft = Math.ceil((5000 - (Date.now() - this.serveStartTime)) / 1000);
        ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffeb3b';
        ctx.fillText(`MAKE FIST (${timeLeft})`, this.w / 2, this.h / 2 + 50);
    }
}