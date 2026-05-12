const { app, BrowserWindow } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) app.quit();

app.disableHardwareAcceleration();

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

app.setPath('userData', path.join(app.getPath('temp'), 'DAFO-Duct-Sizing-Tool-Dev'));

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 950,
    minWidth: 850,
    minHeight: 750,
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'DAFO.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.center();
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});