/* global fabric */
import { 
    screensData, bgImageObject, setBgImageObject, 
    SCREEN_W, SCREEN_H, GAP, START_Y, setGlobalClipPath
} from './state.js';
import { getCanvas } from './canvas-core.js';

const CUSTOM_PROPS = [
    'isScreen', 'screenId', 'isDesignElement', 'is3DModel', 'isFreeImage',
    'isBackgroundImage', 'isShape', 'shapeType', 'isLaurel', 'textKey', 'imageKey', 'modelPath', 'frameColor',
    'rotX', 'rotY', 'rotZ', 'is2DMode', 'lockMovementX', 'lockMovementY',
    'lockScalingX', 'lockScalingY', 'lockRotation'
];

let historyStack = [];
let historyIndex = -1;
export let isRestoringHistory = false;
const MAX_HISTORY = 40;

export function saveHistory() {
    const canvas = getCanvas();
    if (!canvas || isRestoringHistory) return;
    
    // Truncate forward history
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(canvas.toJSON(CUSTOM_PROPS));
    historyIndex = historyStack.length - 1;
    
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
        historyIndex--;
    }
}

export function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreFromHistory(historyStack[historyIndex]);
}

export function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    restoreFromHistory(historyStack[historyIndex]);
}

function restoreFromHistory(state) {
    const canvas = getCanvas();
    isRestoringHistory = true;
    canvas.loadFromJSON(state, function() {
        // Re-link screensData objects
        screensData.forEach(function(sd) { sd.obj = null; });
        setBgImageObject(null);
        
        canvas.getObjects().forEach(function(obj) {
            if (obj.isScreen) {
                var sd = screensData.find(function(s) { return s.id === obj.screenId; });
                if (sd) sd.obj = obj;
            }
            if (obj.isBackgroundImage) setBgImageObject(obj);
        });
        
        // Rebuild clip path
        var startX = Math.max(50, (canvas.width - (screensData.length * SCREEN_W + (screensData.length - 1) * GAP)) / 2);
        var clipRects = screensData.map(function(s, i) {
            return new fabric.Rect({ 
                left: startX + i * (SCREEN_W + GAP), 
                top: START_Y, 
                width: SCREEN_W, 
                height: SCREEN_H, 
                rx: 16, ry: 16, 
                absolutePositioned: true 
            });
        });
        
        const newClipPath = new fabric.Group(clipRects, { absolutePositioned: true });
        setGlobalClipPath(newClipPath);
        
        canvas.getObjects().forEach(function(obj) {
            if (obj.isDesignElement) obj.set({ clipPath: newClipPath });
        });
        
        canvas.renderAll();
        isRestoringHistory = false;
    });
}

export function initHistoryEvents() {
    const canvas = getCanvas();
    canvas.on('object:modified', saveHistory);
    canvas.on('object:added', function() { if (!isRestoringHistory) saveHistory(); });
    canvas.on('object:removed', function() { if (!isRestoringHistory) saveHistory(); });
}
