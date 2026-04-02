import { 
    screensData, currentLanguage, languages, imageBank, textBank,
    globalBgColor, bgMode, gradColor1, gradColor2, gradAngle, currentPreset
} from './state.js';
import { getCanvas } from './canvas-core.js';

let lastSavedState = null;
let saveTimeout = null;
let isSaving = false;

export function initPersistence() {
    if (!window.electronAPI) {
        console.warn('[Persistence] Electron API not found. Auto-save disabled.');
        return;
    }

    console.log('[Persistence] Initialized with Electron SQLite.');

    // Listen for changes on canvas or state
    // For now, we will expose a function to trigger a save
}

export async function saveCurrentProject(name = "Untitled Project", id = "default_project") {
    if (!window.electronAPI) return;
    
    // Show saving UI
    updateSaveStatus('Saving...');
    isSaving = true;

    try {
        const projectData = {
            id,
            name,
            config: {
                screensData,
                globalBgColor,
                bgMode,
                gradColor1,
                gradColor2,
                gradAngle,
                currentPreset,
                currentLanguage,
                languages
            },
            imageBank,
            textBank,
            thumbnail: getCanvas().toDataURL({ format: 'webp', quality: 0.1 }) // Low res thumbnail
        };

        const result = await window.electronAPI.saveProject(projectData);
        if (result.success) {
            updateSaveStatus('Saved to DB');
            lastSavedState = JSON.stringify(projectData);
        } else {
            updateSaveStatus('Error saving');
            console.error('[Persistence] Save failed:', result.error);
        }
    } catch (err) {
        updateSaveStatus('Error');
        console.error('[Persistence] Critical error:', err);
    } finally {
        isSaving = false;
        setTimeout(() => { if (!isSaving) updateSaveStatus('Ready'); }, 3000);
    }
}

export function triggerAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCurrentProject();
    }, 5000); // 5 seconds of inactivity
}

function updateSaveStatus(text) {
    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.classList.remove('text-slate-400', 'text-indigo-500', 'text-red-500');
        if (text === 'Saving...') statusEl.classList.add('text-indigo-500');
        else if (text === 'Error') statusEl.classList.add('text-red-500');
        else statusEl.classList.add('text-slate-400');
    }
}
