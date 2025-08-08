const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    frame: true,
    title: 'Video Dataset Tool',
    icon: path.join(__dirname, 'build/icon.ico')
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.setMenu(null);
  
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Handle video file selection
ipcMain.handle('select-video', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }]
  });
  
  if (canceled) return null;
  return filePaths[0];
});

// Handle directory selection for saving images
ipcMain.handle('select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (canceled) return null;
  return filePaths[0];
});

// Handle frame extraction
ipcMain.handle('extract-frame', async (event, { videoPath, timestamp, outputDir, filename }) => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir || app.getPath('pictures'), filename || `frame-${Date.now()}.jpg`);
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '100%'
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err.message);
      });
  });
});

// Handle opening files in default application
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    // Does file exist?
    await fs.promises.access(filePath, fs.constants.F_OK);
    
    // Open file with default application
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    throw new Error(`File not found or cannot be opened: ${error.message}`);
  }
});

// Handle deleting files
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    // Does file exist?
    await fs.promises.access(filePath, fs.constants.F_OK);
    
    // Delete the file
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    throw new Error(`Cannot delete file: ${error.message}`);
  }
});