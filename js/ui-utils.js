import { 
    imageBank, textBank, languages, currentLanguage, 
    getLangInfo, setTextBank, getImageForKey, getTextForKey, setTextForKey, getTextStyleForKey,
    ALL_LANGUAGES, setCurrentLanguage, setLanguages
} from './state.js';
import { getCanvas, renderLayout } from './canvas-core.js';
import { syncAndRenderActiveDevice } from './elements-manager.js';

export function addImageBankKey(name) {
    if (!name) {
        var tempKey = '__new_' + Date.now();
        imageBank[tempKey] = {};
        renderImageBankUI(tempKey);
        updateKeySelects();
        return true;
    }
    name = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!name || (imageBank[name] !== undefined && !name.startsWith('__new_'))) {
        alert('Key already exists or is invalid.');
        return false;
    }
    if (!imageBank[name]) imageBank[name] = {};
    renderImageBankUI();
    updateKeySelects();
    return true;
}

export function removeImageBankKey(name) {
    delete imageBank[name];
    const canvas = getCanvas();
    if (canvas) {
        canvas.getObjects().forEach(obj => {
            if (obj.imageKey === name) obj.imageKey = null;
        });
    }
    renderImageBankUI();
    updateKeySelects();
}

export function setImageForKey(key, lang, file, skipRender = false) {
    return new Promise(resolve => {
        var reader = new FileReader();
        reader.onload = e => {
            if (!imageBank[key]) imageBank[key] = {};
            imageBank[key][lang] = e.target.result;
            if (!skipRender) renderImageBankUI();
            resolve();
        };
        reader.readAsDataURL(file);
    });
}

export async function bulkUploadImages(files) {
    if (!files || files.length === 0) {
        console.warn("No files selected for bulk upload.");
        return;
    }
    
    // Convert to a real array of file references immediately
    const fileArray = Array.from(files);
    console.log(`[V1.2.5] Starting bulk upload for ${fileArray.length} files...`);
    
    let anyLanguageAdded = false;
    let anyKeyAdded = false;

    for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
            const fullName = file.name;
            const lastDot = fullName.lastIndexOf('.');
            const nameWithoutExt = lastDot !== -1 ? fullName.substring(0, lastDot) : fullName;
            
            let lang = currentLanguage;
            let key = nameWithoutExt;

            console.log(`File [${i+1}/${fileArray.length}]: Analyzing "${fullName}"...`);

            // Parsing lang_key pattern
            const underscoreIdx = nameWithoutExt.indexOf('_');
            if (underscoreIdx !== -1) {
                const potentialLang = nameWithoutExt.substring(0, underscoreIdx).toLowerCase();
                const potentialKey = nameWithoutExt.substring(underscoreIdx + 1);
                
                const isKnownLang = ALL_LANGUAGES.some(l => l.code === potentialLang);
                if (isKnownLang) {
                    lang = potentialLang;
                    key = potentialKey;
                }
            }

            key = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            if (!key) {
                console.warn(`File "${fullName}" results in empty key, skipping.`);
                continue;
            }

            // Auto-update languages/keys in current state
            if (!languages.includes(lang)) {
                console.log(`Auto-adding language: ${lang}`);
                languages.push(lang);
                anyLanguageAdded = true;
            }

            if (!imageBank[key]) {
                console.log(`Auto-creating new key: ${key}`);
                imageBank[key] = {};
                anyKeyAdded = true;
            }

            console.log(`Processing: "${fullName}" -> [key: ${key}, lang: ${lang}]`);
            // Store as base64 - true for skipRender inside batch
            await setImageForKey(key, lang, file, true);
            console.log(`Finished processing: "${fullName}"`);

        } catch (fileErr) {
            console.error(`Error processing individual file "${file.name}":`, fileErr);
        }
    }

    try {
        if (anyLanguageAdded) {
            renderLanguageSelector();
            renderLanguageGrid();
        }
        
        renderImageBankUI();
        if (anyKeyAdded) updateKeySelects();
        
        console.log("Bulk upload complete. Refreshing 3D view...");
        await syncAndRenderActiveDevice();
        console.log("3D View sync complete.");
    } catch (finalErr) {
        console.error("Error finalizing UI render after bulk upload:", finalErr);
    }
}

export function addLanguage(code) {
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

export function addTextBankKey(name) {
    if (!name) {
        var tempKey = '__new_' + Date.now();
        textBank[tempKey] = {};
        renderTextBankUI(tempKey);
        updateTextKeySelects();
        return true;
    }
    name = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!name || (textBank[name] !== undefined && !name.startsWith('__new_'))) {
        alert('Key already exists or is invalid.');
        return false;
    }
    if (!textBank[name]) textBank[name] = {};
    renderTextBankUI();
    updateTextKeySelects();
    return true;
}

export function removeTextBankKey(name) {
    delete textBank[name];
    const canvas = getCanvas();
    if (canvas) {
        canvas.getObjects().forEach(obj => {
            if (obj.textKey === name) obj.textKey = null;
        });
    }
    renderTextBankUI();
    updateTextKeySelects();
}

export function updateKeySelects() {
    var keys = Object.keys(imageBank);
    var options = '<option value="">(No screenshot)</option>' +
        keys.map(k => `<option value="${k}">${k}</option>`).join('');
    var s1 = document.getElementById('deviceScreenshotKey');
    if (s1) s1.innerHTML = options;
    var s2 = document.getElementById('deviceKeySelect');
    if (s2) s2.innerHTML = options;
}

export function updateTextKeySelects() {
    var keys = Object.keys(textBank);
    var options = '<option value="">(Custom)</option>' +
        keys.map(k => `<option value="${k}">${k}</option>`).join('');
    var s = document.getElementById('addTextKeySelect');
    if (s) s.innerHTML = options;
}

export function renderLanguageSelector() {
    var select = document.getElementById('languageSelect');
    if (!select) return;
    select.innerHTML = languages.map(l => {
        var info = getLangInfo(l);
        return `<option value="${l}"${l === currentLanguage ? ' selected' : ''}>${info.flag} ${l.toUpperCase()}</option>`;
    }).join('');
}

export function renderImageBankUI(editingKey) {
    var container = document.getElementById('imageBankTableContainer');
    if (!container) return;
    var keys = Object.keys(imageBank);
    if (keys.length === 0) {
        container.innerHTML = '<div class="p-10 text-center"><p class="text-sm text-slate-400 italic">No keys yet. Add one to get started.</p></div>';
        return;
    }

    var headerCells = '<th class="pl-3">Key</th>' +
        languages.map(lang => {
            var info = getLangInfo(lang);
            return `<th>${info.flag}<br>${lang.toUpperCase()}</th>`;
        }).join('') + '<th></th>';

    var rows = keys.map(key => {
        var isEditing = (key === editingKey);
        var keyCell = isEditing 
            ? `<td class="pl-3"><input type="text" class="text-xs font-mono font-bold text-slate-700 border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" id="inlineKeyInput" placeholder="key_name" autofocus></td>`
            : `<td class="pl-3"><span class="text-xs font-mono font-bold text-slate-700">${key}</span></td>`;
        
        var cells = keyCell +
            languages.map(lang => {
                var src = imageBank[key][lang];
                return `<td><label class="bank-thumb border ${src ? 'border-indigo-300 bg-indigo-50' : 'border-dashed border-slate-300 bg-slate-50'}">
                    ${src ? `<img src="${src}">` : '<span class="text-slate-400 text-lg">+</span>'}
                    <input type="file" accept="image/*" class="hidden" data-bank-key="${key}" data-bank-lang="${lang}">
                </label></td>`;
            }).join('') +
            `<td><button class="text-red-400 hover:text-red-600 text-sm font-bold px-1" data-delete-key="${key}" title="Delete">×</button></td>`;
        return `<tr>${cells}</tr>`;
    }).join('');

    container.innerHTML = `<table class="bank-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;

    // Handle inline key editing
    var inlineInput = document.getElementById('inlineKeyInput');
    if (inlineInput && editingKey) {
        inlineInput.focus();
        const confirmKey = () => {
            var newName = inlineInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            var data = imageBank[editingKey];
            delete imageBank[editingKey];
            if (newName && !imageBank[newName]) imageBank[newName] = data || {};
            renderImageBankUI();
            updateKeySelects();
        };
        inlineInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmKey(); }
            if (e.key === 'Escape') { delete imageBank[editingKey]; renderImageBankUI(); updateKeySelects(); }
        });
        inlineInput.addEventListener('blur', confirmKey);
    }

    container.querySelectorAll('input[data-bank-key]').forEach(input => {
        input.addEventListener('change', function() {
            var file = this.files[0]; if (!file) return;
            setImageForKey(this.dataset.bankKey, this.dataset.bankLang, file).then(() => {
                const canvas = getCanvas();
                var active = canvas.getActiveObject();
                if (active && active.imageKey === this.dataset.bankKey) syncAndRenderActiveDevice();
            });
        });
    });
    container.querySelectorAll('button[data-delete-key]').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm(`Delete key "${this.dataset.deleteKey}"?`)) removeImageBankKey(this.dataset.deleteKey);
        });
    });
}

export function renderTextBankUI(editingKey) {
    var container = document.getElementById('textBankTableContainer');
    if (!container) return;
    var keys = Object.keys(textBank);
    if (keys.length === 0) {
        container.innerHTML = '<div class="p-10 text-center"><p class="text-sm text-slate-400 italic">No text keys yet. Add one to get started.</p></div>';
        return;
    }

    var headerCells = '<th class="pl-3">Key</th>' +
        languages.map(lang => `<th style="min-width:140px">${getLangInfo(lang).flag} ${lang.toUpperCase()}</th>`).join('') + '<th></th>';

    var rows = keys.map(key => {
        var isEditing = (key === editingKey);
        var keyCell = isEditing
            ? `<td class="pl-3"><input type="text" class="text-xs font-mono font-bold text-slate-700 border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" id="inlineTextKeyInput" placeholder="key_name" autofocus></td>`
            : `<td class="pl-3"><span class="text-xs font-mono font-bold text-slate-700">${key}</span></td>`;
        
        var cells = keyCell +
            languages.map(lang => {
                var data = textBank[key][lang] || '';
                var val = (typeof data === 'object' ? data.text : data).replace(/"/g, '&quot;');
                var fontSize = (typeof data === 'object' ? data.fontSize : '') || '';
                var fontWeight = (typeof data === 'object' ? data.fontWeight : '') || '';
                
                return `<td>
                    <textarea class="text-cell" data-text-key="${key}" data-text-lang="${lang}" placeholder="...">${val}</textarea>
                    <div class="flex gap-1 mt-1">
                        <input type="number" class="style-input w-full" placeholder="Size" title="Font Size" 
                               data-text-key="${key}" data-text-lang="${lang}" data-style="fontSize" value="${fontSize}">
                        <select class="style-input w-full" title="Font Weight" 
                                data-text-key="${key}" data-text-lang="${lang}" data-style="fontWeight">
                            <option value="">Weight</option>
                            <option value="normal" ${fontWeight === 'normal' ? 'selected' : ''}>400</option>
                            <option value="600" ${fontWeight === '600' ? 'selected' : ''}>600</option>
                            <option value="700" ${fontWeight === '700' ? 'selected' : ''}>700</option>
                            <option value="900" ${fontWeight === '900' ? 'selected' : ''}>900</option>
                        </select>
                    </div>
                </td>`;
            }).join('') +
            `<td><button class="text-red-400 hover:text-red-600 text-sm font-bold px-1" data-delete-text-key="${key}" title="Delete">×</button></td>`;
        return `<tr>${cells}</tr>`;
    }).join('');

    container.innerHTML = `<table class="bank-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;

    var inlineInput = document.getElementById('inlineTextKeyInput');
    if (inlineInput && editingKey) {
        inlineInput.focus();
        const confirmTextKey = () => {
            var newName = inlineInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            var data = textBank[editingKey];
            delete textBank[editingKey];
            if (newName && !textBank[newName]) textBank[newName] = data || {};
            renderTextBankUI();
            updateTextKeySelects();
        };
        inlineInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmTextKey(); }
            if (e.key === 'Escape') { delete textBank[editingKey]; renderTextBankUI(); updateTextKeySelects(); }
        });
        inlineInput.addEventListener('blur', confirmTextKey);
    }

    container.querySelectorAll('textarea[data-text-key]').forEach(ta => {
        ta.addEventListener('input', function() {
            setTextForKey(this.dataset.textKey, this.dataset.textLang, this.value);
        });
        ta.addEventListener('blur', refreshAllTexts);
    });

    container.querySelectorAll('.style-input').forEach(input => {
        input.addEventListener('change', function() {
            const key = this.dataset.textKey;
            const lang = this.dataset.textLang;
            const styleProp = this.dataset.style;
            const value = this.value;
            
            setTextForKey(key, lang, getTextForKey(key), { [styleProp]: value });
            refreshAllTexts();
        });
    });

    container.querySelectorAll('button[data-delete-text-key]').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm(`Delete text key "${this.dataset.deleteTextKey}"?`)) removeTextBankKey(this.dataset.deleteTextKey);
        });
    });
}

export function refreshAllTexts() {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.getObjects().forEach(obj => {
        if (obj.textKey && obj.isDesignElement) {
            var newText = getTextForKey(obj.textKey);
            if (newText !== null) {
                const styles = getTextStyleForKey(obj.textKey, currentLanguage);
                const updates = { text: newText };
                if (styles.fontSize) updates.fontSize = parseInt(styles.fontSize);
                if (styles.fontWeight) updates.fontWeight = styles.fontWeight;
                
                obj.set(updates);
            }
        }
    });
    canvas.renderAll();
}

export function renderLanguageGrid() {
    var grid = document.getElementById('languageGrid');
    if (!grid) return;
    grid.innerHTML = ALL_LANGUAGES.map(lang => {
        var isAdded = languages.includes(lang.code);
        return `<button class="lang-chip flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-left ${isAdded ? 'added border-indigo-300' : 'border-slate-200 bg-white text-slate-600'}" data-lang-code="${lang.code}">
            <span class="text-base">${lang.flag}</span>
            <span class="flex-1 truncate">${lang.name}</span>
            ${isAdded ? '<span class="text-indigo-500 font-bold">✓</span>' : ''}
        </button>`;
    }).join('');

    grid.querySelectorAll('button[data-lang-code]').forEach(btn => {
        btn.addEventListener('click', function() {
            var code = this.dataset.langCode;
            if (languages.includes(code)) {
                if (languages.length <= 1) { alert("Can't remove the last language."); return; }
                setLanguages(languages.filter(l => l !== code));
                Object.keys(imageBank).forEach(k => delete imageBank[k][code]);
                Object.keys(textBank).forEach(k => delete textBank[k][code]);
                if (currentLanguage === code) setCurrentLanguage(languages[0]);
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

export function getElementLabel(obj) {
    if (obj.type === 'i-text') return '\u270d\ufe0f ' + (obj.text || 'Text').substring(0, 15);
    if (obj.is3DModel) return '\ud83d\udcf1 3D Device';
    if (obj.isFreeImage) return '\ud83d\uddbc Image';
    if (obj.isBackgroundImage) return '\ud83c\udf05 Background';
    if (obj.isLaurel) return '🌿 Laurel Wreath';
    if (obj.isShape) {
        if (obj.shapeType === 'rect') return '\u25a0 Rectangle';
        if (obj.shapeType === 'circle') return '\u25cf Circle';
        if (obj.shapeType === 'line') return '\u2015 Line';
        if (obj.shapeType === 'arrow') return '\u2794 Arrow';
        return '\u25a0 Shape';
    }
    return '\ud83d\udce6 Element';
}

export function renderLayerPanel() {
    var list = document.getElementById('layerList');
    const canvas = getCanvas();
    if (!list || !canvas) return;
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

