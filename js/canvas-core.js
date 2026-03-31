/* global fabric */
/**
 * Fabric.js canvas initialization and core layout rendering.
 */
import { 
    screensData, SCREEN_W, SCREEN_H, GAP, START_Y, canvasZoom,
    globalClipPath, setGlobalClipPath, globalBgColor, bgImageObject, setBgImageObject,
    bgMode, gradColor1, gradColor2, gradAngle, setScreenDimensions, setCurrentPreset
} from './state.js';

let canvas = null;

export function initCanvas() {
    const workspaceContainer = document.getElementById('workspaceContainer');
    canvas = new fabric.Canvas('mainCanvas', {
        width: workspaceContainer.clientWidth, 
        height: workspaceContainer.clientHeight,
        preserveObjectStacking: true
    });
    return canvas;
}

export function getCanvas() { return canvas; }

export function updateCanvasSize() {
    if (!canvas) return;
    const n = screensData.length || 1;
    const logicalW = n * SCREEN_W + (n - 1) * GAP + 100;
    const logicalH = SCREEN_H + START_Y + 120;
    
    canvas.setWidth(logicalW);
    canvas.setHeight(logicalH);
    
    canvas.setDimensions({ 
        width: (logicalW * canvasZoom) + 'px', 
        height: (logicalH * canvasZoom) + 'px' 
    }, { cssOnly: true });
}

export function renderLayout() {
    if (!canvas) return;
    updateCanvasSize();
    const startX = Math.max(50, (canvas.width - (screensData.length * SCREEN_W + (screensData.length - 1) * GAP)) / 2);
    
    screensData.forEach((screen, index) => {
        const leftPos = startX + index * (SCREEN_W + GAP);
        const isTransparent = screen.color === 'transparent';
        if (!screen.obj) {
            screen.obj = new fabric.Rect({
                left: leftPos, top: START_Y,
                width: SCREEN_W, height: SCREEN_H, fill: screen.color, rx: 16, ry: 16,
                stroke: isTransparent ? '#94a3b8' : 'rgba(0,0,0,0.06)',
                strokeWidth: isTransparent ? 1.5 : 1,
                strokeDashArray: isTransparent ? [6, 4] : null,
                hasControls: false, lockMovementX: true, lockMovementY: true, hoverCursor: 'pointer',
                shadow: isTransparent ? null : new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 20, offsetY: 10 }),
                isScreen: true, screenId: screen.id
            });
            canvas.add(screen.obj); canvas.sendToBack(screen.obj);
        } else {
            screen.obj.set({
                left: leftPos, top: START_Y, fill: screen.color,
                stroke: isTransparent ? '#94a3b8' : 'rgba(0,0,0,0.06)',
                strokeWidth: isTransparent ? 1.5 : 1,
                strokeDashArray: isTransparent ? [6, 4] : null,
                shadow: isTransparent ? null : new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 20, offsetY: 10 })
            });
        }
    });

    const clipRects = screensData.map((s, i) => new fabric.Rect({ 
        left: startX + i * (SCREEN_W + GAP), 
        top: START_Y, 
        width: SCREEN_W, 
        height: SCREEN_H, 
        rx: 16, ry: 16, 
        absolutePositioned: true 
    }));
    
    const newClipPath = new fabric.Group(clipRects, { absolutePositioned: true });
    setGlobalClipPath(newClipPath);
    
    canvas.getObjects().forEach(obj => { 
        if (obj.isDesignElement) obj.set({ clipPath: newClipPath }); 
    });
    
    reorderBgImage();
    canvas.renderAll();
}

export function reorderBgImage() {
    if (!bgImageObject || !canvas) return;
    var screenIndices = [];
    canvas.getObjects().forEach(function(obj, i) {
        if (obj.isScreen) screenIndices.push(i);
    });
    if (screenIndices.length > 0) {
        var maxScreenIdx = Math.max(...screenIndices);
        canvas.moveTo(bgImageObject, maxScreenIdx + 1);
    }
}

export function applyScreenPreset(presetKey, SCREEN_PRESETS) {
    setCurrentPreset(presetKey);
    var p = SCREEN_PRESETS[presetKey];
    var ratio = p.w / p.h;
    const h = 740;
    const w = Math.round(h * ratio);
    setScreenDimensions(w, h);
    
    screensData.forEach(function(s) {
        if (s.obj) { canvas.remove(s.obj); s.obj = null; }
    });
    renderLayout();
    applyGlobalBackground();
}

export function applyGlobalBackground() {
    if (!canvas) return;
    if (bgMode === 'gradient') {
        var dataURL = createGradientDataURL(canvas.width || 1920, canvas.height || 1080, gradColor1, gradColor2, gradAngle);
        fabric.Image.fromURL(dataURL, function(img) {
            canvas.setBackgroundImage(img, function() {
                canvas.renderAll();
            }, {
                scaleX: canvas.width / img.width,
                scaleY: canvas.height / img.height,
                originX: 'left', originY: 'top'
            });
        });
    } else {
        canvas.setBackgroundImage(null, function() {
            canvas.setBackgroundColor(globalBgColor, function() {
                canvas.renderAll();
            });
        });
    }
}

function createGradientDataURL(w, h, c1, c2, angle) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var rad = angle * Math.PI / 180;
    var x1 = w/2 - Math.cos(rad) * w;
    var y1 = h/2 - Math.sin(rad) * h;
    var x2 = w/2 + Math.cos(rad) * w;
    var y2 = h/2 + Math.sin(rad) * h;
    var grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return c.toDataURL();
}

export function addBgImageFromData(dataUrl) {
    if (!canvas) return;
    if (bgImageObject) {
        canvas.remove(bgImageObject);
        setBgImageObject(null);
    }
    fabric.Image.fromURL(dataUrl, function(img) {
        var scale = Math.max(SCREEN_H / img.height, SCREEN_W / img.width) * 1.2;
        img.set({
            scaleX: scale, scaleY: scale,
            left: canvas.width / 2,
            top: START_Y + SCREEN_H / 2,
            originX: 'center', originY: 'center',
            isDesignElement: true, isBackgroundImage: true,
            clipPath: globalClipPath,
            borderColor: '#6366f1', cornerColor: '#6366f1', cornerStyle: 'circle', cornerSize: 10,
            transparentCorners: false, padding: 4
        });
        setBgImageObject(img);
        canvas.add(img);
        reorderBgImage();
        canvas.renderAll();
        document.getElementById('clearBgImageBtn').classList.remove('hidden');
    });
}
