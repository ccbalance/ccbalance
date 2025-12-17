const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let editorWindow;
let tray;
let commandLineArgs = [];
let pwaServer;

// 动态加载 PWA 服务器(仅在需要时加载)
function loadPWAServer() {
    if (!pwaServer) {
        try {
            pwaServer = require('./pwa-server.js');
        } catch (error) {
            console.error('Failed to load PWA server:', error);
        }
    }
    return pwaServer;
}

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    // 处理第二个实例的启动
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // 有人试图运行第二个实例，聚焦主窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.show();
            
            // 如果有命令行参数，传递给渲染进程处理
            const args = commandLine.slice(1);
            if (args.length > 0) {
                mainWindow.webContents.send('command-line-args', args);
            }
        }
    });

    app.whenReady().then(() => {
        commandLineArgs = process.argv.slice(1);
        try {
            createWindow();
            createTray();
        } catch (error) {
            console.error('Failed to initialize app windows/tray:', error);
        }
    });
}

    function getSafeAppIcon() {
        const candidates = [
            path.join(__dirname, 'assets/tray-icon.png'),
            path.join(__dirname, 'assets/icon.png')
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }

        // 1x1 透明 PNG（避免因缺失图标导致崩溃）
        return nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3WkZkAAAAASUVORK5CYII='
        );
    }

/**
 * 创建系统托盘
 */
function createTray() {
    // 托盘图标路径(fallback 到内置透明图标)
    tray = new Tray(getSafeAppIcon());
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示主窗口',
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'PWA 服务器',
            submenu: [
                {
                    label: '启动服务器',
                    click: async () => {
                        const server = loadPWAServer();
                        if (server) {
                            try {
                                await server.start();
                                if (mainWindow) {
                                    mainWindow.webContents.send('pwa-server-status-changed', server.getStatus());
                                }
                            } catch (error) {
                                console.error('Failed to start PWA server:', error);
                            }
                        }
                    }
                },
                {
                    label: '停止服务器',
                    click: async () => {
                        const server = loadPWAServer();
                        if (server) {
                            try {
                                await server.stop();
                                if (mainWindow) {
                                    mainWindow.webContents.send('pwa-server-status-changed', server.getStatus());
                                }
                            } catch (error) {
                                console.error('Failed to stop PWA server:', error);
                            }
                        }
                    }
                },
                {
                    label: '在浏览器中打开',
                    click: () => {
                        const server = loadPWAServer();
                        if (server && server.isRunning) {
                            require('electron').shell.openExternal(`http://localhost:${server.port}`);
                        }
                    }
                }
            ]
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('CCBalance');
    tray.setContextMenu(contextMenu);
    
    // 双击托盘图标显示主窗口
    tray.on('double-click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

/**
 * 创建关卡编辑器窗口
 */
function createEditorWindow(levelData) {
    if (editorWindow) {
        editorWindow.focus();
        return;
    }

    editorWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        parent: mainWindow,
        modal: false,
        frame: false,
        backgroundColor: '#0a0a1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: getSafeAppIcon()
    });

    editorWindow.loadFile('editor.html');

    // 窗口加载完成后发送关卡数据
    editorWindow.webContents.once('did-finish-load', () => {
        if (levelData) {
            editorWindow.webContents.send('load-level-data', levelData);
        }
    });

    editorWindow.on('closed', () => {
        editorWindow = null;
    });
}

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
        icon: getSafeAppIcon()
    });

    mainWindow.loadFile('index.html');

    // 开发模式打开DevTools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // 窗口加载完成后发送命令行参数
    mainWindow.webContents.once('did-finish-load', () => {
        if (commandLineArgs.length > 0) {
            mainWindow.webContents.send('command-line-args', commandLineArgs);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

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
ipcMain.handle('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
});

ipcMain.handle('maximize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});

ipcMain.handle('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
});

ipcMain.handle('toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
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

// PWA 服务器控制
ipcMain.handle('pwa-server-start', async (event, port) => {
    const server = loadPWAServer();
    if (!server) {
        return { success: false, error: 'PWA server module not available' };
    }
    
    try {
        if (port && port !== server.port) {
            await server.changePort(port);
        }
        const result = await server.start();
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('pwa-server-stop', async () => {
    const server = loadPWAServer();
    if (!server) {
        return { success: false, error: 'PWA server module not available' };
    }
    
    try {
        const result = await server.stop();
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('pwa-server-status', () => {
    const server = loadPWAServer();
    if (!server) {
        return { isRunning: false, error: 'PWA server module not available' };
    }
    
    return server.getStatus();
});

ipcMain.handle('pwa-server-change-port', async (event, newPort) => {
    const server = loadPWAServer();
    if (!server) {
        return { success: false, error: 'PWA server module not available' };
    }
    
    try {
        const result = await server.changePort(newPort);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 打开关卡编辑器
ipcMain.handle('open-level-editor', (event, levelData) => {
    createEditorWindow(levelData);
    return { success: true };
});

// 保存编辑的关卡
ipcMain.handle('save-edited-level', (event, levelData) => {
    if (mainWindow) {
        mainWindow.webContents.send('level-edited', levelData);
    }
    return { success: true };
});

// 读取文件(用于创意工坊导入)
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 写入文件(用于创意工坊导出)
ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
