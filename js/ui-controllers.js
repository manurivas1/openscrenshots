import { 
    screensData, SCREEN_W, SCREEN_H, GAP, START_Y, canvasZoom, setCanvasZoom,
    globalBgColor, setGlobalBgColor, bgMode, setBgMode, 
    gradColor1, setGradColors, gradColor2, gradAngle, setGradAngle,
    currentLanguage, setCurrentLanguage, languages, setLanguages,
    imageBank, textBank, getImageForKey, getTextForKey, 
    DEVICE_CONFIG, SCREEN_PRESETS, currentPreset
} from './state.js';
import { 
    getCanvas, renderLayout, updateCanvasSize, 
    applyGlobalBackground, applyScreenPreset, addBgImageFromData 
} from './canvas-core.js';
import { 
    syncAndRenderActiveDevice, addTextElement, 
    addAwardBadge, createShape, add3DDeviceElement 
} from './elements-manager.js';
import { 
    renderImageBankUI, renderTextBankUI, updateKeySelects, 
    updateTextKeySelects, renderLanguageSelector, 
    renderLanguageGrid, refreshAllTexts, renderLayerPanel,
    addImageBankKey, addTextBankKey
} from './ui-utils.js';
import { 
    exportZIP, exportAllLanguagesZIP, 
    exportProjectToJSON, importProjectFromJSON 
} from './transfer-service.js';
import { undo, redo, saveHistory, isRestoringHistory } from './history.js';
import { renderTemplateGrid } from './templates.js';
import { loadLocal3DModel, phoneModel } from './three-engine.js';

let snapEnabled = true;
const SNAP_THRESHOLD = 8;
let guideLines = [];

export function initUI() {
    const canvas = getCanvas();
    const workspaceContainer = document.getElementById('workspaceContainer');

    // Navigation
    document.getElementById('navDesignBtn')?.addEventListener('click', () => switchView('design'));
    document.getElementById('navImagesBtn')?.addEventListener('click', () => switchView('images'));
    document.getElementById('navTextsBtn')?.addEventListener('click', () => switchView('texts'));

    // Element selection
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
        ['screenControls', 'elementControls', 'rotationControls', 'deviceSettings'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    });

    // Device Studio
    document.getElementById('deviceModelSelect')?.addEventListener('change', (e) => loadLocal3DModel(e.target.value));
    document.getElementById('add3DDeviceBtn')?.addEventListener('click', () => {
        const keyEl = document.getElementById('deviceScreenshotKey');
        add3DDeviceElement(document.getElementById('deviceModelSelect').value, keyEl.value || null);
    });

    // Element Insertion
    document.getElementById('addTextBtn')?.addEventListener('click', () => {
        addTextElement(document.getElementById('addTextKeySelect')?.value || '');
    });
    document.getElementById('addAwardBtn')?.addEventListener('click', addAwardBadge);
    
    document.getElementById('addRectBtn')?.addEventListener('click', () => createShape('rect'));
    document.getElementById('addCircleBtn')?.addEventListener('click', () => createShape('circle'));
    document.getElementById('addLineBtn')?.addEventListener('click', () => createShape('line'));
    document.getElementById('addArrowBtn')?.addEventListener('click', () => createShape('arrow'));

    document.getElementById('freeImageInput')?.addEventListener('change', function() {
        var file = this.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = (ev) => {
            fabric.Image.fromURL(ev.target.result, (img) => {
                var scale = Math.min(300 / img.width, 500 / img.height, 1);
                img.set({
                    left: canvas.width / 2 - (img.width * scale) / 2, top: 150,
                    scaleX: scale, scaleY: scale, isDesignElement: true, isFreeImage: true,
                    clipPath: getCanvas().clipPath, borderColor: '#6366f1', cornerColor: '#6366f1',
                    cornerStyle: 'circle', cornerSize: 10, transparentCorners: false, padding: 4
                });
                canvas.add(img); canvas.setActiveObject(img); renderLayout();
            });
        };
        reader.readAsDataURL(file);
        this.value = '';
    });

    // Screen controls
    document.getElementById('addScreenBtn')?.addEventListener('click', () => {
        screensData.push({ id: 'screen_' + Date.now(), color: '#ffffff', obj: null });
        renderLayout();
    });

    document.getElementById('screenBgColor')?.addEventListener('input', (e) => {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isScreen) {
            screensData.find(s => s.id === activeObj.screenId).color = e.target.value;
            renderLayout();
        }
    });

    document.getElementById('screenTransparentBtn')?.addEventListener('click', () => {
        const activeObj = canvas.getActiveObject();
        if (!activeObj || !activeObj.isScreen) return;
        const screenData = screensData.find(s => s.id === activeObj.screenId);
        screenData.color = activeObj.fill === 'transparent' ? '#ffffff' : 'transparent';
        renderLayout();
        handleSelection({ selected: [activeObj] });
    });

    // Element controls
    document.getElementById('lockElementBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject();
        if (!obj || !obj.isDesignElement) return;
        const isLocked = !!obj.lockMovementX;
        obj.set({
            lockMovementX: !isLocked, lockMovementY: !isLocked,
            lockScalingX: !isLocked, lockScalingY: !isLocked,
            lockRotation: !isLocked, hasControls: isLocked
        });
        handleSelection({ selected: [obj] });
        canvas.renderAll();
    });

    document.getElementById('deleteElementBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        if (obj.isScreen) {
            if (screensData.length <= 1) return;
            const idx = screensData.findIndex(s => s.id === obj.screenId);
            screensData.splice(idx, 1);
            canvas.remove(obj); canvas.discardActiveObject(); renderLayout();
        } else if (obj.isDesignElement) {
            canvas.remove(obj); canvas.discardActiveObject();
        }
    });

    document.getElementById('cloneElementBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject();
        if (!obj || !obj.isDesignElement) return;
        obj.clone((cloned) => {
            canvas.discardActiveObject();
            cloned.set({ left: obj.left + 20, top: obj.top + 20, clipPath: canvas.clipPath });
            canvas.add(cloned); canvas.setActiveObject(cloned); canvas.requestRenderAll();
        });
    });

    // Style inputs
    document.getElementById('elementOpacity')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (!obj) return;
        var val = parseInt(e.target.value) / 100;
        obj.set('opacity', val);
        document.getElementById('opacityLabel').textContent = e.target.value + '%';
        canvas.renderAll();
    });

    document.getElementById('textFontFamily')?.addEventListener('change', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('fontFamily', e.target.value); canvas.renderAll(); }
    });
    document.getElementById('textFontSize')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('fontSize', parseInt(e.target.value)); canvas.renderAll(); }
    });
    document.getElementById('textColor')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('fill', e.target.value); canvas.renderAll(); }
    });
    document.getElementById('textBoldBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') {
            obj.set('fontWeight', (obj.fontWeight === 'bold' || obj.fontWeight === '700') ? 'normal' : 'bold');
            canvas.renderAll(); handleSelection({ selected: [obj] });
        }
    });

    document.getElementById('shapeFillColor')?.addEventListener('input', function() {
        const obj = canvas.getActiveObject(); if (!obj) return;
        const applyFill = (target) => {
            if (target.isShape) target.set('fill', this.value);
            if (target.isLaurel && target.getObjects) {
                target.getObjects().forEach(sub => { if (sub.fill) sub.set('fill', this.value); });
            }
        };
        if (obj.type === 'activeSelection') obj.getObjects().forEach(applyFill); else applyFill(obj);
        canvas.renderAll();
    });

    // 3D inputs
    ['rotX', 'rotY', 'rotZ'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            const obj = canvas.getActiveObject(); if (obj?.is3DModel && !obj.is2DMode) {
                obj.set({ [id]: parseFloat(e.target.value) }); syncAndRenderActiveDevice();
            }
        });
    });

    document.getElementById('mode2DBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.is3DModel) { obj.set({ is2DMode: true }); syncAndRenderActiveDevice(); updateUIFromObject(obj); }
    });
    document.getElementById('mode3DBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.is3DModel) { obj.set({ is2DMode: false }); syncAndRenderActiveDevice(); updateUIFromObject(obj); }
    });
    document.getElementById('frameColorInput')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.is3DModel) { obj.set({ frameColor: e.target.value }); syncAndRenderActiveDevice(); }
    });
    document.getElementById('deviceKeySelect')?.addEventListener('change', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.is3DModel) { obj.set({ imageKey: e.target.value || null }); syncAndRenderActiveDevice(); }
    });

    // Backgrounds
    document.getElementById('bgModeSolid')?.addEventListener('click', () => {
        setBgMode('solid'); updateBgUI(); applyGlobalBackground();
    });
    document.getElementById('bgModeGradient')?.addEventListener('click', () => {
        setBgMode('gradient'); updateBgUI(); applyGlobalBackground();
    });
    document.getElementById('globalBgColor')?.addEventListener('input', (e) => {
        setGlobalBgColor(e.target.value); applyGlobalBackground();
    });
    document.getElementById('gradColor1')?.addEventListener('input', (e) => {
        setGradColors(e.target.value, gradColor2); applyGlobalBackground();
    });
    document.getElementById('gradColor2')?.addEventListener('input', (e) => {
        setGradColors(gradColor1, e.target.value); applyGlobalBackground();
    });
    document.getElementById('gradAngle')?.addEventListener('input', (e) => {
        setGradAngle(parseInt(e.target.value));
        document.getElementById('gradAngleLabel').textContent = e.target.value + '°';
        applyGlobalBackground();
    });

    document.getElementById('globalBgImage')?.addEventListener('change', function() {
        var file = this.files[0]; if (!file) return;
        var r = new FileReader(); r.onload = (ev) => addBgImageFromData(ev.target.result); r.readAsDataURL(file);
    });

    // Projects
    document.getElementById('exportBtn')?.addEventListener('click', () => exportZIP());
    document.getElementById('exportAllLangsBtn')?.addEventListener('click', () => exportAllLanguagesZIP(async (l) => {
        setCurrentLanguage(l); document.getElementById('languageSelect').value = l;
        refreshAllTexts();
        const devices = canvas.getObjects().filter(o => o.is3DModel);
        for (let d of devices) {
            await syncAndRenderActiveDevice(d);
        }
        canvas.renderAll();
    }));
    document.getElementById('exportProjectBtn')?.addEventListener('click', exportProjectToJSON);
    document.getElementById('importProjectInput')?.addEventListener('change', function() {
        var file = this.files[0]; if (!file) return;
        var r = new FileReader(); 
        r.onload = (ev) => importProjectFromJSON(ev.target.result, (project) => {
            document.getElementById('globalBgColor').value = project.globalBgColor;
            document.getElementById('gradColor1').value = project.gradColor1;
            document.getElementById('gradColor2').value = project.gradColor2;
            document.getElementById('gradAngle').value = project.gradAngle;
            updateBgUI();
            renderLanguageSelector();
            renderImageBankUI();
            renderTextBankUI();
            updateKeySelects();
            updateTextKeySelects();
        });
        r.readAsText(file); this.value = '';
    });

    // Banks
    document.getElementById('addKeyBtn')?.addEventListener('click', () => addImageBankKey(null));
    document.getElementById('addTextKeyBtn')?.addEventListener('click', () => addTextBankKey(null));
    document.getElementById('languageSelect')?.addEventListener('change', async (e) => {
        setCurrentLanguage(e.target.value); refreshAllTexts();
        const devices = canvas.getObjects().filter(o => o.is3DModel);
        for (const d of devices) {
            await syncAndRenderActiveDevice(d);
        }
        canvas.renderAll();
    });

    // Modals
    document.getElementById('openLanguageModalBtn')?.addEventListener('click', () => {
        renderLanguageGrid(); document.getElementById('languageModal').classList.remove('hidden');
    });
    document.getElementById('closeLanguageModalBtn')?.addEventListener('click', () => {
        document.getElementById('languageModal').classList.add('hidden'); refreshAllTexts();
    });
    document.getElementById('closeLanguageModalBtn2')?.addEventListener('click', () => {
        document.getElementById('languageModal').classList.add('hidden'); refreshAllTexts();
    });
    document.getElementById('openTemplatesBtn')?.addEventListener('click', () => {
        renderTemplateGrid(); document.getElementById('templatesModal').classList.remove('hidden');
    });
    document.getElementById('aboutBtn')?.addEventListener('click', () => document.getElementById('aboutModal').classList.remove('hidden'));
    document.getElementById('closeAboutBtn')?.addEventListener('click', () => document.getElementById('aboutModal').classList.add('hidden'));

    // Zoom & Snap
    workspaceContainer.addEventListener('wheel', function(e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        var delta = -e.deltaY / 500;
        const newZoom = Math.min(3, Math.max(0.25, canvasZoom + delta));
        setCanvasZoom(newZoom);
        canvas.setZoom(newZoom);
        updateCanvasSize();
        document.getElementById('zoomIndicator').textContent = Math.round(newZoom * 100) + '%';
        canvas.requestRenderAll();
    }, { passive: false });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const active = canvas.getActiveObject();
            if (active && active.isDesignElement && !active.isEditing) document.getElementById('deleteElementBtn').click();
        }
    });

    // Layer Panel events
    canvas.on('object:added', () => { if (!isRestoringHistory) renderLayerPanel(); });
    canvas.on('object:removed', () => { if (!isRestoringHistory) renderLayerPanel(); });
    canvas.on('selection:created', () => renderLayerPanel());
    canvas.on('selection:updated', () => renderLayerPanel());
    canvas.on('selection:cleared', () => renderLayerPanel());

    // Snapping Logic
    canvas.on('object:moving', (e) => {
        if (!snapEnabled) return;
        clearGuideLines();
        var obj = e.target; if (!obj || !obj.isDesignElement) return;
        var b = obj.getBoundingRect(true);
        var cx = b.left + b.width/2, cy = b.top + b.height/2;

        var targets = [];
        screensData.forEach(s => { if (s.obj) targets.push({ cx: s.obj.left + SCREEN_W/2, cy: s.obj.top + SCREEN_H/2, l: s.obj.left, r: s.obj.left + SCREEN_W, t: s.obj.top, b: s.obj.top + SCREEN_H }); });
        canvas.getObjects().forEach(o => { if (o !== obj && o.isDesignElement && o.visible !== false) { var ob = o.getBoundingRect(true); targets.push({ cx: ob.left + ob.width/2, cy: ob.top + ob.height/2, l: ob.left, r: ob.left+ob.width, t: ob.top, b: ob.top+ob.height }); }});

        targets.forEach(t => {
            if (Math.abs(cx - t.cx) < SNAP_THRESHOLD) { obj.set('left', obj.left + (t.cx - cx)); addGuideLine(t.cx, 0, t.cx, canvas.height); }
            if (Math.abs(cy - t.cy) < SNAP_THRESHOLD) { obj.set('top', obj.top + (t.cy - cy)); addGuideLine(0, t.cy, canvas.width, t.cy); }
        });
    });
    canvas.on('drag:end', clearGuideLines);
}

function switchView(view) {
    ['designView', 'imagesView', 'textsView'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    ['navDesignBtn', 'navImagesBtn', 'navTextsBtn'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById(view + 'View')?.classList.remove('hidden');
    document.getElementById('nav' + view.charAt(0).toUpperCase() + view.slice(1) + 'Btn')?.classList.add('active');
    if (view === 'images') renderImageBankUI();
    if (view === 'texts') renderTextBankUI();
}

function handleSelection(e) {
    const obj = e.selected[0]; if (!obj) return;
    ['screenControls', 'elementControls', 'rotationControls', 'deviceSettings'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    if (obj.isScreen) document.getElementById('screenControls')?.classList.remove('hidden');
    else if (obj.isDesignElement) {
        document.getElementById('elementControls')?.classList.remove('hidden');
        if (obj.is3DModel) {
            document.getElementById('deviceSettings')?.classList.remove('hidden');
            updateUIFromObject(obj);
        }
    }
}

function updateUIFromObject(obj) {
    const frameEl = document.getElementById('frameColorInput');
    if (frameEl) frameEl.value = obj.frameColor;
    const keyEl = document.getElementById('deviceKeySelect');
    if (keyEl) keyEl.value = obj.imageKey || '';
    
    const rotControls = document.getElementById('rotationControls');
    if (obj.is2DMode) rotControls?.classList.add('hidden'); else {
        rotControls?.classList.remove('hidden');
        ['rotX', 'rotY', 'rotZ'].forEach(id => { document.getElementById(id).value = obj[id]; });
    }
}

function updateBgUI() {
    const isSolid = bgMode === 'solid';
    document.getElementById('bgModeSolid')?.classList.toggle('active', isSolid);
    document.getElementById('bgModeGradient')?.classList.toggle('active', !isSolid);
    document.getElementById('bgSolidControls')?.classList.toggle('hidden', !isSolid);
    document.getElementById('bgGradientControls')?.classList.toggle('hidden', isSolid);
}

function addGuideLine(x1, y1, x2, y2) {
    var line = new fabric.Line([x1, y1, x2, y2], { stroke: '#f43f5e', strokeWidth: 1, strokeDashArray: [4, 3], selectable: false, evented: false });
    getCanvas().add(line); guideLines.push(line);
}
function clearGuideLines() { guideLines.forEach(l => getCanvas().remove(l)); guideLines = []; }
