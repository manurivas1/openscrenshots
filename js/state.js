/**
 * Global application state and shared constants.
 */

export let imageBank = {};        // { "key_name": { "en": "data:...", "es": "data:..." } }
export let textBank = {};         // { "key_name": { "en": "Hello", "es": "Hola" } }
export let elementLayouts = {};   // { "key_name": { "en": { left, top, scaleX, scaleY, angle }, "es": {...} } }
export let currentLanguage = 'en';
export let languages = ['en'];
export let screensData = [{ id: 'screen_1', color: '#ffffff', obj: null }];

export const DEVICE_CONFIG = {
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

export let currentPreset = 'iphone67';
export let SCREEN_H = 740;
export let SCREEN_W = 740 * (1284 / 2778); // Exact ratio for initial preset

export const GAP = 40;
export const START_Y = 60;
export let canvasZoom = 1.0;
export let globalClipPath = null;
export let globalBgColor = '#e2e8f0';
export let bgImageObject = null;
export let bgMode = 'solid';
export let gradColor1 = '#6366f1';
export let gradColor2 = '#ec4899';
export let gradAngle = 180;

export const SCREEN_PRESETS = {
    iphone67: { w: 1284, h: 2778, label: 'iPhone 6.7"' },
    iphone65: { w: 1242, h: 2688, label: 'iPhone 6.5"' },
    iphone55: { w: 1242, h: 2208, label: 'iPhone 5.5"' },
    ipad129:  { w: 2048, h: 2732, label: 'iPad 12.9"' },
    ipad11:   { w: 1668, h: 2388, label: 'iPad 11"' },
    custom:   { w: 1284, h: 2778, label: 'Custom' }
};


export const ALL_LANGUAGES = [
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

export function getImageForKey(key) {
    if (!key || !imageBank[key]) return null;
    return imageBank[key][currentLanguage] || imageBank[key][Object.keys(imageBank[key])[0]] || null;
}

export function getTextForKey(key) {
    if (!key || !textBank[key]) return null;
    const langData = textBank[key][currentLanguage] || textBank[key][Object.keys(textBank[key])[0]] || '';
    // Support both legacy string values and new style objects
    return typeof langData === 'object' ? langData.text : langData;
}

export function getTextStyleForKey(key, lang = currentLanguage) {
    if (!key || !textBank[key] || !textBank[key][lang]) return {};
    const langData = textBank[key][lang];
    return typeof langData === 'object' ? langData : {};
}

export function setTextForKey(key, lang, value, styles = {}) {
    if (!textBank[key]) textBank[key] = {};
    const current = typeof textBank[key][lang] === 'object' ? textBank[key][lang] : { text: textBank[key][lang] || '' };
    textBank[key][lang] = {
        ...current,
        text: value,
        ...styles
    };
}

export function setCurrentLanguage(lang) {
    currentLanguage = lang;
}

/** Save position/scale/angle of a keyed element for a specific language */
export function setElementLayout(key, lang, transform) {
    if (!key) return;
    if (!elementLayouts[key]) elementLayouts[key] = {};
    elementLayouts[key][lang] = { ...transform };
}

/** Get saved transform for a keyed element in a language. Returns null if none saved. */
export function getElementLayout(key, lang) {
    if (!key || !elementLayouts[key] || !elementLayouts[key][lang]) return null;
    return elementLayouts[key][lang];
}

/** Bulk-replace all layouts (used during project import) */
export function setElementLayouts(layouts) {
    elementLayouts = layouts || {};
}

export function setLanguages(langs) {
    languages = langs;
}

export function setImageBank(bank) {
    imageBank = bank;
}

export function setTextBank(bank) {
    textBank = bank;
}

export function setScreensData(data) {
    screensData = data;
}

export function setScreenDimensions(w, h) {
    SCREEN_W = w;
    SCREEN_H = h;
}

export function setCurrentPreset(preset) {
    currentPreset = preset;
}

export function setCanvasZoom(zoom) {
    canvasZoom = zoom;
}

export function setGlobalClipPath(path) {
    globalClipPath = path;
}

export function setGlobalBgColor(color) {
    globalBgColor = color;
}

export function setBgImageObject(obj) {
    bgImageObject = obj;
}

export function setBgMode(mode) {
    bgMode = mode;
}

export function setGradColors(c1, c2) {
    gradColor1 = c1;
    gradColor2 = c2;
}

export function setGradAngle(angle) {
    gradAngle = angle;
}

export function getLangInfo(code) {
    return ALL_LANGUAGES.find(function(l) { return l.code === code; }) || { code: code, flag: '🏳️', name: code.toUpperCase() };
}
