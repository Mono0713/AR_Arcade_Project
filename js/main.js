import { Engine } from './modules/Engine.js';
import { UIManager } from './modules/UIManager.js';
import { InputSys } from './modules/InputManager.js';

window.addEventListener('load', () => {
    console.log("Main.js: Window loaded");
    // 1. Initialize UI
    UIManager.init();

    // 2. Initialize Engine
    Engine.init();

    // 3. Initialize Input System (Triggers Camera)
    console.log("Main.js: Initializing InputSys...");
    InputSys.init().catch(err => {
        console.error("Main.js: InputSys init error:", err);
        document.getElementById('loading-text').innerText = "FATAL ERROR:\n" + err.message;
    });
});