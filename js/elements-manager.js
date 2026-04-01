import { 
    getTextForKey, getImageForKey, globalClipPath, 
    canvasZoom, currentLanguage 
} from './state.js';
import { getCanvas, renderLayout } from './canvas-core.js';
import { updateThreeDevice, applyTextureToScreen, render3DToImage, phoneModel } from './three-engine.js';

export function addTextElement(selectedKey = '') {
    const canvas = getCanvas();
    var initialText = selectedKey ? (getTextForKey(selectedKey) || selectedKey.toUpperCase()) : 'Your Text Here';

    const text = new fabric.IText(initialText, {
        left: canvas.width / 2 - 100, top: 200,
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        fill: '#ffffff',
        fontSize: 42, fontWeight: '700', textAlign: 'center',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.25)', blur: 8, offsetY: 3 }),
        isDesignElement: true,
        textKey: selectedKey || null,
        borderColor: '#6366f1',
        cornerColor: '#6366f1',
        cornerStyle: 'circle',
        cornerSize: 10,
        transparentCorners: false
    });
    text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    text.set({ clipPath: globalClipPath });
    canvas.add(text); 
    canvas.setActiveObject(text); 
    renderLayout();
}

export function addAwardBadge() {
    const canvas = getCanvas();
    fabric.loadSVGFromURL('img/laurel-detailed-left.svg', function(objects, options) {
        if (!objects || objects.length === 0) return;
        
        var leftLaurel = fabric.util.groupSVGElements(objects, options);
        var baseColor = '#ffffff';
        
        leftLaurel.set({
            isDesignElement: true, isLaurel: true, originX: 'center', originY: 'center',
            scaleX: 0.25, scaleY: 0.25, clipPath: globalClipPath
        });

        if(leftLaurel.getObjects) {
            leftLaurel.getObjects().forEach(obj => {
                if(obj.fill) obj.set('fill', baseColor);
                if(obj.stroke) obj.set('stroke', '');
            });
        }
        
        leftLaurel.clone(function(rightLaurel) {
            rightLaurel.set({
                flipX: true, isDesignElement: true, isLaurel: true, originX: 'center', originY: 'center',
                scaleX: 0.25, scaleY: 0.25, clipPath: globalClipPath
            });

            var text = new fabric.IText("Selección\\nEditorial", {
                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
                fill: baseColor, fontSize: 32, fontWeight: '700', textAlign: 'center',
                originX: 'center', originY: 'center', isDesignElement: true, clipPath: globalClipPath
            });

            var centerX = canvas.width / 2;
            var centerY = 300;
            
            canvas.add(leftLaurel, text, rightLaurel);

            var textWidth = text.getScaledWidth();
            var spacing = 50;
            
            text.set({ left: centerX, top: centerY });
            leftLaurel.set({ left: centerX - textWidth/2 - spacing, top: centerY });
            rightLaurel.set({ left: centerX + textWidth/2 + spacing, top: centerY });

            var sel = new fabric.ActiveSelection([leftLaurel, text, rightLaurel], { canvas: canvas });
            canvas.setActiveObject(sel);
            renderLayout();
        });
    });
}

export function createShape(type) {
    const canvas = getCanvas();
    let shape;
    const common = {
        left: canvas.width / 2 - 50, top: 250,
        fill: '#6366f1', stroke: '#4f46e5', strokeWidth: 0,
        isDesignElement: true, isShape: true, shapeType: type,
        clipPath: globalClipPath,
        borderColor: '#6366f1', cornerColor: '#6366f1', cornerStyle: 'circle', cornerSize: 10,
        transparentCorners: false
    };

    if (type === 'rect') {
        shape = new fabric.Rect({ ...common, width: 100, height: 100, rx: 8, ry: 8 });
    } else if (type === 'circle') {
        shape = new fabric.Circle({ ...common, radius: 50 });
    } else if (type === 'line') {
        shape = new fabric.Rect({ ...common, width: 200, height: 4 });
    } else if (type === 'arrow') {
        shape = new fabric.Path('M 0 0 L 20 0 L 10 -10 M 20 0 L 10 10', {
            ...common, fill: 'transparent', strokeWidth: 4, stroke: '#6366f1'
        });
    }

    if (shape) {
        canvas.add(shape); 
        canvas.setActiveObject(shape); 
        renderLayout();
    }
}

export async function syncAndRenderActiveDevice(targetObj) {
    const canvas = getCanvas();
    const obj = targetObj || canvas.getActiveObject();
    if (!obj || !obj.is3DModel || !phoneModel) return;

    updateThreeDevice(obj.rotX, obj.rotY, obj.rotZ, obj.frameColor, obj.is2DMode);
    await applyTextureToScreen(obj.imageKey ? getImageForKey(obj.imageKey) : null);

    const newDataURL = render3DToImage();
    if (newDataURL) {
        obj.setSrc(newDataURL, () => canvas.renderAll());
    }
}

export async function add3DDeviceElement(modelPath, selectedKey) {
    const canvas = getCanvas();
    const texUrl = selectedKey ? getImageForKey(selectedKey) : null;

    updateThreeDevice(0, -0.3, 0, '#1e293b', false);
    await applyTextureToScreen(texUrl);

    const dataURL = render3DToImage();
    if (!dataURL) return;

    fabric.Image.fromURL(dataURL, (img) => {
        img.set({
            left: canvas.width / 2 - 200, top: 100, scaleX: 0.5, scaleY: 0.5,
            isDesignElement: true, is3DModel: true,
            modelPath: modelPath,
            imageKey: selectedKey,
            frameColor: '#1e293b',
            is2DMode: false,
            rotX: 0, rotY: -0.3, rotZ: 0
        });
        img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
        img.set({ clipPath: globalClipPath });
        canvas.add(img); 
        canvas.setActiveObject(img); 
        renderLayout();
    });
}
