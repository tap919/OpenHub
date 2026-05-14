const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0A0C10',
      symbolColor: '#F0F6FC'
    }
  });

  if (isDev) {
    // Wait for the local Vite/Express server to boot then load it
    // Wait for port 3000 to be open is handled by wait-on in npm scripts, 
    // but just in case, we point it directly to the local dev server.
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In actual production build, the node backend should be spawned here or
    // served differently. Wait for the node backend to be available at port 3000
    // We assume the packaged app starts the express server concurrently, or 
    // Electron itself serves the files. For simplicity, we assume Node server runs on 3000.
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

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
