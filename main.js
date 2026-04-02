const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let mainWindow;
let db;

function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'projects.db');
    db = new Database(dbPath);
    console.log('[SQLite] Connected at:', dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
            config TEXT,
            image_bank TEXT,
            text_bank TEXT,
            thumbnail TEXT
        )
    `);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'img/favicon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Option to serve via local server if needed, but here we use file protocol with proper permissions
    mainWindow.loadFile('index.html');
    
    // Open DevTools if in development
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('save-project', (event, project) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO projects (id, name, last_modified, config, image_bank, text_bank, thumbnail)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                last_modified = CURRENT_TIMESTAMP,
                config = excluded.config,
                image_bank = excluded.image_bank,
                text_bank = excluded.text_bank,
                thumbnail = excluded.thumbnail
        `);
        
        stmt.run(
            project.id,
            project.name,
            JSON.stringify(project.config),
            JSON.stringify(project.imageBank),
            JSON.stringify(project.textBank),
            project.thumbnail || null
        );
        return { success: true };
    } catch (err) {
        console.error('[SQLite Error] Save failed:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-projects', () => {
    try {
        return db.prepare('SELECT id, name, last_modified, thumbnail FROM projects ORDER BY last_modified DESC').all();
    } catch (err) {
        console.error('[SQLite Error] Fetch failed:', err);
        return [];
    }
});

ipcMain.handle('load-project', (event, id) => {
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (project) {
            project.config = JSON.parse(project.config);
            project.imageBank = JSON.parse(project.image_bank);
            project.textBank = JSON.parse(project.text_bank);
        }
        return project;
    } catch (err) {
        console.error('[SQLite Error] Load failed:', err);
        return null;
    }
});

ipcMain.handle('delete-project', (event, id) => {
    try {
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});
