const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info')
});
