const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: 'public/icon.png',   // tu mets une icône ensuite
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.loadURL("https://clubmanager-react-cr-x7gh.bolt.host");
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
