/* global JSZip, fabric */
import { 
    screensData, SCREEN_W, SCREEN_H, currentPreset, SCREEN_PRESETS,
    currentLanguage, imageBank, textBank, languages, elementLayouts,
    globalBgColor, bgMode, gradColor1, gradColor2, gradAngle,
    globalClipPath, setCurrentLanguage, setImageBank, setTextBank, setLanguages,
    setGlobalBgColor, setBgMode, setGradColors, setGradAngle, setScreensData, setElementLayouts
} from './state.js';

import { getCanvas, renderLayout, applyGlobalBackground } from './canvas-core.js';
import { loadLocal3DModel, applyTextureToScreen, render3DToImage, phoneModel, phoneBodyMeshes } from './three-engine.js';
import { getImageForKey } from './state.js';

function renderScreenDataURL(screen) {
    const canvas = getCanvas();
    const preset  = SCREEN_PRESETS[currentPreset];

    canvas.discardActiveObject();
    
    // Save original viewport state
    const originalVT = [...canvas.viewportTransform];
    
    // Temporarily reset zoom/pan for exact export mapping
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    // Export with unscaled dimensions + multiplier
    // Final result is exactly SCREEN_W * multiplier x SCREEN_H * multiplier
    const multiplier = preset.w / SCREEN_W;
    
    const dataURL = canvas.toDataURL({
        left:       screen.obj.left,
        top:        screen.obj.top,
        width:      SCREEN_W,
        height:     SCREEN_H,
        format:     'png',
        quality:    1,
        multiplier: multiplier
    });

    // Restore viewport
    canvas.setViewportTransform(originalVT);
    canvas.renderAll();

    return dataURL;
}

function dataURLtoBytes(dataURL) {
    return dataURL.split(',')[1]; 
}

export async function exportZIP(lang = currentLanguage) {
    const canvas = getCanvas();
    canvas.discardActiveObject(); 
    canvas.renderAll();
    
    const zip = new JSZip();
    const folder = zip.folder(lang);
    
    screensData.forEach((screen, i) => {
        const dataURL = renderScreenDataURL(screen);
        folder.file(`screen_${i + 1}_${lang}.png`, dataURLtoBytes(dataURL), { base64: true });
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `openscreenshots_${getSafeProjectName()}_${lang}.zip`);
}

export async function exportAllLanguagesZIP(switchLanguageFn) {
    const canvas = getCanvas();
    canvas.discardActiveObject(); 
    canvas.renderAll();
    
    const zip = new JSZip();
    const originalLang = currentLanguage;
    
    for (const lang of languages) {
        await switchLanguageFn(lang);
        await new Promise(r => setTimeout(r, 400)); // wait for renders
        const folder = zip.folder(lang);
        screensData.forEach((screen, i) => {
            const dataURL = renderScreenDataURL(screen);
            folder.file(`screen_${i + 1}_${lang}.png`, dataURLtoBytes(dataURL), { base64: true });
        });
    }
    
    await switchLanguageFn(originalLang);
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `openscreenshots_${getSafeProjectName()}_all.zip`);
}

export function exportProjectToJSON() {
    const canvas = getCanvas();
    var elements = [];
    canvas.getObjects().forEach(function(obj) {
        if (!obj.isDesignElement) return;
        var data = {
            left: obj.left, top: obj.top,
            scaleX: obj.scaleX, scaleY: obj.scaleY,
            angle: obj.angle || 0,
            originX: obj.originX || 'left',
            originY: obj.originY || 'top',
            flipX: !!obj.flipX,
            flipY: !!obj.flipY,
            opacity: obj.opacity !== undefined ? obj.opacity : 1,
            locked: !!obj.lockMovementX
        };
        if (obj.type === 'i-text') {
            data.elementType = 'text';
            data.text = obj.text;
            data.fontFamily = obj.fontFamily;
            data.fill = obj.fill;
            data.fontSize = obj.fontSize;
            data.fontWeight = obj.fontWeight;
            data.textAlign = obj.textAlign;
            data.textKey = obj.textKey || null;
            if (obj.shadow) {
                data.shadow = { color: obj.shadow.color, blur: obj.shadow.blur, offsetX: obj.shadow.offsetX, offsetY: obj.shadow.offsetY };
            }
        } else if (obj.is3DModel) {
            data.elementType = '3ddevice';
            data.modelPath = obj.modelPath;
            data.imageKey = obj.imageKey;
            data.frameColor = obj.frameColor;
            data.rotX = obj.rotX; data.rotY = obj.rotY; data.rotZ = obj.rotZ;
            data.is2DMode = obj.is2DMode;
        } else if (obj.isBackgroundImage) {
            data.elementType = 'bgimage';
            data.src = obj.getSrc();
        } else if (obj.isFreeImage) {
            data.elementType = 'freeimage';
            data.src = obj.getSrc();
        }
        elements.push(data);
    });

    var project = {
        version: 1,
        name: getProjectName(),
        timestamp: new Date().toISOString(),
        screensData: screensData.map(function(s) { return { id: s.id, color: s.color }; }),
        imageBank, textBank, languages, currentLanguage,
        globalBgColor, bgMode, gradColor1, gradColor2, gradAngle,
        elementLayouts,
        elements: elements

    };

    var blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `openscreenshots_${getSafeProjectName()}.json`);
}

function getProjectName() {
    var nameInput = document.getElementById('projectNameInput');
    return (nameInput ? nameInput.value.trim() : '') || 'Project';
}

function getSafeProjectName() {
    return getProjectName().replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importProjectFromJSON(jsonString, updateUIFn) {
    const canvas = getCanvas();
    var project;
    try { project = JSON.parse(jsonString); } catch (e) { alert('Invalid JSON file.'); return; }
    if (!project.version || !project.screensData) { alert('Invalid project file format.'); return; }

    canvas.clear();
    
    document.getElementById('projectNameInput').value = project.name || 'Project';
    setImageBank(project.imageBank || {});
    setTextBank(project.textBank || {});
    setElementLayouts(project.elementLayouts || {});
    setLanguages(project.languages || ['en']);

    setCurrentLanguage(project.currentLanguage || 'en');
    setGlobalBgColor(project.globalBgColor || '#e2e8f0');
    setBgMode(project.bgMode || 'solid');
    setGradColors(project.gradColor1 || '#6366f1', project.gradColor2 || '#ec4899');
    setGradAngle(project.gradAngle !== undefined ? project.gradAngle : 180);
    setScreensData(project.screensData.map(s => ({ id: s.id, color: s.color, obj: null })));

    if (updateUIFn) updateUIFn(project);

    renderLayout();
    applyGlobalBackground();

    const elementsToLoad = project.elements || [];
    for (const data of elementsToLoad) {
        await loadElement(data);
    }
    renderLayout();
    canvas.renderAll();
}

async function loadElement(data) {
    const canvas = getCanvas();
    return new Promise((resolve) => {
        function applyLock(obj) {
            if (data.locked) {
                obj.set({
                    lockMovementX: true, lockMovementY: true,
                    lockScalingX: true, lockScalingY: true,
                    lockRotation: true, hasControls: false
                });
            }
        }

        if (data.elementType === 'text') {
            var text = new fabric.IText(data.text || 'Text', {
                left: data.left, top: data.top, scaleX: data.scaleX, scaleY: data.scaleY,
                angle: data.angle, originX: data.originX || 'left', originY: data.originY || 'top',
                flipX: !!data.flipX, flipY: !!data.flipY, fontFamily: data.fontFamily || 'system-ui',
                fill: data.fill || '#ffffff', fontSize: data.fontSize || 42, fontWeight: data.fontWeight || '700',
                textAlign: data.textAlign || 'center',
                shadow: data.shadow ? new fabric.Shadow(data.shadow) : null,
                isDesignElement: true, textKey: data.textKey || null,
                clipPath: globalClipPath, borderColor: '#6366f1', cornerColor: '#6366f1',
                cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
            });
            text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
            applyLock(text);
            canvas.add(text);
            resolve();
        } else if (data.elementType === '3ddevice') {
            loadLocal3DModel(data.modelPath, async function() {
                phoneModel.rotation.set((data.rotX || 0) * Math.PI, (data.rotY || 0) * Math.PI, (data.rotZ || 0) * Math.PI);
                phoneBodyMeshes.forEach(m => { if (m.material && m.material.color) m.material.color.set(data.frameColor || '#1e293b'); });
                await applyTextureToScreen(data.imageKey ? getImageForKey(data.imageKey) : null);
                var dataURL = render3DToImage();
                if (dataURL) {
                    fabric.Image.fromURL(dataURL, function(img) {
                        img.set({
                            left: data.left, top: data.top, scaleX: data.scaleX, scaleY: data.scaleY,
                            angle: data.angle, originX: data.originX || 'left', originY: data.originY || 'top',
                            flipX: !!data.flipX, flipY: !!data.flipY,
                            isDesignElement: true, is3DModel: true, modelPath: data.modelPath,
                            imageKey: data.imageKey, frameColor: data.frameColor || '#1e293b',
                            is2DMode: data.is2DMode || false, rotX: data.rotX || 0, rotY: data.rotY || 0, rotZ: data.rotZ || 0,
                            clipPath: globalClipPath, borderColor: '#6366f1', cornerColor: '#6366f1',
                            cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
                        });
                        img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
                        applyLock(img);
                        canvas.add(img);
                        resolve();
                    });
                } else resolve();
            });
        } else if (data.elementType === 'bgimage' || data.elementType === 'freeimage') {
            fabric.Image.fromURL(data.src, function(img) {
                img.set({
                    left: data.left, top: data.top, scaleX: data.scaleX, scaleY: data.scaleY,
                    angle: data.angle, originX: data.originX || 'left', originY: data.originY || 'top',
                    flipX: !!data.flipX, flipY: !!data.flipY,
                    isDesignElement: true, isBackgroundImage: data.elementType === 'bgimage',
                    isFreeImage: data.elementType === 'freeimage',
                    clipPath: globalClipPath, borderColor: '#6366f1', cornerColor: '#6366f1',
                    cornerStyle: 'circle', cornerSize: 10, transparentCorners: false, padding: 4
                });
                applyLock(img);
                canvas.add(img);
                if (data.elementType === 'bgimage') {
                    document.getElementById('clearBgImageBtn').classList.remove('hidden');
                }
                resolve();
            });
        } else resolve();
    });
}
