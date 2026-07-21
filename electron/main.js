const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

let serverApp;
let win;
const PORT = 4300;

function startServer() {
  serverApp = express();
  const distPath = path.join(__dirname, '../dist/expmedic-frontend/browser');

  serverApp.use(express.static(distPath));

  // Fallback para el router de Angular (rutas tipo /pacientes, /receta, etc.)
serverApp.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

  serverApp.listen(PORT, '127.0.0.1', () => {
    createWindow();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
  win.setMenuBarVisibility(false);
}

app.whenReady().then(startServer);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
