import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEVICE_CONFIG } from './state.js';

const loader = new GLTFLoader();
const threeCanvas = document.createElement('canvas');
threeCanvas.width = 1200;
threeCanvas.height = 1200;

const renderer = new THREE.WebGLRenderer({ 
    canvas: threeCanvas, 
    alpha: true, 
    antialias: true, 
    preserveDrawingBuffer: true 
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.z = 6;

// Iluminación de estudio
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0xffffff, 1.5);
spotLight.position.set(5, 10, 7.5);
scene.add(spotLight);
const blueLight = new THREE.PointLight(0x4f46e5, 0.8);
blueLight.position.set(-5, -5, 5);
scene.add(blueLight);

export let phoneModel = null;
export let phoneScreenMesh = null;
export let customScreenPlane = null;
export let phoneBodyMeshes = [];
export let currentModelPath = null;

export function getThreeCanvas() { return threeCanvas; }
export function getThreeRenderer() { return renderer; }

export function loadLocal3DModel(modelPath, callback = null) {
    if (phoneModel) {
        scene.remove(phoneModel);
        phoneModel = null;
    }
    phoneScreenMesh = null;
    phoneBodyMeshes = [];

    loader.load(modelPath, (gltf) => {
        phoneModel = gltf.scene;
        currentModelPath = modelPath;

        const box = new THREE.Box3().setFromObject(phoneModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        phoneModel.position.sub(center);

        const config = DEVICE_CONFIG[modelPath];
        const targetScale = config ? config.scale : 4.0;
        const scaleFactor = targetScale / size.y;
        phoneModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

        scene.add(phoneModel);

        const targetScreenName = config ? config.screenName.toLowerCase() : "screen";

        phoneModel.traverse((child) => {
            if (child.isMesh) {
                const meshName = child.name.toLowerCase();
                const matName = child.material && child.material.name ? child.material.name.toLowerCase() : "";

                if ((meshName === targetScreenName || meshName.includes("screen") || meshName.includes("display") || matName.includes("screen")) && !phoneScreenMesh) {
                    phoneScreenMesh = child;
                    child.visible = false;
                } else {
                    if (child.material) {
                        child.material = child.material.clone();
                        if (matName.includes("glass") || meshName.includes("glass") || matName.includes("vidrio")) {
                            child.visible = false;
                        } else {
                            const noPintar = ["lens", "black", "gray", "front", "camera", "speaker", "button"];
                            let debePintarse = true;
                            for (let palabra of noPintar) {
                                if (matName.includes(palabra) || meshName.includes(palabra)) {
                                    debePintarse = false;
                                }
                            }
                            if (debePintarse) {
                                phoneBodyMeshes.push(child);
                            }
                            
                            child.material.transparent = false;
                            child.material.depthWrite = true;
                            child.material.depthTest = true;
                            child.material.needsUpdate = true;
                        }
                    }
                }
            }
        });

        createScreenOverlay();
        renderer.render(scene, camera);
        if (callback) callback();
    }, undefined, (error) => {
        console.error("Error loading model:", error);
    });
}

function createScreenOverlay() {
    if (!phoneScreenMesh || !phoneModel) return;

    if (customScreenPlane) {
        if (customScreenPlane.parent) customScreenPlane.parent.remove(customScreenPlane);
        customScreenPlane.geometry.dispose();
        customScreenPlane.material.dispose();
        customScreenPlane = null;
    }

    phoneModel.updateMatrixWorld(true);
    const worldBB = new THREE.Box3().setFromObject(phoneScreenMesh);
    const invMatrix = new THREE.Matrix4().copy(phoneModel.matrixWorld).invert();
    worldBB.applyMatrix4(invMatrix);

    const bbSize = worldBB.getSize(new THREE.Vector3());
    const bbCenter = worldBB.getCenter(new THREE.Vector3());

    let planeW, planeH;
    const minDim = Math.min(bbSize.x, bbSize.y, bbSize.z);

    if (minDim === bbSize.x) {
        planeW = bbSize.z;
        planeH = bbSize.y;
    } else if (minDim === bbSize.y) {
        planeW = bbSize.x;
        planeH = bbSize.z;
    } else {
        planeW = bbSize.x;
        planeH = bbSize.y;
    }

    const config = DEVICE_CONFIG[currentModelPath];
    const radiusFactor = config ? config.cornerRadiusFactor : 0.16;
    const cornerR = planeW * radiusFactor;

    const hw = planeW / 2, hh = planeH / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hw + cornerR, -hh);
    shape.lineTo(hw - cornerR, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + cornerR);
    shape.lineTo(hw, hh - cornerR);
    shape.quadraticCurveTo(hw, hh, hw - cornerR, hh);
    shape.lineTo(-hw + cornerR, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - cornerR);
    shape.lineTo(-hw, -hh + cornerR);
    shape.quadraticCurveTo(-hw, -hh, -hw + cornerR, -hh);

    const geometry = new THREE.ShapeGeometry(shape);
    const uvAttr = geometry.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
        const rawX = geometry.attributes.position.getX(i);
        const rawY = geometry.attributes.position.getY(i);
        uvAttr.setXY(i, (rawX + hw) / planeW, (rawY + hh) / planeH);
    }
    uvAttr.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
        color: 0x111111,
        side: THREE.FrontSide
    });

    customScreenPlane = new THREE.Mesh(geometry, material);
    customScreenPlane.position.copy(bbCenter);

    if (minDim === bbSize.x) {
        customScreenPlane.rotation.y = bbCenter.x > 0 ? Math.PI / 2 : -Math.PI / 2;
        customScreenPlane.position.x += bbCenter.x > 0 ? 0.01 : -0.01;
    } else if (minDim === bbSize.y) {
        customScreenPlane.rotation.x = bbCenter.y > 0 ? -Math.PI / 2 : Math.PI / 2;
        customScreenPlane.position.y += bbCenter.y > 0 ? 0.01 : -0.01;
    } else {
        customScreenPlane.rotation.y = bbCenter.z > 0 ? 0 : Math.PI;
        customScreenPlane.position.z += bbCenter.z > 0 ? 0.01 : -0.01;
    }

    phoneModel.add(customScreenPlane);
}

export async function applyTextureToScreen(textureUrl) {
    if (!customScreenPlane) return;
    if (!textureUrl) {
        customScreenPlane.material = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.FrontSide });
        return;
    }
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = textureUrl;
        });

        const config = DEVICE_CONFIG[currentModelPath];
        const radiusFactor = config ? config.cornerRadiusFactor : 0.16;
        const cornerRadius = Math.round(img.naturalWidth * radiusFactor);
        
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height, r = cornerRadius;

        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0);

        const tex = new THREE.Texture(c);
        tex.flipY = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        customScreenPlane.material.dispose();
        customScreenPlane.material = new THREE.MeshBasicMaterial({
            map: tex, color: 0xffffff, transparent: true, side: THREE.FrontSide
        });
    } catch (error) {
        console.error("Texture error:", error);
    }
}

export function render3DToImage() {
    if (phoneModel) {
        renderer.render(scene, camera);
        renderer.render(scene, camera);
        return threeCanvas.toDataURL('image/png');
    }
    return null;
}

export function updateThreeDevice(rotX, rotY, rotZ, frameColor, is2DMode) {
    if (!phoneModel) return;
    
    if (is2DMode) {
        phoneModel.rotation.set(0, 0, 0);
    } else {
        phoneModel.rotation.set(rotX * Math.PI, rotY * Math.PI, rotZ * Math.PI);
    }

    phoneBodyMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.color) {
            mesh.material.color.set(frameColor);
        }
    });
}
