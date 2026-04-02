const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveProject: (project) => ipcRenderer.invoke('save-project', project),
    loadProject: (id) => ipcRenderer.invoke('load-project', id),
    getProjects: () => ipcRenderer.invoke('get-projects'),
    deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
    onAutoSaveRequest: (callback) => ipcRenderer.on('autosave-request', callback)
});
