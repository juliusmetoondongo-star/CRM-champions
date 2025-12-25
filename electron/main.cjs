const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // dist du projet Vite dans le sous-dossier
  win.loadFile(path.join(__dirname, "../champions-academy/dist/index.html"));
}

app.whenReady().then(() => createWindow());
