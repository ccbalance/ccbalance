const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const { dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let splashWindow;
let editorWindow;
let tray;
let commandLineArgs = [];
let pwaServer;

let splashSelfcheckPayload = null;

const IS_SERVER_ONLY_MODE = process.argv.includes('--pwa-server') || process.argv.includes('--server-only') || process.argv.includes('--no-window');

function hasArg(name) {
    return process.argv.includes(name);
}

function getArgValue(key) {
    const argv = process.argv;
    const eq = argv.find((a) => a.startsWith(`${key}=`));
    if (eq) return eq.substring(key.length + 1);
    const idx = argv.indexOf(key);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return null;
}

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

function getPwaTlsConfigPath() {
    try {
        return path.join(app.getPath('userData'), 'pwa-tls.json');
    } catch {
        // fallback to app dir
        return path.join(__dirname, 'pwa-tls.json');
    }
}

function readPwaTlsConfig() {
    try {
        const cfgPath = getPwaTlsConfigPath();
        if (!fs.existsSync(cfgPath)) return null;
        const raw = fs.readFileSync(cfgPath, 'utf-8');
        const cfg = JSON.parse(raw);
        if (!cfg || !cfg.filePath) return null;
        return {
            filePath: String(cfg.filePath),
            passphrase: cfg.passphrase != null ? String(cfg.passphrase) : undefined
        };
    } catch {
        return null;
    }
}

function writePwaTlsConfig(cfg) {
    const cfgPath = getPwaTlsConfigPath();
    if (!cfg) {
        try { if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath); } catch { /* ignore */ }
        return;
    }
    const data = {
        filePath: String(cfg.filePath),
        passphrase: cfg.passphrase != null ? String(cfg.passphrase) : undefined
    };
    fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), 'utf-8');
}

function applyTlsToServer(server) {
    if (!server) return;
    const cfg = readPwaTlsConfig();
    if (cfg && cfg.filePath) {
        server.setTlsConfig?.({ pfxPath: cfg.filePath, passphrase: cfg.passphrase });
    } else {
        server.clearTlsConfig?.();
    }
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

        // 若第二个实例是“启动 PWA 服务器”指令，则由主实例负责启动
        try {
            const args = commandLine.slice(1);
            const wantsServerOnly = args.includes('--pwa-server') || args.includes('--server-only') || args.includes('--no-window');
            if (wantsServerOnly) {
                const server = loadPWAServer();
                if (!server) return;

                // 若用户已配置证书，则直接启用 HTTPS
                applyTlsToServer(server);

                // 命令行覆盖：--pwa-cert <path> / --pwa-cert=<path>，可选 --pwa-cert-pass
                try {
                    const certEq = args.find((a) => a.startsWith('--pwa-cert='));
                    const certPath = certEq ? certEq.substring('--pwa-cert='.length) : (args.includes('--pwa-cert') ? args[args.indexOf('--pwa-cert') + 1] : null);
                    const passEq = args.find((a) => a.startsWith('--pwa-cert-pass='));
                    const certPass = passEq ? passEq.substring('--pwa-cert-pass='.length) : (args.includes('--pwa-cert-pass') ? args[args.indexOf('--pwa-cert-pass') + 1] : null);
                    if (certPath) {
                        server.setTlsConfig?.({ pfxPath: certPath, passphrase: certPass != null ? String(certPass) : undefined });
                    }
                } catch {
                    // ignore
                }

                const eq = args.find((a) => a.startsWith('--port='));
                const portRaw = eq ? eq.substring('--port='.length) : (args.includes('--port') ? args[args.indexOf('--port') + 1] : null);
                const port = portRaw ? Number(portRaw) : null;
                if (Number.isFinite(port) && port > 0) {
                    try { server.init(port); } catch { /* ignore */ }
                }

                if (!server.isRunning) {
                    server.start().then(() => {
                        if (mainWindow) mainWindow.webContents.send('pwa-server-status-changed', server.getStatus());
                    }).catch((e) => console.error('Failed to start PWA server:', e));
                }
            }
        } catch {
            // ignore
        }
    });

    app.whenReady().then(() => {
        commandLineArgs = process.argv.slice(1);
        try {
            // 仅启动 PWA 服务器：不创建任何窗口（用于打包后命令行运行）
            const serverOnly = hasArg('--pwa-server') || hasArg('--server-only') || hasArg('--no-window');
            if (serverOnly) {
                const server = loadPWAServer();
                if (!server) {
                    console.error('PWA server module not available');
                    return;
                }

                // 若用户已配置证书，则直接启用 HTTPS（也支持命令行覆盖）
                applyTlsToServer(server);
                const cliPfx = getArgValue('--pwa-cert');
                const cliPass = getArgValue('--pwa-cert-pass');
                if (cliPfx) {
                    try {
                        server.setTlsConfig?.({ pfxPath: cliPfx, passphrase: cliPass != null ? String(cliPass) : undefined });
                    } catch { /* ignore */ }
                }

                const portRaw = getArgValue('--port');
                const port = portRaw ? Number(portRaw) : 3000;
                if (Number.isFinite(port) && port > 0) {
                    try { server.init(port); } catch { /* ignore */ }
                }

                server.start().catch((e) => console.error('Failed to start PWA server:', e));

                // 允许 Ctrl+C 退出
                process.on('SIGINT', async () => {
                    try { await server.stop(); } catch { /* ignore */ }
                    app.quit();
                });

                return;
            }

            // 先创建 Splash，并并行预加载主窗口（但不显示），避免 Splash 结束后还要等待加载
            createSplashWindow();
            createWindow({ show: false });
            createTray();

            const minSplashMs = 2000;
            const minDelay = new Promise((r) => setTimeout(r, minSplashMs));

            const mainReady = new Promise((resolve) => {
                if (!mainWindow) return resolve();
                if (mainWindow.isDestroyed()) return resolve();
                mainWindow.once('ready-to-show', () => resolve());
                mainWindow.webContents.once('did-finish-load', () => resolve());
            });

            const splashDone = new Promise((resolve) => {
                // 兜底：避免 splash 发送失败导致卡死
                const timeout = setTimeout(() => resolve(), 6000);
                ipcMain.once('splash-selfcheck-done', (evt, payload) => {
                    splashSelfcheckPayload = payload || null;
                    clearTimeout(timeout);
                    resolve();
                });
            });

            Promise.all([minDelay, mainReady, splashDone]).then(() => {
                if (splashWindow && !splashWindow.isDestroyed()) {
                    try { splashWindow.close(); } catch { /* ignore */ }
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            });
        } catch (error) {
            console.error('Failed to initialize app windows/tray:', error);
        }
    });
}

    function getSafeAppIcon() {
        const candidates = [
            path.join(__dirname, 'assets/icon.ico'),
            path.join(__dirname, 'build/icons/icon.ico'),
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
 * 创建Splash窗口
 */
function createSplashWindow(onDone) {
    splashWindow = new BrowserWindow({
        width: 960,
        height: 540,
        frame: false,
        transparent: false,
        alwaysOnTop: true,
        center: true,
        resizable: false,
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    splashWindow.loadFile('splash.html');

    splashWindow.on('closed', () => {
        splashWindow = null;
        if (typeof onDone === 'function') onDone();
    });
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

function createWindow({ show = true } = {}) {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        frame: false,
        transparent: false,
        backgroundColor: '#0a0a1a',
        show: !!show,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: getSafeAppIcon()
    });

    mainWindow.loadFile('index.html');

    // 阻止 window.open 创建 Electron 新窗口：改为系统默认浏览器打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try { shell.openExternal(url); } catch { /* ignore */ }
        return { action: 'deny' };
    });

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
    if (IS_SERVER_ONLY_MODE) {
        // 服务器模式：无窗口也应继续运行
        return;
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (IS_SERVER_ONLY_MODE) return;
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
        applyTlsToServer(server);
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
    applyTlsToServer(server);
    return server.getStatus();
});

ipcMain.handle('pwa-server-cert-status', () => {
    const cfg = readPwaTlsConfig();
    return {
        enabled: !!(cfg && cfg.filePath),
        filePath: cfg?.filePath || null
    };
});

ipcMain.handle('pwa-server-select-cert', async () => {
    try {
        const win = BrowserWindow.getFocusedWindow() || mainWindow || splashWindow;
        const result = await dialog.showOpenDialog(win, {
            title: '选择 HTTPS 证书（PFX）',
            properties: ['openFile'],
            filters: [
                { name: 'PFX Certificate', extensions: ['pfx', 'p12'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled || !result.filePaths?.length) return { canceled: true };
        return { canceled: false, filePath: result.filePaths[0] };
    } catch (e) {
        return { canceled: true, error: String(e) };
    }
});

ipcMain.handle('pwa-server-set-cert', async (event, { filePath, passphrase } = {}) => {
    try {
        if (!filePath) return { success: false, error: 'missing filePath' };
        writePwaTlsConfig({ filePath, passphrase });

        const server = loadPWAServer();
        if (server) {
            applyTlsToServer(server);
            const wasRunning = server.isRunning;
            if (wasRunning) {
                await server.stop();
                await server.start();
            }
            if (mainWindow) mainWindow.webContents.send('pwa-server-status-changed', server.getStatus());
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
});

ipcMain.handle('pwa-server-clear-cert', async () => {
    try {
        writePwaTlsConfig(null);

        const server = loadPWAServer();
        if (server) {
            applyTlsToServer(server);
            const wasRunning = server.isRunning;
            if (wasRunning) {
                await server.stop();
                await server.start();
            }
            if (mainWindow) mainWindow.webContents.send('pwa-server-status-changed', server.getStatus());
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
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

// 在系统默认浏览器中打开链接（避免 window.open 打开 Electron 新窗口）
ipcMain.handle('open-external', async (event, url) => {
    try {
        if (!url || typeof url !== 'string') return { success: false, error: 'invalid url' };
        await shell.openExternal(url);
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
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
