import { 
    screensData, SCREEN_W, SCREEN_H, GAP, START_Y, canvasZoom, setCanvasZoom,
    globalBgColor, setGlobalBgColor, bgMode, setBgMode, 
    gradColor1, setGradColors, gradColor2, gradAngle, setGradAngle,
    currentLanguage, setCurrentLanguage, languages, setLanguages,
    imageBank, textBank, getImageForKey, getTextForKey,
    setTextForKey, getTextStyleForKey,
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
    addImageBankKey, addTextBankKey, bulkUploadImages
} from './ui-utils.js';
import { 
    exportZIP, exportAllLanguagesZIP, 
    exportProjectToJSON, importProjectFromJSON 
} from './transfer-service.js';
import { undo, redo, saveHistory, isRestoringHistory } from './history.js';
import { renderTemplateGrid } from './templates.js';
import { loadLocal3DModel, phoneModel } from './three-engine.js';
import { triggerAutoSave } from './persistence-service.js';

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
    canvas.on('selection:cleared', () => {
        ['screenControls', 'elementControls', 'rotationControls', 'deviceSettings'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    });
    
    // Project Manager listeners
    document.getElementById('projectMgrBtn')?.addEventListener('click', () => {
        showProjectManager();
    });

    document.getElementById('closeProjectMgrBtn')?.addEventListener('click', () => {
        hideProjectManager();
    });

    document.getElementById('mgrNewProjectBtn')?.addEventListener('click', () => {
        if (confirm('Create a new project? Unsaved changes in the current project will be lost.')) {
            window.location.reload(); 
        }
    });

    // Auto-save hooks
    canvas.on('object:modified', triggerAutoSave);
    canvas.on('object:added', triggerAutoSave);
    canvas.on('object:removed', triggerAutoSave);

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

    // Helper: persist style change to textBank if text has a textKey
    const saveStyleToBank = (obj, styles) => {
        if (!obj?.textKey || obj.type !== 'i-text') return;
        const cur = textBank[obj.textKey]?.[currentLanguage] || {};
        const t   = typeof cur === 'object' ? (cur.text || obj.text || '') : (cur || obj.text || '');
        setTextForKey(obj.textKey, currentLanguage, t, styles);
    };

    document.getElementById('textFontFamily')?.addEventListener('change', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('fontFamily', e.target.value); saveStyleToBank(obj, { fontFamily: e.target.value }); canvas.renderAll(); }
    });
    document.getElementById('textFontSize')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('fontSize', parseInt(e.target.value)); saveStyleToBank(obj, { fontSize: parseInt(e.target.value) }); canvas.renderAll(); }
    });
    document.getElementById('textColor')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('fill', e.target.value); saveStyleToBank(obj, { fill: e.target.value }); canvas.renderAll(); }
    });
    document.getElementById('textBoldBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') {
            const fw = (obj.fontWeight === 'bold' || obj.fontWeight === '700') ? 'normal' : 'bold';
            obj.set('fontWeight', fw); saveStyleToBank(obj, { fontWeight: fw });
            canvas.renderAll(); updateUIFromObject(obj);
        }
    });
    document.getElementById('textItalicBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') {
            const fs = obj.fontStyle === 'italic' ? 'normal' : 'italic';
            obj.set('fontStyle', fs); saveStyleToBank(obj, { fontStyle: fs });
            canvas.renderAll(); updateUIFromObject(obj);
        }
    });
    document.getElementById('textUnderlineBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') {
            const u = !obj.underline;
            obj.set('underline', u); saveStyleToBank(obj, { underline: u });
            canvas.renderAll(); updateUIFromObject(obj);
        }
    });
    document.getElementById('textLineThroughBtn')?.addEventListener('click', () => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') {
            const lt = !obj.linethrough;
            obj.set('linethrough', lt); saveStyleToBank(obj, { linethrough: lt });
            canvas.renderAll(); updateUIFromObject(obj);
        }
    });
    ['textAlignLeft', 'textAlignCenter', 'textAlignRight'].forEach(id => {
        const align = id.replace('textAlign', '').toLowerCase();
        document.getElementById(id)?.addEventListener('click', () => {
            const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') {
                obj.set('textAlign', align); saveStyleToBank(obj, { textAlign: align });
                canvas.renderAll(); updateUIFromObject(obj);
            }
        });
    });
    document.getElementById('textLineHeight')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('lineHeight', parseFloat(e.target.value)); saveStyleToBank(obj, { lineHeight: parseFloat(e.target.value) }); canvas.renderAll(); }
    });
    document.getElementById('textCharSpacing')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (obj?.type === 'i-text') { obj.set('charSpacing', parseInt(e.target.value)); saveStyleToBank(obj, { charSpacing: parseInt(e.target.value) }); canvas.renderAll(); }
    });
    // Shadow
    const applyShadow = () => {
        const obj = canvas.getActiveObject(); if (obj?.type !== 'i-text') return;
        const color = document.getElementById('textShadowColor')?.value || '#000000';
        const blur  = parseFloat(document.getElementById('textShadowBlur')?.value) || 0;
        const offX  = parseFloat(document.getElementById('textShadowOffX')?.value) || 0;
        const offY  = parseFloat(document.getElementById('textShadowOffY')?.value) || 0;
        if (blur === 0 && offX === 0 && offY === 0) {
            obj.set('shadow', null);
        } else {
            obj.set('shadow', new fabric.Shadow({ color, blur, offsetX: offX, offsetY: offY }));
        }
        canvas.renderAll();
    };
    ['textShadowColor', 'textShadowBlur', 'textShadowOffX', 'textShadowOffY'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', applyShadow);
    });
    // Stroke (outline)
    const applyStroke = () => {
        const obj = canvas.getActiveObject(); if (obj?.type !== 'i-text') return;
        const color = document.getElementById('textStrokeColor')?.value || '#000000';
        const width = parseFloat(document.getElementById('textStrokeWidth')?.value) || 0;
        obj.set({ stroke: width > 0 ? color : null, strokeWidth: width > 0 ? width : 0 });
        canvas.renderAll();
    };
    ['textStrokeColor', 'textStrokeWidth'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', applyStroke);
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
    
    const bulkBtn = document.getElementById('bulkUploadBtn');
    const bulkInput = document.getElementById('bulkImageInput');
    
    if (bulkBtn && bulkInput) {
        bulkBtn.addEventListener('click', () => {
            console.log("Bulk upload button clicked, triggering file input...");
            bulkInput.click();
        });
        bulkInput.addEventListener('change', async function() {
            console.log("Bulk input change detected, files:", this.files);
            try {
                await bulkUploadImages(this.files);
            } catch (err) {
                console.error("Bulk upload error:", err);
            }
            this.value = '';
        });
    } else {
        console.warn("Bulk upload elements not found in DOM:", { bulkBtn, bulkInput });
    }
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
    canvas.on('object:added',   () => { if (!isRestoringHistory) renderLayerPanel(); });
    canvas.on('object:removed', () => { if (!isRestoringHistory) renderLayerPanel(); });
    canvas.on('selection:created', (e) => { renderLayerPanel(); handleSelection(e); });
    canvas.on('selection:updated', (e) => { renderLayerPanel(); handleSelection(e); });
    canvas.on('selection:cleared', () => {
        renderLayerPanel();
        ['screenControls','elementControls','rotationControls','deviceSettings','textControls','shapeControls']
            .forEach(id => document.getElementById(id)?.classList.add('hidden'));
    });

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
    ['screenControls', 'elementControls', 'rotationControls', 'deviceSettings', 'textControls', 'shapeControls'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    if (obj.isScreen) {
        document.getElementById('screenControls')?.classList.remove('hidden');
    } else if (obj.isDesignElement) {
        document.getElementById('elementControls')?.classList.remove('hidden');
        if (obj.type === 'i-text') {
            document.getElementById('textControls')?.classList.remove('hidden');
            updateUIFromObject(obj);
        }
        if (obj.isShape || obj.isLaurel) {
            document.getElementById('shapeControls')?.classList.remove('hidden');
        }
        if (obj.is3DModel) {
            document.getElementById('deviceSettings')?.classList.remove('hidden');
            updateUIFromObject(obj);
        }
    }
}

function updateUIFromObject(obj) {
    // 3D device
    if (obj.is3DModel) {
        const frameEl = document.getElementById('frameColorInput');
        if (frameEl) frameEl.value = obj.frameColor;
        const keyEl = document.getElementById('deviceKeySelect');
        if (keyEl) keyEl.value = obj.imageKey || '';
        const rotControls = document.getElementById('rotationControls');
        if (obj.is2DMode) rotControls?.classList.add('hidden'); else {
            rotControls?.classList.remove('hidden');
            ['rotX', 'rotY', 'rotZ'].forEach(id => { document.getElementById(id).value = obj[id]; });
        }
        return;
    }
    // Text
    if (obj.type === 'i-text') {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const setActive = (id, active) => { const el = document.getElementById(id); if (el) el.classList.toggle('bg-blue-200', active); };

        set('textFontFamily', obj.fontFamily || '"Inter", sans-serif');
        set('textFontSize', obj.fontSize || 42);
        // fill is a CSS hex string; convert if necessary
        const fillHex = (typeof obj.fill === 'string' && obj.fill.startsWith('#')) ? obj.fill : '#ffffff';
        set('textColor', fillHex);

        setActive('textBoldBtn',        obj.fontWeight === 'bold' || obj.fontWeight === '700');
        setActive('textItalicBtn',      obj.fontStyle === 'italic');
        setActive('textUnderlineBtn',   !!obj.underline);
        setActive('textLineThroughBtn', !!obj.linethrough);

        ['textAlignLeft', 'textAlignCenter', 'textAlignRight'].forEach(id => {
            const align = id.replace('textAlign', '').toLowerCase();
            setActive(id, (obj.textAlign || 'left') === align);
        });

        set('textLineHeight',  obj.lineHeight  ?? 1.2);
        set('textCharSpacing', obj.charSpacing ?? 0);

        // Shadow
        const sh = obj.shadow;
        set('textShadowColor', (sh && sh.color) ? sh.color : '#000000');
        set('textShadowBlur',  sh ? sh.blur  : 0);
        set('textShadowOffX',  sh ? sh.offsetX : 0);
        set('textShadowOffY',  sh ? sh.offsetY : 3);

        // Stroke
        set('textStrokeColor', obj.stroke || '#000000');
        set('textStrokeWidth', obj.strokeWidth || 0);
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

async function showProjectManager() {
    const modal = document.getElementById('projectManagerModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    await refreshProjectList();
}

function hideProjectManager() {
    const modal = document.getElementById('projectManagerModal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function refreshProjectList() {
    if (!window.electronAPI) return;
    const container = document.getElementById('projectListContainer');
    const projects = await window.electronAPI.getProjects();
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <p class="text-slate-400 text-sm italic">No projects found. Start by saving your current work!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(p => `
        <div class="bg-slate-100/50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 group hover:border-indigo-400 transition-all cursor-pointer" data-id="${p.id}">
            <div class="aspect-video bg-white rounded-lg border border-slate-200 overflow-hidden relative shadow-inner">
                ${p.thumbnail ? `<img src="${p.thumbnail}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-slate-300">No Preview</div>'}
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-slate-800 text-xs truncate w-32">${p.name}</h3>
                    <p class="text-[9px] text-slate-400 font-bold uppercase">${new Date(p.last_modified).toLocaleDateString()}</p>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="load-btn p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-xs" data-id="${p.id}">📂</button>
                    <button class="delete-btn p-1.5 bg-white hover:bg-red-50 border border-slate-200 rounded-lg text-xs" data-id="${p.id}">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const project = await window.electronAPI.loadProject(btn.dataset.id);
            if (project) {
                // For a full production app, we would implement a full state restoration here.
                // In this implementation, we suggest a reload or a direct state injection.
                alert('Project data ready. Implementing state restoration...');
                hideProjectManager();
            }
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Delete project?')) {
                await window.electronAPI.deleteProject(btn.dataset.id);
                refreshProjectList();
            }
        });
    });
}
