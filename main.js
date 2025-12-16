const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        frame: false,
        transparent: false,
        backgroundColor: '#0a0a1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    mainWindow.loadFile('index.html');

    // 开发模式打开DevTools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC处理
ipcMain.handle('minimize-window', () => {
    mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('close-window', () => {
    mainWindow.close();
});

ipcMain.handle('toggle-fullscreen', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
});

ipcMain.handle('get-app-info', () => {
    try {
        const pkgPath = path.join(app.getAppPath(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

        return {
            appVersion: app.getVersion(),
            packageVersion: pkg?.version,
            name: pkg?.name,
            dependencies: pkg?.dependencies || {},
            runtime: {
                electron: process.versions.electron,
                chrome: process.versions.chrome,
                node: process.versions.node
            }
        };
    } catch (e) {
        return { error: String(e) };
    }
});
