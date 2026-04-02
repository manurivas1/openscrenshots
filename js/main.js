import { initCanvas, renderLayout, applyGlobalBackground, updateCanvasSize } from './canvas-core.js';
import { loadLocal3DModel } from './three-engine.js';
import { initUI } from './ui-controllers.js';
import { initDesignAPI } from './design-api.js';
import { initHistoryEvents, saveHistory } from './history.js';
import { initPersistence } from './persistence-service.js';
import { 
    renderLanguageSelector, renderImageBankUI, renderTextBankUI, 
    updateKeySelects, updateTextKeySelects 
} from './ui-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core initialization
    initCanvas();
    
    // 2. UI & API Initialization
    initUI();
    initDesignAPI();
    initPersistence();
    initHistoryEvents();

    // 3. Initial state setup
    renderLanguageSelector();
    renderImageBankUI();
    renderTextBankUI();
    updateKeySelects();
    updateTextKeySelects();
    
    // 4. Initial 3D model load
    const deviceSelect = document.getElementById('deviceModelSelect');
    if (deviceSelect) {
        loadLocal3DModel(deviceSelect.value, () => {
            renderLayout();
            applyGlobalBackground();
            setTimeout(() => saveHistory(), 100);
        });
    } else {
        renderLayout();
        applyGlobalBackground();
        setTimeout(() => saveHistory(), 100);
    }

    // 5. Global Resize
    window.addEventListener('resize', () => {
        updateCanvasSize();
        renderLayout();
    });
});
