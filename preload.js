const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // 接收命令行参数
    onCommandLineArgs: (callback) => {
        ipcRenderer.on('command-line-args', (event, args) => callback(args));
    },
    
    // PWA 服务器控制
    pwaServerStart: (port) => ipcRenderer.invoke('pwa-server-start', port),
    pwaServerStop: () => ipcRenderer.invoke('pwa-server-stop'),
    pwaServerStatus: () => ipcRenderer.invoke('pwa-server-status'),
    pwaServerChangePort: (port) => ipcRenderer.invoke('pwa-server-change-port', port),
    pwaServerCertStatus: () => ipcRenderer.invoke('pwa-server-cert-status'),
    pwaServerSelectCert: () => ipcRenderer.invoke('pwa-server-select-cert'),
    pwaServerSetCert: (filePath, passphrase) => ipcRenderer.invoke('pwa-server-set-cert', { filePath, passphrase }),
    pwaServerClearCert: () => ipcRenderer.invoke('pwa-server-clear-cert'),
    onPWAServerStatusChanged: (callback) => {
        ipcRenderer.on('pwa-server-status-changed', (event, status) => callback(status));
    },

    // 在系统默认浏览器中打开链接
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // 关卡编辑器
    openLevelEditor: (levelData) => ipcRenderer.invoke('open-level-editor', levelData),
    saveEditedLevel: (levelData) => ipcRenderer.invoke('save-edited-level', levelData),
    onLevelEdited: (callback) => {
        ipcRenderer.on('level-edited', (event, levelData) => callback(levelData));
    },
    onLoadLevelData: (callback) => {
        ipcRenderer.on('load-level-data', (event, levelData) => callback(levelData));
    },
    
    // 文件操作
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data)
});
