const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { connectSSH, executeCommand } = require('./sshUtils');

let mainWindow;
let connections = [];

// Load saved connections
function loadConnections() {
    if (fs.existsSync('connections.json')) {
        connections = JSON.parse(fs.readFileSync('connections.json', 'utf8'));
    }
}

// Save connections to file
function saveConnections() {
    fs.writeFileSync('connections.json', JSON.stringify(connections, null, 2));
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile('index.html');
}

// Electron lifecycle hooks
app.whenReady().then(() => {
    loadConnections();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-connections', () => connections);

ipcMain.handle('add-connection', (event, connection) => {
    connections.push(connection);
    saveConnections();
    return connections;
});

ipcMain.handle('connect-to-server', async (event, { host, username, password }) => {
    return await connectSSH({ host, username, password });
});

ipcMain.handle('execute-command', async (event, { command, target }) => {
    const results = [];
    const servers = target === 'all' ? connections : connections.filter((c) => c.host === target);

    for (const server of servers) {
        const { conn } = await connectSSH(server);
        const result = await executeCommand(conn, command);
        results.push({ server: server.host, ...result });
        conn.end(); // Close the connection
    }

    return results;
});
