export class HandMenuSystem {
    constructor() {
        this.cursors = { p1: null, p2: null };
        this.hoverState = {
            p1: { target: null, startTime: 0, progress: 0 },
            p2: { target: null, startTime: 0, progress: 0 }
        };
        this.HOVER_DURATION = 1000; // 1 second
    }

    init() {
        this.createCursor('p1', '#00ff00');
        this.createCursor('p2', '#ff0000');
    }

    createCursor(id, color) {
        const cursor = document.createElement('div');
        cursor.id = `cursor-${id}`;
        cursor.className = 'hand-cursor';

        // Inner Dot + Ring (Ring is hidden by css until 'hovering' class is added)
        cursor.innerHTML = `
            <div class="cursor-dot" style="background-color: ${color}"></div>
            <svg class="cursor-ring" width="40" height="40" viewBox="0 0 40 40">
                <circle class="ring-bg" cx="20" cy="20" r="14" stroke="rgba(255,255,255,0.2)" stroke-width="3" fill="none" />
                <circle class="ring-progress" cx="20" cy="20" r="14" stroke="${color}" stroke-width="3" fill="none" 
                        stroke-dasharray="88" stroke-dashoffset="88" />
            </svg>
        `;
        document.body.appendChild(cursor);
        this.cursors[id] = cursor;
    }

    update(p1, p2) {
        // Only active if menu is visible (simple check: if settings container exists and is visible)
        // Or check global UIManager state if available. 
        // For robustness, checking if the menu-screen is not hidden.
        const menuScreen = document.getElementById('screen-menu');
        const isMenuVisible = menuScreen && !menuScreen.classList.contains('hidden');
        const isGameOverVisible = document.getElementById('screen-gameover') && !document.getElementById('screen-gameover').classList.contains('hidden');

        if (!isMenuVisible && !isGameOverVisible) {
            this.toggleCursor(this.cursors.p1, false);
            this.toggleCursor(this.cursors.p2, false);
            return;
        }

        this.updatePlayer('p1', p1);
        this.updatePlayer('p2', p2);
    }

    updatePlayer(id, handData) {
        const cursor = this.cursors[id];
        if (!handData.visible) {
            this.toggleCursor(cursor, false);
            this.resetHover(id);
            return;
        }

        this.toggleCursor(cursor, true);

        // Convert normalized (0-1) to Screen Pixels
        const x = handData.x * window.innerWidth;
        const y = handData.y * window.innerHeight;

        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;

        // Check Collision with Interactive Elements
        // Selectors: .opt-btn, .start-btn, .arrow-btn, #btn-menu
        const targets = document.querySelectorAll('.opt-btn, .start-btn, .arrow-btn, #btn-menu, #btn-prev-game, #btn-next-game');
        let hit = null;

        targets.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                hit = el;
            }
        });

        this.handleHover(id, hit);
    }

    handleHover(id, target) {
        const state = this.hoverState[id];
        const ring = this.cursors[id].querySelector('.ring-progress');
        const cursorEl = this.cursors[id];

        if (target && target === state.target) {
            // Continuation
            const elapsed = Date.now() - state.startTime;
            const progress = Math.min(1, elapsed / this.HOVER_DURATION);

            // Update Ring (88 is circumference)
            const offset = 88 - (88 * progress);
            ring.style.strokeDashoffset = offset;

            if (progress >= 1) {
                // Trigger Click
                target.click();

                // Reset to avoid double click
                this.resetHover(id);
            }
        } else if (target) {
            // New Target
            if (state.target) state.target.classList.remove('force-hover');
            target.classList.add('force-hover');
            cursorEl.classList.add('hovering'); // Show Ring

            state.target = target;
            state.startTime = Date.now();
            ring.style.strokeDashoffset = 88;
        } else {
            // No Target
            if (state.target) state.target.classList.remove('force-hover');
            cursorEl.classList.remove('hovering'); // Hide Ring

            this.resetHover(id);
            ring.style.strokeDashoffset = 88;
        }
    }

    resetHover(id) {
        if (this.hoverState[id].target) {
            this.hoverState[id].target.classList.remove('force-hover');
        }
        this.cursors[id].classList.remove('hovering'); // Ensure ring is hidden

        this.hoverState[id].target = null;
        this.hoverState[id].startTime = 0;
        const ring = this.cursors[id].querySelector('.ring-progress');
        if (ring) ring.style.strokeDashoffset = 88;
    }

    toggleCursor(el, show) {
        el.style.display = show ? 'block' : 'none';
    }
}
