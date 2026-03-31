/* global fabric */
import { 
    screensData, bgMode, setBgMode, globalBgColor, setGlobalBgColor,
    gradColor1, setGradColors, gradColor2, gradAngle, setGradAngle,
    currentPreset, setCurrentPreset, SCREEN_PRESETS, SCREEN_W, SCREEN_H,
    languages, setCurrentLanguage, currentLanguage
} from './state.js';
import { 
    getCanvas, renderLayout, applyGlobalBackground, applyScreenPreset 
} from './canvas-core.js';
import { renderLayerPanel, renderImageBankUI, renderTextBankUI, updateKeySelects, updateTextKeySelects, refreshAllTexts } from './ui-utils.js';
import { loadTemplateList, applyTemplateFromFile } from './templates.js';
import { exportProjectToJSON } from './transfer-service.js';

export function initDesignAPI() {
    window.DesignAPI = {
        // ---- BACKGROUND ----
        setBackground: function(opts) {
            if (opts.type === 'gradient') {
                setBgMode('gradient');
                setGradColors(opts.color1 || gradColor1, opts.color2 || gradColor2);
                setGradAngle(opts.angle !== undefined ? opts.angle : gradAngle);
                document.getElementById('bgModeGradient')?.click();
            } else {
                setBgMode('solid');
                setGlobalBgColor(opts.color || globalBgColor);
                document.getElementById('bgModeSolid')?.click();
            }
            applyGlobalBackground();
            return { success: true, bgMode: bgMode };
        },

        // ---- TEXT ----
        addText: function(opts) {
            const canvas = getCanvas();
            var t = new fabric.IText(opts.text || 'Text', {
                left: opts.x || canvas.width / 2 - 100,
                top: opts.y || 200,
                fontSize: opts.fontSize || 42,
                fontFamily: opts.fontFamily || '"Inter", sans-serif',
                fontWeight: opts.fontWeight || '600',
                fill: opts.fill || '#ffffff',
                textAlign: opts.textAlign || 'left',
                opacity: opts.opacity !== undefined ? opts.opacity : 1,
                isDesignElement: true,
                clipPath: canvas.clipPath,
                borderColor: '#6366f1', cornerColor: '#6366f1',
                cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
            });
            canvas.add(t);
            canvas.setActiveObject(t);
            renderLayerPanel();
            canvas.renderAll();
            return { success: true, id: t.__uid || canvas.getObjects().indexOf(t) };
        },

        // ---- SHAPES ----
        addShape: function(opts) {
            const canvas = getCanvas();
            var type = opts.type || 'rect';
            var props = {
                left: opts.x || canvas.width / 2 - 60,
                top: opts.y || 200,
                fill: opts.fill || '#6366f1',
                opacity: opts.opacity !== undefined ? opts.opacity : 1,
                isDesignElement: true, isShape: true, shapeType: type,
                clipPath: canvas.clipPath,
                borderColor: '#6366f1', cornerColor: '#6366f1',
                cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
            };
            var obj;
            if (type === 'rect') obj = new fabric.Rect({ ...props, width: opts.width || 120, height: opts.height || 90, rx: opts.rx || 0, ry: opts.ry || 0 });
            else if (type === 'circle') obj = new fabric.Circle({ ...props, radius: opts.radius || 50 });
            
            if (obj) {
                canvas.add(obj);
                canvas.setActiveObject(obj);
                renderLayerPanel();
                canvas.renderAll();
            }
            return { success: !!obj };
        },

        // ---- SCREENS ----
        addScreen: function(color) {
            screensData.push({ id: 'screen_' + Date.now(), color: color || '#ffffff', obj: null });
            renderLayout();
            return { success: true, screenCount: screensData.length };
        },

        setScreenPreset: function(preset) {
            if (!SCREEN_PRESETS[preset]) return { success: false, error: 'Invalid preset' };
            applyScreenPreset(preset, SCREEN_PRESETS);
            return { success: true, preset: preset };
        },

        // ---- TEMPLATES ----
        applyTemplate: async function(name) {
            const list = await loadTemplateList();
            const tmpl = list.find(t => t.name.toLowerCase() === name.toLowerCase());
            if (!tmpl) return { success: false, error: 'Template not found' };
            await applyTemplateFromFile(tmpl.href);
            return { success: true, template: tmpl.name };
        },

        // ---- ELEMENTS ----
        clearElements: function() {
            const canvas = getCanvas();
            canvas.getObjects().filter(o => o.isDesignElement).forEach(o => canvas.remove(o));
            renderLayerPanel();
            canvas.renderAll();
            return { success: true };
        },

        getElements: function() {
            const canvas = getCanvas();
            return canvas.getObjects().filter(o => o.isDesignElement).map((o, i) => ({
                index: i, type: o.type, x: Math.round(o.left), y: Math.round(o.top),
                text: o.text || null, fill: o.fill, opacity: o.opacity,
                locked: !!o.lockMovementX, isShape: !!o.isShape, is3DModel: !!o.is3DModel
            }));
        },

        // ---- PROJECT ----
        getState: function() {
            const canvas = getCanvas();
            return {
                screenCount: screensData.length,
                bgMode: bgMode,
                bgColor: globalBgColor,
                currentPreset: currentPreset,
                languages: languages,
                currentLanguage: currentLanguage,
                canvasSize: { width: canvas.width, height: canvas.height }
            };
        },

        exportProject: function() {
            exportProjectToJSON();
            return { success: true };
        }
    };
}
