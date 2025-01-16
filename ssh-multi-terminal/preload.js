const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConnections: () => ipcRenderer.invoke('get-connections'),
    addConnection: (connection) => ipcRenderer.invoke('add-connection', connection),
    connectToServer: (connection) => ipcRenderer.invoke('connect-to-server', connection),
    executeCommand: (data) => ipcRenderer.invoke('execute-command', data),
});

