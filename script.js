import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ==========================================
// 1. MOTOR 3D (Three.js) - Estilo Profesional
// ==========================================
const loader = new GLTFLoader();
const threeCanvas = document.createElement('canvas');
threeCanvas.width = 1200;
threeCanvas.height = 1200;
const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
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

let phoneModel = null;
let phoneScreenMesh = null;
let customScreenPlane = null; // PlaneGeometry overlay — la textura va aquí, no en el mesh original
let phoneBodyMeshes = [];
let currentModelPath = null;

// 👉 DICCIONARIO DE CONFIGURACIÓN
const DEVICE_CONFIG = {
    './models/iphone-15-pro-max.glb': {
        screenName: 'object_9',
        scale: 4.0,
        cornerRadiusFactor: 0.16  // 16% del ancho de la imagen
    },
    './models/samsung-galaxy-s25-ultra.glb': {
        screenName: 'screen',
        scale: 4.0,
        cornerRadiusFactor: 0.04
    }
};

// ==========================================
// IMAGE BANK: Sistema de imágenes localizadas
// ==========================================
let imageBank = {};        // { "key_name": { "en": "data:...", "es": "data:..." } }
let textBank = {};         // { "key_name": { "en": "Hello", "es": "Hola" } }
let currentLanguage = 'en';
let languages = ['en'];

function getImageForKey(key) {
    if (!key || !imageBank[key]) return null;
    return imageBank[key][currentLanguage] || imageBank[key][Object.keys(imageBank[key])[0]] || null;
}

function addImageBankKey(name) {
    if (!name) {
        // Start inline editing - add temp row
        var tempKey = '__new_' + Date.now();
        imageBank[tempKey] = {};
        renderImageBankUI(tempKey);
        updateKeySelects();
        return true;
    }
    name = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!name || (imageBank[name] !== undefined && !name.startsWith('__new_'))) {
        alert('La key "' + name + '" ya existe o es inválida.');
        return false;
    }
    if (!imageBank[name]) imageBank[name] = {};
    renderImageBankUI();
    updateKeySelects();
    return true;
}

function removeImageBankKey(name) {
    delete imageBank[name];
    if (typeof canvas !== 'undefined') {
        canvas.getObjects().forEach(function(obj) {
            if (obj.imageKey === name) obj.imageKey = null;
        });
    }
    renderImageBankUI();
    updateKeySelects();
}

function setImageForKey(key, lang, file) {
    return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function(e) {
            if (!imageBank[key]) imageBank[key] = {};
            imageBank[key][lang] = e.target.result;
            renderImageBankUI();
            resolve();
        };
        reader.readAsDataURL(file);
    });
}

function addLanguage(code) {
    code = code.trim().toLowerCase();
    if (!code || languages.includes(code)) {
        alert('Language "' + code + '" already exists.');
        return false;
    }
    languages.push(code);
    renderLanguageSelector();
    renderImageBankUI();
    return true;
}

function removeCurrentLanguage() {
    if (languages.length <= 1) { alert("Can't remove the last language."); return; }
    var code = currentLanguage;
    languages = languages.filter(function(l) { return l !== code; });
    Object.keys(imageBank).forEach(function(key) { delete imageBank[key][code]; });
    currentLanguage = languages[0];
    renderLanguageSelector();
    renderImageBankUI();
    refreshAllDevices();
}

// Catálogo de idiomas con banderas
var ALL_LANGUAGES = [
    { code: 'en', flag: '🇺🇸', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
    { code: 'pt', flag: '🇵🇹', name: 'Português' },
    { code: 'pt-BR', flag: '🇧🇷', name: 'Português (BR)' },
    { code: 'ja', flag: '🇯🇵', name: '日本語' },
    { code: 'ko', flag: '🇰🇷', name: '한국어' },
    { code: 'zh-Hans', flag: '🇨🇳', name: '简体中文' },
    { code: 'zh-Hant', flag: '🇹🇼', name: '繁體中文' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
    { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
    { code: 'da', flag: '🇩🇰', name: 'Dansk' },
    { code: 'fi', flag: '🇫🇮', name: 'Suomi' },
    { code: 'no', flag: '🇳🇴', name: 'Norsk' },
    { code: 'pl', flag: '🇵🇱', name: 'Polski' },
    { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
    { code: 'th', flag: '🇹🇭', name: 'ไทย' },
    { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
    { code: 'id', flag: '🇮🇩', name: 'Indonesia' },
    { code: 'ms', flag: '🇲🇾', name: 'Melayu' },
    { code: 'ar', flag: '🇸🇦', name: 'العربية' },
    { code: 'he', flag: '🇮🇱', name: 'עברית' },
    { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
    { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
    { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
    { code: 'hu', flag: '🇭🇺', name: 'Magyar' },
    { code: 'ro', flag: '🇷🇴', name: 'Română' },
    { code: 'uk', flag: '🇺🇦', name: 'Українська' },
    { code: 'sk', flag: '🇸🇰', name: 'Slovenčina' },
    { code: 'ca', flag: '🇹🇩', name: 'Català' },
];

function getLangInfo(code) {
    return ALL_LANGUAGES.find(function(l) { return l.code === code; }) || { code: code, flag: '🏳️', name: code.toUpperCase() };
}

function renderLanguageSelector() {
    var select = document.getElementById('languageSelect');
    if (!select) return;
    select.innerHTML = languages.map(function(l) {
        var info = getLangInfo(l);
        return '<option value="' + l + '"' + (l === currentLanguage ? ' selected' : '') + '>' + info.flag + ' ' + l.toUpperCase() + '</option>';
    }).join('');
}

function renderImageBankUI(editingKey) {
    var container = document.getElementById('imageBankTableContainer');
    if (!container) return;
    var keys = Object.keys(imageBank);
    if (keys.length === 0) {
        container.innerHTML = '<div class="p-10 text-center"><p class="text-sm text-slate-400 italic">No keys yet. Add one to get started.</p></div>';
        return;
    }

    var headerCells = '<th class="pl-3">Key</th>' +
        languages.map(function(lang) {
            var info = getLangInfo(lang);
            return '<th>' + info.flag + '<br>' + lang.toUpperCase() + '</th>';
        }).join('') +
        '<th></th>';

    var rows = keys.map(function(key) {
        var isEditing = (key === editingKey);
        var keyCell;
        if (isEditing) {
            keyCell = '<td class="pl-3"><input type="text" class="text-xs font-mono font-bold text-slate-700 border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" id="inlineKeyInput" placeholder="key_name" autofocus></td>';
        } else {
            keyCell = '<td class="pl-3"><span class="text-xs font-mono font-bold text-slate-700">' + key + '</span></td>';
        }
        var cells = keyCell +
            languages.map(function(lang) {
                var src = imageBank[key][lang];
                return '<td>' +
                    '<label class="bank-thumb border ' + (src ? 'border-indigo-300 bg-indigo-50' : 'border-dashed border-slate-300 bg-slate-50') + '">' +
                    (src ? '<img src="' + src + '">' : '<span class="text-slate-400 text-lg">+</span>') +
                    '<input type="file" accept="image/*" class="hidden" data-bank-key="' + key + '" data-bank-lang="' + lang + '">' +
                    '</label></td>';
            }).join('') +
            '<td><button class="text-red-400 hover:text-red-600 text-sm font-bold px-1" data-delete-key="' + key + '" title="Delete">×</button></td>';
        return '<tr>' + cells + '</tr>';
    }).join('');

    container.innerHTML = '<table class="bank-table"><thead><tr>' + headerCells + '</tr></thead><tbody>' + rows + '</tbody></table>';

    // Handle inline key editing
    var inlineInput = document.getElementById('inlineKeyInput');
    if (inlineInput && editingKey) {
        inlineInput.focus();
        function confirmKey() {
            var newName = inlineInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            // Remove temp key
            var data = imageBank[editingKey];
            delete imageBank[editingKey];
            if (newName && imageBank[newName] === undefined) {
                imageBank[newName] = data || {};
            }
            renderImageBankUI();
            updateKeySelects();
        }
        inlineInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); confirmKey(); }
            if (e.key === 'Escape') {
                delete imageBank[editingKey];
                renderImageBankUI();
                updateKeySelects();
            }
        });
        inlineInput.addEventListener('blur', function() {
            confirmKey();
        });
    }

    // Attach events for uploads and deletes
    container.querySelectorAll('input[data-bank-key]').forEach(function(input) {
        input.addEventListener('change', function() {
            var file = this.files[0];
            if (!file) return;
            var bankKey = this.dataset.bankKey;
            var bankLang = this.dataset.bankLang;
            setImageForKey(bankKey, bankLang, file).then(function() {
                if (typeof canvas !== 'undefined') {
                    var active = canvas.getActiveObject();
                    if (active && active.imageKey === bankKey) syncAndRenderActiveDevice();
                }
            });
        });
    });
    container.querySelectorAll('button[data-delete-key]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (confirm('Delete key "' + this.dataset.deleteKey + '"?')) {
                removeImageBankKey(this.dataset.deleteKey);
            }
        });
    });
}

function renderLanguageGrid() {
    var grid = document.getElementById('languageGrid');
    if (!grid) return;
    grid.innerHTML = ALL_LANGUAGES.map(function(lang) {
        var isAdded = languages.includes(lang.code);
        return '<button class="lang-chip flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-left ' +
            (isAdded ? 'added border-indigo-300' : 'border-slate-200 bg-white text-slate-600') +
            '" data-lang-code="' + lang.code + '">' +
            '<span class="text-base">' + lang.flag + '</span>' +
            '<span class="flex-1 truncate">' + lang.name + '</span>' +
            (isAdded ? '<span class="text-indigo-500 font-bold">✓</span>' : '') +
            '</button>';
    }).join('');

    grid.querySelectorAll('button[data-lang-code]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var code = this.dataset.langCode;
            if (languages.includes(code)) {
                if (languages.length <= 1) { alert("Can't remove the last language."); return; }
                languages = languages.filter(function(l) { return l !== code; });
                Object.keys(imageBank).forEach(function(key) { delete imageBank[key][code]; });
                Object.keys(textBank).forEach(function(key) { delete textBank[key][code]; });
                if (currentLanguage === code) currentLanguage = languages[0];
            } else {
                languages.push(code);
            }
            renderLanguageSelector();
            renderImageBankUI();
            renderTextBankUI();
            renderLanguageGrid();
            updateKeySelects();
            updateTextKeySelects();
        });
    });
}

// ==========================================
// TEXT BANK: Sistema de textos localizados
// ==========================================
function getTextForKey(key) {
    if (!key || !textBank[key]) return null;
    return textBank[key][currentLanguage] || textBank[key][Object.keys(textBank[key])[0]] || '';
}

function addTextBankKey(name) {
    if (!name) {
        var tempKey = '__new_' + Date.now();
        textBank[tempKey] = {};
        renderTextBankUI(tempKey);
        updateTextKeySelects();
        return true;
    }
    name = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!name || (textBank[name] !== undefined && !name.startsWith('__new_'))) {
        alert('La key "' + name + '" ya existe o es inválida.');
        return false;
    }
    if (!textBank[name]) textBank[name] = {};
    renderTextBankUI();
    updateTextKeySelects();
    return true;
}

function removeTextBankKey(name) {
    delete textBank[name];
    if (typeof canvas !== 'undefined') {
        canvas.getObjects().forEach(function(obj) {
            if (obj.textKey === name) obj.textKey = null;
        });
    }
    renderTextBankUI();
    updateTextKeySelects();
}

function setTextForKey(key, lang, value) {
    if (!textBank[key]) textBank[key] = {};
    textBank[key][lang] = value;
}

function renderTextBankUI(editingKey) {
    var container = document.getElementById('textBankTableContainer');
    if (!container) return;
    var keys = Object.keys(textBank);
    if (keys.length === 0) {
        container.innerHTML = '<div class="p-10 text-center"><p class="text-sm text-slate-400 italic">No text keys yet. Add one to get started.</p></div>';
        return;
    }

    var headerCells = '<th class="pl-3">Key</th>' +
        languages.map(function(lang) {
            var info = getLangInfo(lang);
            return '<th style="min-width:140px">' + info.flag + ' ' + lang.toUpperCase() + '</th>';
        }).join('') +
        '<th></th>';

    var rows = keys.map(function(key) {
        var isEditing = (key === editingKey);
        var keyCell;
        if (isEditing) {
            keyCell = '<td class="pl-3"><input type="text" class="text-xs font-mono font-bold text-slate-700 border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" id="inlineTextKeyInput" placeholder="key_name" autofocus></td>';
        } else {
            keyCell = '<td class="pl-3"><span class="text-xs font-mono font-bold text-slate-700">' + key + '</span></td>';
        }
        var cells = keyCell +
            languages.map(function(lang) {
                var val = (textBank[key][lang] || '').replace(/"/g, '&quot;');
                return '<td><textarea class="text-cell" data-text-key="' + key + '" data-text-lang="' + lang + '" placeholder="...">' + val + '</textarea></td>';
            }).join('') +
            '<td><button class="text-red-400 hover:text-red-600 text-sm font-bold px-1" data-delete-text-key="' + key + '" title="Delete">×</button></td>';
        return '<tr>' + cells + '</tr>';
    }).join('');

    container.innerHTML = '<table class="bank-table"><thead><tr>' + headerCells + '</tr></thead><tbody>' + rows + '</tbody></table>';

    // Handle inline key editing
    var inlineInput = document.getElementById('inlineTextKeyInput');
    if (inlineInput && editingKey) {
        inlineInput.focus();
        function confirmTextKey() {
            var newName = inlineInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            var data = textBank[editingKey];
            delete textBank[editingKey];
            if (newName && textBank[newName] === undefined) {
                textBank[newName] = data || {};
            }
            renderTextBankUI();
            updateTextKeySelects();
        }
        inlineInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); confirmTextKey(); }
            if (e.key === 'Escape') {
                delete textBank[editingKey];
                renderTextBankUI();
                updateTextKeySelects();
            }
        });
        inlineInput.addEventListener('blur', function() {
            confirmTextKey();
        });
    }

    // Attach events
    container.querySelectorAll('textarea[data-text-key]').forEach(function(ta) {
        ta.addEventListener('input', function() {
            setTextForKey(this.dataset.textKey, this.dataset.textLang, this.value);
        });
        ta.addEventListener('blur', function() {
            refreshAllTexts();
        });
    });
    container.querySelectorAll('button[data-delete-text-key]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (confirm('Delete text key "' + this.dataset.deleteTextKey + '"?')) {
                removeTextBankKey(this.dataset.deleteTextKey);
            }
        });
    });
}

function updateTextKeySelects() {
    var keys = Object.keys(textBank);
    var options = '<option value="">(Custom)</option>' +
        keys.map(function(k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
    var s = document.getElementById('addTextKeySelect');
    if (s) s.innerHTML = options;
}

function refreshAllTexts() {
    if (typeof canvas === 'undefined') return;
    canvas.getObjects().forEach(function(obj) {
        if (obj.textKey && obj.isDesignElement) {
            var newText = getTextForKey(obj.textKey);
            if (newText !== null && newText !== obj.text) {
                obj.set({ text: newText });
            }
        }
    });
    canvas.renderAll();
}

// Navigation switching
function switchView(viewName) {
    document.getElementById('designView').classList.add('hidden');
    document.getElementById('imagesView').classList.add('hidden');
    document.getElementById('textsView').classList.add('hidden');
    document.querySelectorAll('.nav-tab').forEach(function(b) { b.classList.remove('active'); });

    if (viewName === 'design') {
        document.getElementById('designView').classList.remove('hidden');
        document.getElementById('navDesignBtn').classList.add('active');
    } else if (viewName === 'images') {
        document.getElementById('imagesView').classList.remove('hidden');
        document.getElementById('navImagesBtn').classList.add('active');
        renderImageBankUI();
    } else if (viewName === 'texts') {
        document.getElementById('textsView').classList.remove('hidden');
        document.getElementById('navTextsBtn').classList.add('active');
        renderTextBankUI();
    }
}

function updateKeySelects() {
    var keys = Object.keys(imageBank);
    var options = '<option value="">(No screenshot)</option>' +
        keys.map(function(k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
    var s1 = document.getElementById('deviceScreenshotKey');
    if (s1) s1.innerHTML = options;
    var s2 = document.getElementById('deviceKeySelect');
    if (s2) s2.innerHTML = options;
}

async function switchLanguage(lang) {
    currentLanguage = lang;
    document.getElementById('languageSelect').value = lang;
    refreshAllTexts();
    await refreshAllDevices();
}

async function refreshAllDevices() {
    var devices = canvas.getObjects().filter(function(o) { return o.is3DModel; });
    for (var i = 0; i < devices.length; i++) {
        var obj = devices[i];
        var texUrl = obj.imageKey ? getImageForKey(obj.imageKey) : null;
        if (currentModelPath !== obj.modelPath) {
            await new Promise(function(resolve) { loadLocal3DModel(obj.modelPath, resolve); });
        }
        phoneModel.rotation.set(
            obj.is2DMode ? 0 : obj.rotX * Math.PI,
            obj.is2DMode ? 0 : obj.rotY * Math.PI,
            obj.is2DMode ? 0 : obj.rotZ * Math.PI
        );
        phoneBodyMeshes.forEach(function(mesh) {
            if (mesh.material && mesh.material.color) mesh.material.color.set(obj.frameColor);
        });
        await applyTextureToScreen(texUrl);
        var dataURL = render3DToImage();
        if (dataURL) {
            await new Promise(function(resolve) { obj.setSrc(dataURL, function() { canvas.renderAll(); resolve(); }); });
        }
    }
}

// --- SCREEN OVERLAY: Crea un plano con UVs perfectos encima de la pantalla ---
// En vez de intentar reparar los UVs del mesh original (que no funciona de forma fiable),
// creamos un PlaneGeometry nuevo con UVs perfectos y lo posicionamos justo encima de la pantalla.
function createScreenOverlay() {
    if (!phoneScreenMesh || !phoneModel) return;

    // Limpiar overlay anterior
    if (customScreenPlane) {
        if (customScreenPlane.parent) customScreenPlane.parent.remove(customScreenPlane);
        customScreenPlane.geometry.dispose();
        customScreenPlane.material.dispose();
        customScreenPlane = null;
    }

    // Calcular bounding box del screen mesh en espacio de phoneModel
    phoneModel.updateMatrixWorld(true);
    const worldBB = new THREE.Box3().setFromObject(phoneScreenMesh);
    const invMatrix = new THREE.Matrix4().copy(phoneModel.matrixWorld).invert();
    worldBB.applyMatrix4(invMatrix);

    const bbSize = worldBB.getSize(new THREE.Vector3());
    const bbCenter = worldBB.getCenter(new THREE.Vector3());

    console.log('[OVERLAY] Screen bounds - size:', bbSize.x.toFixed(3), bbSize.y.toFixed(3), bbSize.z.toFixed(3));
    console.log('[OVERLAY] Screen center:', bbCenter.x.toFixed(3), bbCenter.y.toFixed(3), bbCenter.z.toFixed(3));

    // Detectar eje plano (normal de la pantalla) y calcular dimensiones del PlaneGeometry
    const minDim = Math.min(bbSize.x, bbSize.y, bbSize.z);
    let planeW, planeH;

    if (minDim === bbSize.x) {
        // Pantalla plana en X → plano en Y-Z
        planeW = bbSize.z;
        planeH = bbSize.y;
        console.log('[OVERLAY] Pantalla plana en X → plano Y-Z');
    } else if (minDim === bbSize.y) {
        planeW = bbSize.x;
        planeH = bbSize.z;
        console.log('[OVERLAY] Pantalla plana en Y → plano X-Z');
    } else {
        planeW = bbSize.x;
        planeH = bbSize.y;
        console.log('[OVERLAY] Pantalla plana en Z → plano X-Y');
    }

    // Calcular radio de esquina proporcional al dispositivo
    const config = DEVICE_CONFIG[currentModelPath];
    const radiusFactor = config ? config.cornerRadiusFactor : 0.16;
    const cornerR = planeW * radiusFactor;

    // Crear forma con esquinas redondeadas (ShapeGeometry en vez de PlaneGeometry)
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

    // Recalcular UVs para que vayan de 0 a 1 (ShapeGeometry no los normaliza)
    const uvAttr = geometry.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
        const rawX = geometry.attributes.position.getX(i);
        const rawY = geometry.attributes.position.getY(i);
        uvAttr.setXY(i, (rawX + hw) / planeW, (rawY + hh) / planeH);
    }
    uvAttr.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
        color: 0x111111,
        side: THREE.FrontSide // Use FrontSide to ensure texture isn't mirrored from behind
    });

    customScreenPlane = new THREE.Mesh(geometry, material);
    customScreenPlane.position.copy(bbCenter);

    // Rotar el plano para que mire en la dirección correcta y moverlo "hacia afuera"
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
    console.log('[OVERLAY] ✅ Screen overlay creado:', planeW.toFixed(3), 'x', planeH.toFixed(3), 'cornerR:', cornerR.toFixed(3));
}

// --- Cargar Modelo 3D Local ---
function loadLocal3DModel(modelPath, callback = null) {
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

                // 1. Detectar el mesh de pantalla (para calcular posición del overlay)
                if ((meshName === targetScreenName || meshName.includes("screen") || meshName.includes("display") || matName.includes("screen")) && !phoneScreenMesh) {
                    phoneScreenMesh = child;
                    // Ocultar el mesh original — la textura irá en el overlay
                    child.visible = false;
                    console.log(`[3D] ✅ Pantalla detectada: "${child.name}" → será reemplazada por overlay`);
                }
                else {
                    if (child.material) {
                        child.material = child.material.clone();
                        // Ocultar cristales: con metalness=1 y sin env map se ven casi negros,
                        // tapando la pantalla por completo
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
                            
                            // FORCE CORRECT DEPTH RENDERING
                            // To prevent polygon sorting bugs where the back of the phone leaks over the front
                            if (child.material) {
                                child.material.transparent = false;
                                child.material.depthWrite = true;
                                child.material.depthTest = true;
                                // Need to mark material for update inside Three.js
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                }
            }
        });

        // Crear el screen overlay DESPUÉS de detectar el screen mesh
        createScreenOverlay();

        renderer.render(scene, camera);
        if (callback) callback();

    }, undefined, (error) => console.error("Error cargando .glb:", error));
}

// Inicializar con el modelo seleccionado por defecto
const deviceSelect = document.getElementById('deviceModelSelect');
if (deviceSelect) loadLocal3DModel(deviceSelect.value);
if (deviceSelect) deviceSelect.addEventListener('change', (e) => loadLocal3DModel(e.target.value));

// --- ASINCRONÍA ---
function loadTextureAsPromise(url) {
    return new Promise((resolve, reject) => {
        if (!url) { resolve(null); return; }
        const img = new Image();
        img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.flipY = true; // PlaneGeometry usa UVs estándar → flipY=true
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            console.log('[TEX] ✅ Textura lista:', img.naturalWidth, 'x', img.naturalHeight);
            resolve(tex);
        };
        img.onerror = (e) => { console.error('[TEX] ❌ Error cargando imagen:', e); reject(e); };
        img.src = url;
    });
}

// (Image bank reemplaza globalBaseTexture — las imágenes se gestionan via imageBank)

function render3DToImage() {
    if (phoneModel) {
        renderer.render(scene, camera); // 1er render: sube texturas a GPU
        renderer.render(scene, camera); // 2do render: usa las texturas ya cargadas
        return threeCanvas.toDataURL('image/png');
    }
    return null;
}


// ==========================================
// 2. MOTOR 2D PANORÁMICO (Fabric.js)
// ==========================================
const workspaceContainer = document.getElementById('workspaceContainer');
const canvas = new fabric.Canvas('mainCanvas', {
    width: workspaceContainer.clientWidth, height: workspaceContainer.clientHeight,
    preserveObjectStacking: true
});

window.addEventListener('resize', () => {
    updateCanvasSize();
    renderLayout();
});

function updateCanvasSize() {
    const n = screensData.length || 1;
    // Fixed logical internal dimensions: tightly wraps screens + padding
    const logicalW = n * SCREEN_W + (n - 1) * GAP + 100;
    const logicalH = SCREEN_H + START_Y + 120;
    
    // Set logical internal dimensions (this changes canvas.width and canvas.height)
    canvas.setWidth(logicalW);
    canvas.setHeight(logicalH);
    
    // Set CSS visual size reflecting the zoom (triggers scrollbars naturally)
    canvas.setDimensions({ 
        width: (logicalW * canvasZoom) + 'px', 
        height: (logicalH * canvasZoom) + 'px' 
    }, { cssOnly: true });
}

// Screen size presets (export dimensions)
const SCREEN_PRESETS = {
    iphone67: { w: 1290, h: 2796, label: 'iPhone 6.7"' },
    iphone65: { w: 1242, h: 2688, label: 'iPhone 6.5"' },
    iphone55: { w: 1242, h: 2208, label: 'iPhone 5.5"' },
    ipad129:  { w: 2048, h: 2732, label: 'iPad 12.9"' },
    ipad11:   { w: 1668, h: 2388, label: 'iPad 11"' },
    custom:   { w: 1290, h: 2796, label: 'Custom' }
};
let currentPreset = 'iphone67';
let SCREEN_W = 340, SCREEN_H = 740;
const GAP = 40, START_Y = 60;

function applyScreenPreset(presetKey) {
    currentPreset = presetKey;
    var p = SCREEN_PRESETS[presetKey];
    var ratio = p.w / p.h;
    SCREEN_H = 740;
    SCREEN_W = Math.round(SCREEN_H * ratio);
    // Remove old screen objects so renderLayout recreates them
    screensData.forEach(function(s) {
        if (s.obj) { canvas.remove(s.obj); s.obj = null; }
    });
    renderLayout();
    if (bgMode === 'gradient') applyGlobalBackground();
}

let screensData = [{ id: 'screen_1', color: '#ffffff', obj: null }];
let globalClipPath = null;
let globalBgColor = '#e2e8f0';
let bgImageObject = null;
let bgMode = 'solid';
let gradColor1 = '#6366f1', gradColor2 = '#ec4899', gradAngle = 180;

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

function applyGlobalBackground() {
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

function addBgImageFromData(dataUrl) {
    // Remove old bg image if exists
    if (bgImageObject) {
        canvas.remove(bgImageObject);
        bgImageObject = null;
    }
    fabric.Image.fromURL(dataUrl, function(img) {
        // Scale to fit within canvas while maintaining aspect ratio
        var scale = Math.max(SCREEN_H / img.height, SCREEN_W / img.width) * 1.2;
        img.set({
            scaleX: scale,
            scaleY: scale,
            left: canvas.width / 2,
            top: START_Y + SCREEN_H / 2,
            originX: 'center',
            originY: 'center',
            isDesignElement: true,
            isBackgroundImage: true,
            clipPath: globalClipPath,
            borderColor: '#6366f1',
            cornerColor: '#6366f1',
            cornerStyle: 'circle',
            cornerSize: 10,
            transparentCorners: false,
            padding: 4
        });
        bgImageObject = img;
        canvas.add(img);
        reorderBgImage();
        canvas.renderAll();
        document.getElementById('clearBgImageBtn').classList.remove('hidden');
    });
}

function removeBgImage() {
    if (bgImageObject) {
        canvas.remove(bgImageObject);
        bgImageObject = null;
    }
    document.getElementById('clearBgImageBtn').classList.add('hidden');
    document.getElementById('globalBgImage').value = '';
    canvas.renderAll();
}

function reorderBgImage() {
    if (!bgImageObject) return;
    // Put bg image just above all screens
    var screenIndices = [];
    canvas.getObjects().forEach(function(obj, i) {
        if (obj.isScreen) screenIndices.push(i);
    });
    if (screenIndices.length > 0) {
        var maxScreenIdx = Math.max(...screenIndices);
        // Move bg image to just above the last screen
        canvas.moveTo(bgImageObject, maxScreenIdx + 1);
    }
}

function renderLayout() {
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

    const clipRects = screensData.map((s, i) => new fabric.Rect({ left: startX + i * (SCREEN_W + GAP), top: START_Y, width: SCREEN_W, height: SCREEN_H, rx: 16, ry: 16, absolutePositioned: true }));
    globalClipPath = new fabric.Group(clipRects, { absolutePositioned: true });
    canvas.getObjects().forEach(obj => { if (obj.isDesignElement) obj.set({ clipPath: globalClipPath }); });
    reorderBgImage();
    canvas.renderAll();
}


// ==========================================
// 3. INTERACCIÓN Y SINCRONIZACIÓN 3D-2D
// ==========================================

// Recorta la imagen con esquinas redondeadas para que encaje con la pantalla del dispositivo
function createRoundedScreenImage(image, cornerRadius) {
    const c = document.createElement('canvas');
    c.width = image.naturalWidth || image.width;
    c.height = image.naturalHeight || image.height;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height, r = cornerRadius;

    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, 0, 0);
    return c;
}

// Aplica textura al OVERLAY PLANE (no al mesh original del modelo)
async function applyTextureToScreen(textureUrl) {
    if (!customScreenPlane) { console.warn('[SYNC] No hay customScreenPlane'); return; }
    if (!textureUrl) {
        console.log('[SYNC] Sin textura, aplicando color negro');
        customScreenPlane.material = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.FrontSide });
        return;
    }
    try {
        console.log('[SYNC] Cargando textura:', textureUrl.substring(0, 60));
        // Cargar la imagen primero para poder aplicar esquinas redondeadas
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = textureUrl;
        });

        // Aplicar esquinas redondeadas según el dispositivo
        const config = DEVICE_CONFIG[currentModelPath];
        const radiusFactor = config ? config.cornerRadiusFactor : 0.16;
        const cornerRadius = Math.round(img.naturalWidth * radiusFactor);
        const roundedCanvas = createRoundedScreenImage(img, cornerRadius);

        // Crear textura desde el canvas recortado
        const tex = new THREE.Texture(roundedCanvas);
        tex.flipY = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        customScreenPlane.material.dispose();
        customScreenPlane.material = new THREE.MeshBasicMaterial({
            map: tex, color: 0xffffff, transparent: true, side: THREE.FrontSide
        });
        console.log('[SYNC] ✅ Textura con esquinas redondeadas aplicada (r=' + cornerRadius + ')');
    } catch (error) {
        console.error('[SYNC] ❌ Error:', error);
    }
}

async function syncAndRenderActiveDevice() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !activeObj.is3DModel || !phoneModel) return;

    if (activeObj.is2DMode) {
        phoneModel.rotation.set(0, 0, 0);
    } else {
        phoneModel.rotation.set(activeObj.rotX * Math.PI, activeObj.rotY * Math.PI, activeObj.rotZ * Math.PI);
    }

    phoneBodyMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.color) { mesh.material.color.set(activeObj.frameColor); }
    });

    await applyTextureToScreen(activeObj.imageKey ? getImageForKey(activeObj.imageKey) : null);

    const newDataURL = render3DToImage();
    if (newDataURL) {
        activeObj.setSrc(newDataURL, () => canvas.renderAll());
    }
}

document.getElementById('add3DDeviceBtn').addEventListener('click', async () => {
    if (!phoneModel) { alert("El modelo 3D se está cargando, por favor espera un segundo."); return; }
    const keyEl = document.getElementById('deviceScreenshotKey');
    const selectedKey = keyEl ? (keyEl.value || null) : null;
    const texUrl = selectedKey ? getImageForKey(selectedKey) : null;

    phoneModel.rotation.set(0, -0.3 * Math.PI, 0);
    await applyTextureToScreen(texUrl);

    const dataURL = render3DToImage();
    if (!dataURL) return;

    fabric.Image.fromURL(dataURL, (img) => {
        img.set({
            left: canvas.width / 2 - 200, top: 100, scaleX: 0.5, scaleY: 0.5,
            isDesignElement: true, is3DModel: true,
            modelPath: currentModelPath,
            imageKey: selectedKey,
            frameColor: '#1e293b',
            is2DMode: false,
            rotX: 0, rotY: -0.3, rotZ: 0
        });
        img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
        img.set({ clipPath: globalClipPath });
        canvas.add(img); canvas.setActiveObject(img); renderLayout();
    });
});


// ==========================================
// 4. UI Y EVENTOS
// ==========================================
const screenControls = document.getElementById('screenControls');
const elementControls = document.getElementById('elementControls');
const rotationControls = document.getElementById('rotationControls');
const deviceSettings = document.getElementById('deviceSettings');

const mode2DBtn = document.getElementById('mode2DBtn');
const mode3DBtn = document.getElementById('mode3DBtn');
const frameColorInput = document.getElementById('frameColorInput');
const deviceKeySelect = document.getElementById('deviceKeySelect');

canvas.on('selection:created', handleSelection);
canvas.on('selection:updated', handleSelection);
canvas.on('selection:cleared', () => {
    screenControls.classList.add('hidden'); elementControls.classList.add('hidden');
    rotationControls.classList.add('hidden'); deviceSettings.classList.add('hidden');
});

function handleSelection(e) {
    const obj = e.selected[0];
    if (!obj) return;

    screenControls.classList.add('hidden'); elementControls.classList.add('hidden');
    rotationControls.classList.add('hidden'); deviceSettings.classList.add('hidden');

    if (obj.isScreen) {
        screenControls.classList.remove('hidden');
        var transBtn = document.getElementById('screenTransparentBtn');
        if (obj.fill === 'transparent') {
            document.getElementById('screenBgColor').disabled = true;
            document.getElementById('screenBgColor').style.opacity = '0.3';
            transBtn.textContent = '✅ Opaque';
            transBtn.classList.add('bg-indigo-100');
        } else {
            document.getElementById('screenBgColor').value = obj.fill;
            document.getElementById('screenBgColor').disabled = false;
            document.getElementById('screenBgColor').style.opacity = '1';
            transBtn.textContent = '🚨 Transparent';
            transBtn.classList.remove('bg-indigo-100');
        }
    } else if (obj.isDesignElement) {
        elementControls.classList.remove('hidden');

        // Update lock button state
        var lockBtn = document.getElementById('lockElementBtn');
        if (obj.lockMovementX) {
            lockBtn.innerHTML = '🔒 Unlock';
            lockBtn.classList.replace('bg-amber-50', 'bg-amber-200');
        } else {
            lockBtn.innerHTML = '🔓 Lock';
            lockBtn.classList.replace('bg-amber-200', 'bg-amber-50');
        }

        // Opacity
        var opVal = Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100);
        document.getElementById('elementOpacity').value = opVal;
        document.getElementById('opacityLabel').textContent = opVal + '%';

        // Text controls
        var textControls = document.getElementById('textControls');
        if (obj.type === 'i-text') {
            textControls.classList.remove('hidden');
            document.getElementById('textFontFamily').value = obj.fontFamily || 'system-ui, sans-serif';
            document.getElementById('textFontSize').value = obj.fontSize || 42;
            document.getElementById('textColor').value = obj.fill || '#ffffff';
            document.getElementById('textBoldBtn').classList.toggle('bg-blue-200', obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === '800');
            document.getElementById('textItalicBtn').classList.toggle('bg-blue-200', obj.fontStyle === 'italic');
        } else {
            textControls.classList.add('hidden');
        }

        // Shape controls
        var shapeControls = document.getElementById('shapeControls');
        if (obj.isShape) {
            shapeControls.classList.remove('hidden');
            document.getElementById('shapeFillColor').value = obj.fill || '#6366f1';
            document.getElementById('shapeStrokeColor').value = obj.stroke || '#4f46e5';
            document.getElementById('shapeStrokeWidth').value = obj.strokeWidth || 0;
        } else {
            shapeControls.classList.add('hidden');
        }

        if (obj.is3DModel) {
            deviceSettings.classList.remove('hidden');
            if (currentModelPath !== obj.modelPath) {
                loadLocal3DModel(obj.modelPath, () => actualizarUI_DesdeObjeto(obj));
            } else {
                actualizarUI_DesdeObjeto(obj);
            }
        }
    }
}

function actualizarUI_DesdeObjeto(obj) {
    frameColorInput.value = obj.frameColor;
    if (deviceKeySelect) deviceKeySelect.value = obj.imageKey || '';

    if (obj.is2DMode) {
        mode2DBtn.classList.replace('bg-white', 'bg-indigo-100'); mode2DBtn.classList.replace('text-slate-500', 'text-indigo-800'); mode2DBtn.classList.add('font-bold', 'shadow-sm');
        mode3DBtn.classList.replace('bg-indigo-100', 'bg-white'); mode3DBtn.classList.replace('text-indigo-800', 'text-slate-500'); mode3DBtn.classList.remove('font-bold', 'shadow-sm');
        rotationControls.classList.add('hidden');
    } else {
        mode3DBtn.classList.replace('bg-white', 'bg-indigo-100'); mode3DBtn.classList.replace('text-slate-500', 'text-indigo-800'); mode3DBtn.classList.add('font-bold', 'shadow-sm');
        mode2DBtn.classList.replace('bg-indigo-100', 'bg-white'); mode2DBtn.classList.replace('text-indigo-800', 'text-slate-500'); mode2DBtn.classList.remove('font-bold', 'shadow-sm');
        rotationControls.classList.remove('hidden');
        document.getElementById('rotX').value = obj.rotX;
        document.getElementById('rotY').value = obj.rotY;
        document.getElementById('rotZ').value = obj.rotZ;
    }

    syncAndRenderActiveDevice();
}

mode2DBtn.addEventListener('click', () => {
    const obj = canvas.getActiveObject(); if (!obj) return;
    obj.set({ is2DMode: true }); actualizarUI_DesdeObjeto(obj);
});

mode3DBtn.addEventListener('click', () => {
    const obj = canvas.getActiveObject(); if (!obj) return;
    obj.set({ is2DMode: false }); actualizarUI_DesdeObjeto(obj);
});

frameColorInput.addEventListener('input', (e) => {
    const obj = canvas.getActiveObject(); if (!obj) return;
    obj.set({ frameColor: e.target.value });
    syncAndRenderActiveDevice();
});

if (deviceKeySelect) {
    deviceKeySelect.addEventListener('change', function () {
        const obj = canvas.getActiveObject();
        if (!obj || !obj.is3DModel) return;
        obj.set({ imageKey: this.value || null });
        syncAndRenderActiveDevice();
    });
}

['rotX', 'rotY', 'rotZ'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
        const obj = canvas.getActiveObject(); if (!obj) return;
        if (!obj.is2DMode) {
            obj.set({ [id]: parseFloat(e.target.value) });
            syncAndRenderActiveDevice();
        }
    });
});

document.getElementById('addScreenBtn').addEventListener('click', () => { screensData.push({ id: 'screen_' + Date.now(), color: '#ffffff', obj: null }); renderLayout(); });
document.getElementById('addTextBtn').addEventListener('click', () => {
    var keySelect = document.getElementById('addTextKeySelect');
    var selectedKey = keySelect ? keySelect.value : '';
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
    canvas.add(text); canvas.setActiveObject(text); renderLayout();
});

// Free image insertion
const freeImageInputEl = document.getElementById('freeImageInput');
if (freeImageInputEl) freeImageInputEl.addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        fabric.Image.fromURL(ev.target.result, function(img) {
            var scale = Math.min(300 / img.width, 500 / img.height, 1);
            img.set({
                left: canvas.width / 2 - (img.width * scale) / 2,
                top: 150,
                scaleX: scale,
                scaleY: scale,
                isDesignElement: true,
                isFreeImage: true,
                clipPath: globalClipPath,
                borderColor: '#6366f1',
                cornerColor: '#6366f1',
                cornerStyle: 'circle',
                cornerSize: 10,
                transparentCorners: false,
                padding: 4
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            renderLayout();
        });
    };
    reader.readAsDataURL(file);
    this.value = '';
});

// Lock/Unlock element
document.getElementById('lockElementBtn').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (!obj || !obj.isDesignElement) return;
    const isLocked = !!obj.lockMovementX;
    obj.set({
        lockMovementX: !isLocked,
        lockMovementY: !isLocked,
        lockScalingX: !isLocked,
        lockScalingY: !isLocked,
        lockRotation: !isLocked,
        hasControls: isLocked
    });
    handleSelection({ selected: [obj] });
    canvas.renderAll();
});

document.getElementById('screenBgColor').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.isScreen) {
        const screenData = screensData.find(s => s.id === activeObj.screenId);
        screenData.color = e.target.value;
        renderLayout();
    }
});

// Transparent screen toggle
document.getElementById('screenTransparentBtn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !activeObj.isScreen) return;
    const screenData = screensData.find(s => s.id === activeObj.screenId);
    if (activeObj.fill === 'transparent') {
        screenData.color = '#ffffff';
    } else {
        screenData.color = 'transparent';
    }
    renderLayout();
    handleSelection({ selected: [activeObj] });
});

// Global background controls
document.getElementById('bgModeSolid').addEventListener('click', function() {
    bgMode = 'solid';
    this.classList.replace('bg-white', 'bg-indigo-600'); this.classList.replace('text-slate-600', 'text-white');
    this.classList.remove('border', 'border-slate-200');
    var gb = document.getElementById('bgModeGradient');
    gb.classList.replace('bg-indigo-600', 'bg-white'); gb.classList.replace('text-white', 'text-slate-600');
    gb.classList.add('border', 'border-slate-200');
    document.getElementById('bgSolidControls').classList.remove('hidden');
    document.getElementById('bgGradientControls').classList.add('hidden');
    applyGlobalBackground();
});

document.getElementById('bgModeGradient').addEventListener('click', function() {
    bgMode = 'gradient';
    this.classList.replace('bg-white', 'bg-indigo-600'); this.classList.replace('text-slate-600', 'text-white');
    this.classList.remove('border', 'border-slate-200');
    var sb = document.getElementById('bgModeSolid');
    sb.classList.replace('bg-indigo-600', 'bg-white'); sb.classList.replace('text-white', 'text-slate-600');
    sb.classList.add('border', 'border-slate-200');
    document.getElementById('bgSolidControls').classList.add('hidden');
    document.getElementById('bgGradientControls').classList.remove('hidden');
    applyGlobalBackground();
});

document.getElementById('globalBgColor').addEventListener('input', (e) => {
    globalBgColor = e.target.value;
    applyGlobalBackground();
});

document.getElementById('gradColor1').addEventListener('input', (e) => {
    gradColor1 = e.target.value; applyGlobalBackground();
});
document.getElementById('gradColor2').addEventListener('input', (e) => {
    gradColor2 = e.target.value; applyGlobalBackground();
});
document.getElementById('gradAngle').addEventListener('input', (e) => {
    gradAngle = parseInt(e.target.value);
    document.getElementById('gradAngleLabel').textContent = gradAngle + '°';
    applyGlobalBackground();
});

document.getElementById('globalBgImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        addBgImageFromData(ev.target.result);
    };
    reader.readAsDataURL(file);
});

document.getElementById('clearBgImageBtn').addEventListener('click', () => {
    removeBgImage();
});

// Text controls
document.getElementById('textFontFamily').addEventListener('change', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') { obj.set('fontFamily', this.value); canvas.renderAll(); }
});
document.getElementById('textFontSize').addEventListener('input', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') { obj.set('fontSize', parseInt(this.value) || 42); canvas.renderAll(); }
});
document.getElementById('textColor').addEventListener('input', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') { obj.set('fill', this.value); canvas.renderAll(); }
});
document.getElementById('textBoldBtn').addEventListener('click', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') {
        var isBold = obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === '800';
        obj.set('fontWeight', isBold ? '400' : '700');
        this.classList.toggle('bg-blue-200', !isBold);
        canvas.renderAll();
    }
});
document.getElementById('textItalicBtn').addEventListener('click', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') {
        var isItalic = obj.fontStyle === 'italic';
        obj.set('fontStyle', isItalic ? 'normal' : 'italic');
        this.classList.toggle('bg-blue-200', !isItalic);
        canvas.renderAll();
    }
});

// Opacity slider
document.getElementById('elementOpacity').addEventListener('input', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.isDesignElement) {
        var val = parseInt(this.value) / 100;
        obj.set('opacity', val);
        document.getElementById('opacityLabel').textContent = this.value + '%';
        canvas.renderAll();
    }
});

// Duplicate element
function duplicateElement() {
    var obj = canvas.getActiveObject();
    if (!obj || !obj.isDesignElement) return;
    obj.clone(function(cloned) {
        cloned.set({
            left: (cloned.left || 0) + 20,
            top: (cloned.top || 0) + 20,
            isDesignElement: true,
            clipPath: globalClipPath
        });
        // Copy custom props
        ['is3DModel', 'isFreeImage', 'isBackgroundImage', 'textKey', 'imageKey',
         'modelPath', 'frameColor', 'rotX', 'rotY', 'rotZ', 'is2DMode'].forEach(function(p) {
            if (obj[p] !== undefined) cloned.set(p, obj[p]);
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
    });
}
document.getElementById('duplicateElementBtn').addEventListener('click', duplicateElement);

// ==========================================
// SHAPE CREATION
// ==========================================
function createShape(type) {
    var props = {
        isDesignElement: true,
        isShape: true,
        shapeType: type,
        clipPath: globalClipPath,
        borderColor: '#6366f1', cornerColor: '#6366f1',
        cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
    };
    var obj;
    if (type === 'rect') {
        obj = new fabric.Rect(Object.assign({
            left: canvas.width / 2 - 60, top: 200,
            width: 120, height: 90, rx: 12, ry: 12,
            fill: '#6366f1', stroke: '', strokeWidth: 0
        }, props));
    } else if (type === 'circle') {
        obj = new fabric.Circle(Object.assign({
            left: canvas.width / 2 - 40, top: 200,
            radius: 50,
            fill: '#6366f1', stroke: '', strokeWidth: 0
        }, props));
    } else if (type === 'line') {
        obj = new fabric.Line([0, 0, 200, 0], Object.assign({
            left: canvas.width / 2 - 100, top: 300,
            stroke: '#6366f1', strokeWidth: 4,
            fill: ''
        }, props));
    } else if (type === 'arrow') {
        obj = new fabric.Path('M 0 20 L 160 20 L 140 0 M 160 20 L 140 40', Object.assign({
            left: canvas.width / 2 - 80, top: 300,
            stroke: '#6366f1', strokeWidth: 4,
            fill: '', strokeLineCap: 'round', strokeLineJoin: 'round'
        }, props));
    }
    if (obj) {
        canvas.add(obj);
        canvas.setActiveObject(obj);
        renderLayerPanel();
        canvas.renderAll();
    }
}

document.getElementById('addRectBtn').addEventListener('click', function() { createShape('rect'); });
document.getElementById('addCircleBtn').addEventListener('click', function() { createShape('circle'); });
document.getElementById('addLineBtn').addEventListener('click', function() { createShape('line'); });
document.getElementById('addArrowBtn').addEventListener('click', function() { createShape('arrow'); });

// Shape style controls
document.getElementById('shapeFillColor').addEventListener('input', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.isShape) { obj.set('fill', this.value); canvas.renderAll(); }
});
document.getElementById('shapeStrokeColor').addEventListener('input', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.isShape) { obj.set('stroke', this.value); canvas.renderAll(); }
});
document.getElementById('shapeStrokeWidth').addEventListener('input', function() {
    var obj = canvas.getActiveObject();
    if (obj && obj.isShape) { obj.set('strokeWidth', parseInt(this.value) || 0); canvas.renderAll(); }
});

// ==========================================
// SIZE PRESETS
// ==========================================
document.getElementById('screenSizePreset').addEventListener('change', function() {
    applyScreenPreset(this.value);
});

// ==========================================
// LAYER PANEL
// ==========================================
function getElementLabel(obj) {
    if (obj.type === 'i-text') return '\u270d\ufe0f ' + (obj.text || 'Text').substring(0, 15);
    if (obj.is3DModel) return '\ud83d\udcf1 3D Device';
    if (obj.isFreeImage) return '\ud83d\uddbc Image';
    if (obj.isBackgroundImage) return '\ud83c\udf05 Background';
    if (obj.isShape) {
        if (obj.shapeType === 'rect') return '\u25a0 Rectangle';
        if (obj.shapeType === 'circle') return '\u25cf Circle';
        if (obj.shapeType === 'line') return '\u2015 Line';
        if (obj.shapeType === 'arrow') return '\u2794 Arrow';
        return '\u25a0 Shape';
    }
    return '\u2b50 Element';
}

function renderLayerPanel() {
    var list = document.getElementById('layerList');
    if (!list) return;
    var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; }).reverse();
    if (elements.length === 0) {
        list.innerHTML = '<div class="text-slate-400 text-[10px] py-2 text-center">No elements yet</div>';
        return;
    }
    list.innerHTML = '';
    elements.forEach(function(obj, idx) {
        var row = document.createElement('div');
        row.className = 'flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition-colors group ' +
            (canvas.getActiveObject() === obj ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-transparent');
        
        // Visibility toggle
        var visBtn = document.createElement('button');
        visBtn.innerHTML = obj.visible === false ? '\ud83d\ude48' : '\ud83d\udc41';
        visBtn.className = 'text-[10px] w-5 shrink-0 hover:scale-110 transition-transform';
        visBtn.onclick = function(e) {
            e.stopPropagation();
            obj.set('visible', obj.visible === false ? true : false);
            canvas.renderAll();
            renderLayerPanel();
        };
        
        // Label
        var label = document.createElement('span');
        label.className = 'flex-1 truncate text-[11px] ' + (obj.visible === false ? 'text-slate-300 line-through' : 'text-slate-700');
        label.textContent = getElementLabel(obj);
        
        // z-order buttons
        var upBtn = document.createElement('button');
        upBtn.innerHTML = '\u25b2';
        upBtn.className = 'text-[9px] text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity';
        upBtn.onclick = function(e) {
            e.stopPropagation();
            canvas.bringForward(obj);
            renderLayerPanel();
        };
        var downBtn = document.createElement('button');
        downBtn.innerHTML = '\u25bc';
        downBtn.className = 'text-[9px] text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity';
        downBtn.onclick = function(e) {
            e.stopPropagation();
            canvas.sendBackwards(obj);
            renderLayerPanel();
        };
        
        row.onclick = function() {
            canvas.setActiveObject(obj);
            canvas.renderAll();
            renderLayerPanel();
        };
        
        row.appendChild(visBtn);
        row.appendChild(label);
        row.appendChild(upBtn);
        row.appendChild(downBtn);
        list.appendChild(row);
    });
}

document.getElementById('refreshLayersBtn').addEventListener('click', renderLayerPanel);
canvas.on('object:added', function() { if (!isRestoringHistory) renderLayerPanel(); });
canvas.on('object:removed', function() { if (!isRestoringHistory) renderLayerPanel(); });
canvas.on('selection:created', function() { renderLayerPanel(); });
canvas.on('selection:updated', function() { renderLayerPanel(); });
canvas.on('selection:cleared', function() { renderLayerPanel(); });

// ==========================================
// ZOOM (Ctrl/Cmd + Scroll)
// ==========================================
var canvasZoom = 1;

workspaceContainer.addEventListener('wheel', function(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var delta = -e.deltaY / 500;
    canvasZoom = Math.min(3, Math.max(0.25, canvasZoom + delta));
    canvas.setZoom(canvasZoom);
    // Resize canvas to content * zoom so fabric renders correctly
    updateCanvasSize();
    document.getElementById('zoomIndicator').textContent = Math.round(canvasZoom * 100) + '%';
    canvas.renderAll();
}, { passive: false });

// ==========================================
// SNAP GUIDES
// ==========================================
var snapEnabled = true;
var SNAP_THRESHOLD = 8;
var guideLines = [];

document.getElementById('snapGuidesToggle').addEventListener('change', function() {
    snapEnabled = this.checked;
});

function clearGuideLines() {
    guideLines.forEach(function(l) { canvas.remove(l); });
    guideLines = [];
}

function addGuideLine(x1, y1, x2, y2) {
    var line = new fabric.Line([x1, y1, x2, y2], {
        stroke: '#f43f5e',
        strokeWidth: 1,
        strokeDashArray: [4, 3],
        selectable: false,
        evented: false,
        excludeFromExport: true
    });
    canvas.add(line);
    guideLines.push(line);
}

canvas.on('object:moving', function(e) {
    if (!snapEnabled) return;
    clearGuideLines();
    var obj = e.target;
    if (!obj || !obj.isDesignElement) return;

    var objBound = obj.getBoundingRect(true);
    var objCX = objBound.left + objBound.width / 2;
    var objCY = objBound.top + objBound.height / 2;
    var objL = objBound.left;
    var objR = objBound.left + objBound.width;
    var objT = objBound.top;
    var objB = objBound.top + objBound.height;
    var snapped = { x: false, y: false };

    // Collect snap targets: screen rects + other design elements
    var targets = [];
    screensData.forEach(function(s) {
        if (!s.obj) return;
        targets.push({
            cx: s.obj.left + SCREEN_W / 2, cy: s.obj.top + SCREEN_H / 2,
            l: s.obj.left, r: s.obj.left + SCREEN_W,
            t: s.obj.top, b: s.obj.top + SCREEN_H,
            full: true
        });
    });
    canvas.getObjects().forEach(function(o) {
        if (o === obj || !o.isDesignElement || o.visible === false) return;
        var b = o.getBoundingRect(true);
        targets.push({
            cx: b.left + b.width / 2, cy: b.top + b.height / 2,
            l: b.left, r: b.left + b.width,
            t: b.top, b: b.top + b.height,
            full: false
        });
    });

    targets.forEach(function(t) {
        // Horizontal center alignment
        if (!snapped.x && Math.abs(objCX - t.cx) < SNAP_THRESHOLD) {
            obj.set('left', obj.left + (t.cx - objCX));
            addGuideLine(t.cx, 0, t.cx, canvas.height);
            snapped.x = true;
        }
        // Left edge
        if (!snapped.x && Math.abs(objL - t.l) < SNAP_THRESHOLD) {
            obj.set('left', obj.left + (t.l - objL));
            addGuideLine(t.l, 0, t.l, canvas.height);
            snapped.x = true;
        }
        // Right edge
        if (!snapped.x && Math.abs(objR - t.r) < SNAP_THRESHOLD) {
            obj.set('left', obj.left + (t.r - objR));
            addGuideLine(t.r, 0, t.r, canvas.height);
            snapped.x = true;
        }
        // Vertical center alignment
        if (!snapped.y && Math.abs(objCY - t.cy) < SNAP_THRESHOLD) {
            obj.set('top', obj.top + (t.cy - objCY));
            addGuideLine(0, t.cy, canvas.width, t.cy);
            snapped.y = true;
        }
        // Top edge
        if (!snapped.y && Math.abs(objT - t.t) < SNAP_THRESHOLD) {
            obj.set('top', obj.top + (t.t - objT));
            addGuideLine(0, t.t, canvas.width, t.t);
            snapped.y = true;
        }
        // Bottom edge
        if (!snapped.y && Math.abs(objB - t.b) < SNAP_THRESHOLD) {
            obj.set('top', obj.top + (t.b - objB));
            addGuideLine(0, t.b, canvas.width, t.b);
            snapped.y = true;
        }
    });
});

canvas.on('object:modified', function() { clearGuideLines(); });
canvas.on('selection:cleared', function() { clearGuideLines(); });

// ==========================================
// TEMPLATES — dynamic loading from /templates/
// ==========================================

async function loadTemplateList() {
    try {
        // Python's http.server returns a directory listing as HTML when no index.html is present
        const resp = await fetch('./templates/');
        const html = await resp.text();
        // Parse anchor tags pointing to .json files
        // The href is already percent-encoded by the server — keep it as-is for fetch
        const matches = [...html.matchAll(/href="([^"]+\.json)"/gi)];
        return matches.map(m => {
            const rawHref = m[1]; // e.g. "Mi%20Dise%C3%B1o.json" — already encoded
            // Strip path prefix if any
            const rawBasename = rawHref.split('/').pop();
            // Human-readable name = decode, then strip .json
            const name = decodeURIComponent(rawBasename.replace(/\.json$/i, ''));
            const filename = decodeURIComponent(rawBasename); // decoded filename for display
            return { name, filename, href: rawBasename }; // keep raw href for fetch
        });
    } catch (e) {
        console.warn('[Templates] Could not load template list:', e);
        return [];
    }
}

async function applyTemplateFromFile(href) {
    // `href` is the raw (already percent-encoded) basename from the directory listing
    try {
        const resp = await fetch('./templates/' + href);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const jsonText = await resp.text();
        // Re-use the existing import logic (which expects a JSON string)
        importProjectFromJSON(jsonText);
        document.getElementById('templatesModal').classList.add('hidden');
    } catch (e) {
        console.error('[Templates] Failed to load template:', href, e);
        alert('No se pudo cargar la plantilla: ' + decodeURIComponent(href));
    }
}

async function renderTemplateGrid() {
    var grid = document.getElementById('templateGrid');
    grid.innerHTML = '<p class="text-slate-500 text-sm p-4">Cargando plantillas…</p>';

    const templates = await loadTemplateList();

    if (templates.length === 0) {
        grid.innerHTML = '<p class="text-slate-500 text-sm p-4">No hay plantillas. Guarda un proyecto como .json en la carpeta <code>templates/</code>.</p>';
        return;
    }

    grid.innerHTML = '';
    templates.forEach(function(tmpl) {
        var card = document.createElement('div');
        card.className = 'relative rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] hover:shadow-lg border border-slate-200';
        card.innerHTML =
            '<div class="h-28 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">' +
                '<span class="text-4xl drop-shadow-lg">📋</span>' +
            '</div>' +
            '<div class="p-3 bg-white">' +
                '<h4 class="font-bold text-sm text-slate-800">' + tmpl.name + '</h4>' +
                '<p class="text-[11px] text-slate-500 mt-0.5">' + tmpl.filename + '</p>' +
            '</div>' +
            '<div class="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">' +
                '<span class="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">Aplicar</span>' +
            '</div>';
        card.onclick = function() {
            applyTemplateFromFile(tmpl.href);
        };
        grid.appendChild(card);
    });
}

document.getElementById('openTemplatesBtn').addEventListener('click', function() {
    renderTemplateGrid();
    document.getElementById('templatesModal').classList.remove('hidden');
});
document.getElementById('closeTemplatesBtn').addEventListener('click', function() {
    document.getElementById('templatesModal').classList.add('hidden');
});

function moveScreen(direction) {
    const activeObj = canvas.getActiveObject();
    if (!activeObj || !activeObj.isScreen) return;
    const index = screensData.findIndex(s => s.id === activeObj.screenId);
    if (index === -1) return;
    if (direction === 'left' && index > 0) {
        [screensData[index - 1], screensData[index]] = [screensData[index], screensData[index - 1]];
    } else if (direction === 'right' && index < screensData.length - 1) {
        [screensData[index], screensData[index + 1]] = [screensData[index + 1], screensData[index]];
    }
    renderLayout();
}

document.getElementById('moveScreenLeftBtn').addEventListener('click', () => moveScreen('left'));
document.getElementById('moveScreenRightBtn').addEventListener('click', () => moveScreen('right'));

// Delete screen
document.getElementById('deleteScreenBtn').addEventListener('click', () => {
    if (screensData.length <= 1) { alert('Cannot delete the last screen.'); return; }
    var activeObj = canvas.getActiveObject();
    if (!activeObj || !activeObj.isScreen) return;
    var index = screensData.findIndex(s => s.id === activeObj.screenId);
    if (index === -1) return;
    canvas.remove(activeObj);
    screensData.splice(index, 1);
    canvas.discardActiveObject();
    screenControls.classList.add('hidden');
    renderLayout();
});

document.getElementById('deleteElementBtn').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (obj && obj.isDesignElement) { canvas.remove(obj); canvas.discardActiveObject(); handleSelection({ selected: [] }); }
});

window.addEventListener('keydown', (e) => {
    // Undo: Cmd/Ctrl+Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
    }
    // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
    if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
    }
    // Duplicate: Cmd/Ctrl+D
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        duplicateElement();
        return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isDesignElement && !activeObj.isEditing) {
            document.getElementById('deleteElementBtn').click();
        }
    }
});

// ==========================================
// 5. UNDO / REDO SYSTEM
// ==========================================
const CUSTOM_PROPS = ['isScreen', 'screenId', 'isDesignElement', 'is3DModel', 'isFreeImage',
    'isBackgroundImage', 'isShape', 'shapeType', 'textKey', 'imageKey', 'modelPath', 'frameColor',
    'rotX', 'rotY', 'rotZ', 'is2DMode', 'lockMovementX', 'lockMovementY',
    'lockScalingX', 'lockScalingY', 'lockRotation'];

let historyStack = [];
let historyIndex = -1;
let isRestoringHistory = false;
const MAX_HISTORY = 40;

function saveHistory() {
    if (isRestoringHistory) return;
    // Truncate forward history
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(canvas.toJSON(CUSTOM_PROPS));
    historyIndex = historyStack.length - 1;
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
        historyIndex--;
    }
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreFromHistory(historyStack[historyIndex]);
}

function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    restoreFromHistory(historyStack[historyIndex]);
}

function restoreFromHistory(state) {
    isRestoringHistory = true;
    canvas.loadFromJSON(state, function() {
        // Re-link screensData objects
        screensData.forEach(function(sd) { sd.obj = null; });
        bgImageObject = null;
        canvas.getObjects().forEach(function(obj) {
            if (obj.isScreen) {
                var sd = screensData.find(function(s) { return s.id === obj.screenId; });
                if (sd) sd.obj = obj;
            }
            if (obj.isBackgroundImage) bgImageObject = obj;
        });
        // Rebuild clip path
        var startX = Math.max(50, (canvas.width - (screensData.length * SCREEN_W + (screensData.length - 1) * GAP)) / 2);
        var clipRects = screensData.map(function(s, i) {
            return new fabric.Rect({ left: startX + i * (SCREEN_W + GAP), top: START_Y, width: SCREEN_W, height: SCREEN_H, rx: 16, ry: 16, absolutePositioned: true });
        });
        globalClipPath = new fabric.Group(clipRects, { absolutePositioned: true });
        canvas.getObjects().forEach(function(obj) {
            if (obj.isDesignElement) obj.set({ clipPath: globalClipPath });
        });
        canvas.renderAll();
        isRestoringHistory = false;
    });
}

// Save history on canvas changes
canvas.on('object:modified', saveHistory);
canvas.on('object:added', function() { if (!isRestoringHistory) saveHistory(); });
canvas.on('object:removed', function() { if (!isRestoringHistory) saveHistory(); });

// ==========================================
// EXPORT  —  ZIP-based
// ==========================================

// Helper: render one screen to a dataURL at full export resolution
function renderScreenDataURL(screen) {
    var preset = SCREEN_PRESETS[currentPreset];
    var multiplier = preset.w / SCREEN_W;
    canvas.discardActiveObject();
    canvas.renderAll();
    return canvas.toDataURL({
        left:       screen.obj.left,
        top:        screen.obj.top,
        width:      SCREEN_W,
        height:     SCREEN_H,
        format:     'png',
        quality:    1,
        multiplier: multiplier
    });
}

// Helper: dataURL base-data (strips the "data:image/png;base64," prefix)
function dataURLtoBytes(dataURL) {
    return dataURL.split(',')[1]; // base64 string, JSZip handles it directly
}

// Export Screens — current language → ZIP
document.getElementById('exportBtn').addEventListener('click', async () => {
    canvas.discardActiveObject(); canvas.renderAll();
    const lang = currentLanguage;
    const zip = new JSZip();
    const folder = zip.folder(lang);
    screensData.forEach((screen, i) => {
        const dataURL = renderScreenDataURL(screen);
        folder.file(`screen_${i + 1}_${lang}.png`, dataURLtoBytes(dataURL), { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    var nameInput = document.getElementById('projectNameInput');
    var rawName = nameInput ? nameInput.value.trim() : '';
    var projectName = rawName || 'project';
    var safeProjectName = projectName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    
    a.download = `openscreenshots_${safeProjectName}_${lang}.zip`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
});

// Export All Languages → single ZIP with one subfolder per language
document.getElementById('exportAllLangsBtn').addEventListener('click', async () => {
    canvas.discardActiveObject(); canvas.renderAll();
    const zip = new JSZip();
    const delay = ms => new Promise(r => setTimeout(r, ms));
    const originalLang = currentLanguage;

    for (const lang of languages) {
        switchLanguage(lang);
        await delay(350); // let textures update
        const folder = zip.folder(lang);
        screensData.forEach((screen, i) => {
            const dataURL = renderScreenDataURL(screen);
            folder.file(`screen_${i + 1}_${lang}.png`, dataURLtoBytes(dataURL), { base64: true });
        });
    }

    // Restore original language
    switchLanguage(originalLang);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    var nameInput = document.getElementById('projectNameInput');
    var rawName = nameInput ? nameInput.value.trim() : '';
    var projectName = rawName || 'project';
    var safeProjectName = projectName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    
    a.download = `openscreenshots_${safeProjectName}_all.zip`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
});


// Image Bank & Navigation event listeners
document.getElementById('addKeyBtn').addEventListener('click', function() {
    addImageBankKey(null); // Start inline editing
});

document.getElementById('addTextKeyBtn').addEventListener('click', function() {
    addTextBankKey(null); // Start inline editing
});

// Navigation
document.getElementById('navDesignBtn').addEventListener('click', function() { switchView('design'); });
document.getElementById('navImagesBtn').addEventListener('click', function() { switchView('images'); });
document.getElementById('navTextsBtn').addEventListener('click', function() { switchView('texts'); });

// Language modal
document.getElementById('openLanguageModalBtn').addEventListener('click', function() {
    renderLanguageGrid();
    document.getElementById('languageModal').classList.remove('hidden');
});
document.getElementById('closeLanguageModalBtn').addEventListener('click', function() {
    document.getElementById('languageModal').classList.add('hidden');
    refreshAllTexts();
    refreshAllDevices();
});
document.getElementById('closeLanguageModalBtn2').addEventListener('click', function() {
    document.getElementById('languageModal').classList.add('hidden');
    refreshAllTexts();
    refreshAllDevices();
});
document.getElementById('languageModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
        refreshAllTexts();
        refreshAllDevices();
    }
});

// About modal
document.getElementById('aboutBtn').addEventListener('click', function() {
    document.getElementById('aboutModal').classList.remove('hidden');
});
document.getElementById('closeAboutBtn').addEventListener('click', function() {
    document.getElementById('aboutModal').classList.add('hidden');
});
document.getElementById('aboutModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

// Language switch
document.getElementById('languageSelect').addEventListener('change', function(e) {
    switchLanguage(e.target.value);
});

renderImageBankUI();
renderTextBankUI();
updateTextKeySelects();
applyGlobalBackground();
renderLayout();
// Save initial state for undo
setTimeout(function() { saveHistory(); }, 100);

// ==========================================
// 6. PROJECT EXPORT / IMPORT
// ==========================================
function exportProjectToJSON() {
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

    var nameInput = document.getElementById('projectNameInput');
    var rawName = nameInput ? nameInput.value.trim() : '';
    var projectName = rawName || 'project';
    var safeProjectName = projectName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();

    var project = {
        version: 1,
        name: projectName,
        timestamp: new Date().toISOString(),
        screensData: screensData.map(function(s) { return { id: s.id, color: s.color }; }),
        imageBank: imageBank,
        textBank: textBank,
        languages: languages,
        currentLanguage: currentLanguage,
        globalBgColor: globalBgColor,
        bgMode: bgMode,
        gradColor1: gradColor1,
        gradColor2: gradColor2,
        gradAngle: gradAngle,
        elements: elements
    };

    var blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = `openscreenshots_${safeProjectName}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importProjectFromJSON(jsonString) {
    var project;
    try {
        project = JSON.parse(jsonString);
    } catch (e) {
        alert('Invalid JSON file.'); return;
    }
    if (!project.version || !project.screensData) {
        alert('Invalid project file format.'); return;
    }

    // Clear current state
    canvas.clear();
    bgImageObject = null;

    // Restore state
    var nameInput = document.getElementById('projectNameInput');
    if (nameInput) nameInput.value = project.name || 'Project';
    imageBank = project.imageBank || {};
    textBank = project.textBank || {};
    languages = project.languages || ['en'];
    currentLanguage = project.currentLanguage || 'en';
    globalBgColor = project.globalBgColor || '#e2e8f0';
    bgMode = project.bgMode || 'solid';
    gradColor1 = project.gradColor1 || '#6366f1';
    gradColor2 = project.gradColor2 || '#ec4899';
    gradAngle = project.gradAngle !== undefined ? project.gradAngle : 180;

    // Restore screens
    screensData = project.screensData.map(function(s) { return { id: s.id, color: s.color, obj: null }; });

    // Sync background UI
    document.getElementById('globalBgColor').value = globalBgColor;
    document.getElementById('gradColor1').value = gradColor1;
    document.getElementById('gradColor2').value = gradColor2;
    document.getElementById('gradAngle').value = gradAngle;
    document.getElementById('gradAngleLabel').textContent = gradAngle + '\u00b0';
    if (bgMode === 'gradient') {
        document.getElementById('bgModeGradient').click();
    } else {
        document.getElementById('bgModeSolid').click();
    }
    applyGlobalBackground();

    // Rebuild language UI
    var sel = document.getElementById('languageSelect');
    sel.innerHTML = '';
    languages.forEach(function(lang) {
        var info = getLangInfo(lang);
        var opt = document.createElement('option');
        opt.value = lang;
        opt.textContent = info.flag + ' ' + lang.toUpperCase();
        sel.appendChild(opt);
    });
    sel.value = currentLanguage;

    // Render layout first to create screens and clipPath
    renderLayout();

    // Restore elements
    var elementsToLoad = project.elements || [];
    
    // BACKWARD COMPATIBILITY: Fix older JSONs exported before strict coordinate locking
    if (elementsToLoad.length > 0) {
        var minLeft = Math.min(...elementsToLoad.map(function(e) { return e.left || 0; }));
        var logicalW = (screensData.length || 1) * SCREEN_W + ((screensData.length || 1) - 1) * GAP + 100;
        if (minLeft > logicalW - 50) {
            // Elements are completely off-screen to the right! Calculate a shift to bring them to screen 1 (startX=50)
            var inferredShift = minLeft - 100; // Place nearest element at X=100
            elementsToLoad.forEach(function(e) {
                if (e.left !== undefined) e.left -= inferredShift;
            });
            console.log('[SYNC] 🛠 Legacy template detected off-screen. Shifted coordinates left by', inferredShift, 'px to rescue elements.');
        }
    }

    (async function() {
        for (const data of elementsToLoad) {
            await new Promise(function(resolve) {
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
                var shadowObj = data.shadow ? new fabric.Shadow(data.shadow) : null;
                var text = new fabric.IText(data.text || 'Text', {
                    left: data.left, top: data.top,
                    scaleX: data.scaleX, scaleY: data.scaleY,
                    angle: data.angle,
                    originX: data.originX || 'left', originY: data.originY || 'top',
                    flipX: !!data.flipX, flipY: !!data.flipY,
                    fontFamily: data.fontFamily || 'system-ui',
                    fill: data.fill || '#ffffff',
                    fontSize: data.fontSize || 42,
                    fontWeight: data.fontWeight || '700',
                    textAlign: data.textAlign || 'center',
                    shadow: shadowObj,
                    isDesignElement: true,
                    textKey: data.textKey || null,
                    clipPath: globalClipPath,
                    borderColor: '#6366f1', cornerColor: '#6366f1',
                    cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
                });
                text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
                applyLock(text);
                canvas.add(text);
                resolve();
            } else if (data.elementType === '3ddevice') {
                // Re-render 3D device
                loadLocal3DModel(data.modelPath, async function() {
                    phoneModel.rotation.set(
                        (data.rotX || 0) * Math.PI,
                        (data.rotY || 0) * Math.PI,
                        (data.rotZ || 0) * Math.PI
                    );
                    phoneBodyMeshes.forEach(function(mesh) {
                        if (mesh.material && mesh.material.color) mesh.material.color.set(data.frameColor || '#1e293b');
                    });
                    var texUrl = data.imageKey ? getImageForKey(data.imageKey) : null;
                    await applyTextureToScreen(texUrl);
                    var dataURL = render3DToImage();
                    if (dataURL) {
                        fabric.Image.fromURL(dataURL, function(img) {
                            img.set({
                                left: data.left, top: data.top,
                                scaleX: data.scaleX, scaleY: data.scaleY,
                                angle: data.angle,
                                originX: data.originX || 'left', originY: data.originY || 'top',
                                flipX: !!data.flipX, flipY: !!data.flipY,
                                isDesignElement: true, is3DModel: true,
                                modelPath: data.modelPath,
                                imageKey: data.imageKey,
                                frameColor: data.frameColor || '#1e293b',
                                is2DMode: data.is2DMode || false,
                                rotX: data.rotX || 0, rotY: data.rotY || 0, rotZ: data.rotZ || 0,
                                clipPath: globalClipPath,
                                borderColor: '#6366f1', cornerColor: '#6366f1',
                                cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
                            });
                            img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
                            applyLock(img);
                            canvas.add(img);
                            resolve();
                        });
                    } else { resolve(); }
                });
            } else if (data.elementType === 'bgimage') {
                fabric.Image.fromURL(data.src, function(img) {
                    img.set({
                        left: data.left, top: data.top,
                        scaleX: data.scaleX, scaleY: data.scaleY,
                        angle: data.angle,
                        originX: data.originX || 'left', originY: data.originY || 'top',
                        flipX: !!data.flipX, flipY: !!data.flipY,
                        isDesignElement: true, isBackgroundImage: true,
                        clipPath: globalClipPath,
                        borderColor: '#6366f1', cornerColor: '#6366f1',
                        cornerStyle: 'circle', cornerSize: 10, transparentCorners: false, padding: 4
                    });
                    bgImageObject = img;
                    applyLock(img);
                    canvas.add(img);
                    reorderBgImage();
                    document.getElementById('clearBgImageBtn').classList.remove('hidden');
                    resolve();
                });
            } else if (data.elementType === 'freeimage') {
                fabric.Image.fromURL(data.src, function(img) {
                    img.set({
                        left: data.left, top: data.top,
                        scaleX: data.scaleX, scaleY: data.scaleY,
                        angle: data.angle,
                        originX: data.originX || 'left', originY: data.originY || 'top',
                        flipX: !!data.flipX, flipY: !!data.flipY,
                        isDesignElement: true, isFreeImage: true,
                        clipPath: globalClipPath,
                        borderColor: '#6366f1', cornerColor: '#6366f1',
                        cornerStyle: 'circle', cornerSize: 10, transparentCorners: false, padding: 4
                    });
                    applyLock(img);
                    canvas.add(img);
                    resolve();
                });
            } else {
                resolve();
            }
        });
        }

        renderLayout();
        renderImageBankUI();
        renderTextBankUI();
        updateKeySelects();
        updateTextKeySelects();
        canvas.renderAll();
    })();
}

function newProject() {
    if (!confirm('Are you sure you want to start a new project? Unsaved changes will be lost.')) return;
    canvas.clear();
    bgImageObject = null;
    var nameInput = document.getElementById('projectNameInput');
    if (nameInput) nameInput.value = 'Project';
    imageBank = {};
    textBank = {};
    languages = ['en'];
    currentLanguage = 'en';
    globalBgColor = '#e2e8f0';
    screensData = [{ id: 'screen_1', color: '#ffffff', obj: null }];

    document.getElementById('globalBgColor').value = globalBgColor;
    document.getElementById('clearBgImageBtn').classList.add('hidden');

    var sel = document.getElementById('languageSelect');
    sel.innerHTML = '<option value="en">🇺🇸 EN</option>';
    sel.value = 'en';

    applyGlobalBackground();
    renderLayout();
    renderImageBankUI();
    renderTextBankUI();
    updateKeySelects();
    updateTextKeySelects();
}

document.getElementById('newProjectBtn').addEventListener('click', newProject);
document.getElementById('exportProjectBtn').addEventListener('click', exportProjectToJSON);
document.getElementById('importProjectInput').addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        importProjectFromJSON(ev.target.result);
    };
    reader.readAsText(file);
    this.value = '';
});

// ==========================================
// 9. DESIGN API (for AI / MCP integration)
// ==========================================
window.DesignAPI = {
    // ---- BACKGROUND ----
    setBackground: function(opts) {
        if (opts.type === 'gradient') {
            bgMode = 'gradient';
            gradColor1 = opts.color1 || gradColor1;
            gradColor2 = opts.color2 || gradColor2;
            gradAngle = opts.angle !== undefined ? opts.angle : gradAngle;
            document.getElementById('bgModeGradient').click();
            document.getElementById('gradColor1').value = gradColor1;
            document.getElementById('gradColor2').value = gradColor2;
            document.getElementById('gradAngle').value = gradAngle;
            document.getElementById('gradAngleLabel').textContent = gradAngle + '\u00b0';
        } else {
            bgMode = 'solid';
            globalBgColor = opts.color || globalBgColor;
            document.getElementById('bgModeSolid').click();
            document.getElementById('globalBgColor').value = globalBgColor;
        }
        applyGlobalBackground();
        return { success: true, bgMode: bgMode };
    },

    // ---- TEXT ----
    addText: function(opts) {
        var t = new fabric.IText(opts.text || 'Text', {
            left: opts.x || canvas.width / 2 - 100,
            top: opts.y || 200,
            fontSize: opts.fontSize || 42,
            fontFamily: opts.fontFamily || '"Inter", sans-serif',
            fontWeight: opts.fontWeight || '600',
            fontStyle: opts.fontStyle || 'normal',
            fill: opts.fill || '#ffffff',
            textAlign: opts.textAlign || 'left',
            shadow: opts.shadow || '0 2px 10px rgba(0,0,0,0.3)',
            opacity: opts.opacity !== undefined ? opts.opacity : 1,
            isDesignElement: true,
            textKey: opts.textKey || '',
            clipPath: globalClipPath,
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
        var type = opts.type || 'rect';
        var props = {
            left: opts.x || canvas.width / 2 - 60,
            top: opts.y || 200,
            fill: opts.fill || '#6366f1',
            stroke: opts.stroke || '',
            strokeWidth: opts.strokeWidth || 0,
            opacity: opts.opacity !== undefined ? opts.opacity : 1,
            isDesignElement: true, isShape: true, shapeType: type,
            clipPath: globalClipPath,
            borderColor: '#6366f1', cornerColor: '#6366f1',
            cornerStyle: 'circle', cornerSize: 10, transparentCorners: false
        };
        var obj;
        if (type === 'rect') {
            obj = new fabric.Rect(Object.assign({
                width: opts.width || 120, height: opts.height || 90,
                rx: opts.rx || 0, ry: opts.ry || 0
            }, props));
        } else if (type === 'circle') {
            obj = new fabric.Circle(Object.assign({
                radius: opts.radius || 50
            }, props));
        } else if (type === 'line') {
            obj = new fabric.Line([0, 0, opts.width || 200, 0], Object.assign({
                stroke: opts.stroke || opts.fill || '#6366f1', strokeWidth: opts.strokeWidth || 3
            }, props));
        } else if (type === 'arrow') {
            var w = opts.width || 160;
            obj = new fabric.Path('M 0 20 L ' + w + ' 20 L ' + (w - 20) + ' 0 M ' + w + ' 20 L ' + (w - 20) + ' 40', Object.assign({
                stroke: opts.stroke || opts.fill || '#6366f1', strokeWidth: opts.strokeWidth || 4,
                fill: '', strokeLineCap: 'round', strokeLineJoin: 'round'
            }, props));
        }
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

    removeScreen: function(index) {
        if (screensData.length <= 1) return { success: false, error: 'Cannot remove last screen' };
        var idx = index !== undefined ? index : screensData.length - 1;
        if (screensData[idx] && screensData[idx].obj) canvas.remove(screensData[idx].obj);
        screensData.splice(idx, 1);
        canvas.discardActiveObject();
        renderLayout();
        return { success: true, screenCount: screensData.length };
    },

    setScreenColor: function(index, color) {
        if (!screensData[index]) return { success: false, error: 'Invalid index' };
        screensData[index].color = color;
        renderLayout();
        return { success: true };
    },

    setScreenPreset: function(preset) {
        if (!SCREEN_PRESETS[preset]) return { success: false, error: 'Invalid preset' };
        document.getElementById('screenSizePreset').value = preset;
        applyScreenPreset(preset);
        return { success: true, preset: preset, dimensions: SCREEN_PRESETS[preset] };
    },

    // ---- TEMPLATES ----
    applyTemplate: async function(name) {
        const list = await loadTemplateList();
        const tmpl = list.find(function(t) { return t.name.toLowerCase() === name.toLowerCase(); });
        if (!tmpl) return { success: false, error: 'Template not found', available: list.map(function(t) { return t.name; }) };
        await applyTemplateFromFile(tmpl.href);
        return { success: true, template: tmpl.name };
    },

    listTemplates: async function() {
        const list = await loadTemplateList();
        return list.map(function(t) { return { name: t.name, filename: t.filename }; });
    },

    // ---- ELEMENTS ----
    clearElements: function() {
        canvas.getObjects().filter(function(o) { return o.isDesignElement; }).forEach(function(o) { canvas.remove(o); });
        renderLayerPanel();
        canvas.renderAll();
        return { success: true };
    },

    getElements: function() {
        return canvas.getObjects().filter(function(o) { return o.isDesignElement; }).map(function(o, i) {
            return {
                index: i, type: o.type, x: Math.round(o.left), y: Math.round(o.top),
                width: Math.round(o.getScaledWidth()), height: Math.round(o.getScaledHeight()),
                text: o.text || null, fill: o.fill, opacity: o.opacity,
                visible: o.visible !== false, locked: !!o.lockMovementX,
                isShape: !!o.isShape, is3DModel: !!o.is3DModel, isFreeImage: !!o.isFreeImage
            };
        });
    },

    selectElement: function(index) {
        var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; });
        if (!elements[index]) return { success: false, error: 'Invalid index' };
        canvas.setActiveObject(elements[index]);
        canvas.renderAll();
        return { success: true };
    },

    moveElement: function(index, x, y) {
        var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; });
        if (!elements[index]) return { success: false };
        elements[index].set({ left: x, top: y });
        elements[index].setCoords();
        canvas.renderAll();
        return { success: true };
    },

    scaleElement: function(index, scaleX, scaleY) {
        var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; });
        if (!elements[index]) return { success: false };
        elements[index].set({ scaleX: scaleX, scaleY: scaleY || scaleX });
        elements[index].setCoords();
        canvas.renderAll();
        return { success: true };
    },

    deleteElement: function(index) {
        var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; });
        if (!elements[index]) return { success: false };
        canvas.remove(elements[index]);
        renderLayerPanel();
        canvas.renderAll();
        return { success: true };
    },

    setElementOpacity: function(index, opacity) {
        var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; });
        if (!elements[index]) return { success: false };
        elements[index].set('opacity', opacity);
        canvas.renderAll();
        return { success: true };
    },

    lockElement: function(index, lock) {
        var elements = canvas.getObjects().filter(function(o) { return o.isDesignElement; });
        if (!elements[index]) return { success: false };
        var locked = lock !== undefined ? lock : true;
        elements[index].set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked });
        canvas.renderAll();
        return { success: true };
    },

    // ---- PROJECT ----
    getState: function() {
        return {
            screenCount: screensData.length,
            screens: screensData.map(function(s, i) { return { index: i, id: s.id, color: s.color }; }),
            bgMode: bgMode,
            bgColor: globalBgColor,
            gradColor1: gradColor1, gradColor2: gradColor2, gradAngle: gradAngle,
            currentPreset: currentPreset,
            presetDimensions: SCREEN_PRESETS[currentPreset],
            languages: languages,
            currentLanguage: currentLanguage,
            elementCount: canvas.getObjects().filter(function(o) { return o.isDesignElement; }).length,
            canvasSize: { width: canvas.width, height: canvas.height },
            screenSize: { w: SCREEN_W, h: SCREEN_H }
        };
    },

    exportProject: function() {
        exportProjectToJSON();
        return { success: true };
    },

    newProject: function() {
        newProject();
        return { success: true };
    },

    // ---- LANGUAGE ----
    setLanguage: function(lang) {
        if (languages.indexOf(lang) === -1) return { success: false, error: 'Language not in project' };
        switchLanguage(lang);
        return { success: true, language: lang };
    },

    // ---- RENDERING ----
    refresh: function() {
        renderLayout();
        canvas.renderAll();
        return { success: true };
    }
};

console.log('%c🎨 DesignAPI ready! Use window.DesignAPI to control the editor programmatically.', 'color: #6366f1; font-weight: bold; font-size: 14px;');
console.log('%cAvailable methods:', 'color: #94a3b8;', Object.keys(window.DesignAPI).join(', '));