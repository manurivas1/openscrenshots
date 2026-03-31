import { importProjectFromJSON } from './transfer-service.js';

export async function loadTemplateList() {
    try {
        const resp = await fetch('./templates/all.json');
        if (!resp.ok) return [];
        const templates = await resp.json();
        return Array.isArray(templates) ? templates : [];
    } catch (e) {
        return [];
    }
}

export async function applyTemplateFromFile(href) {
    try {
        const resp = await fetch('./templates/' + href);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const jsonText = await resp.text();
        await importProjectFromJSON(jsonText);
        document.getElementById('templatesModal').classList.add('hidden');
    } catch (e) {
        alert('Could not load template: ' + decodeURIComponent(href) + '\n\nMake sure it exists in the templates folder.');
    }
}

export async function renderTemplateGrid() {
    var grid = document.getElementById('templateGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="text-slate-500 text-sm p-4">Loading templates...</p>';

    const templates = await loadTemplateList();

    if (templates.length === 0) {
        grid.innerHTML = '<p class="text-slate-500 text-sm p-4">No templates found. Save a project as .json in the <code>templates/</code> folder.</p>';
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
