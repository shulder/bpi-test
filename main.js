const { app, BrowserWindow, ipcMain } = require('electron');
const { createDB, getDataFromDB, processDataBeforeSaving } = require('./db.js');

let mainWindow;

app.on('ready', async () => {
  mainWindow = new BrowserWindow({ width: 900, height: 700 });
  mainWindow.loadURL(`file://${__dirname}/index.html`);
  // mainWindow.webContents.openDevTools();
  await createDB();
  ipcMain.on('dataFetchedFromRemote', (event, data) => {
    processDataBeforeSaving(data);
  });

  ipcMain.on('dataRequestedFromDB', async (event, options) => {
    const data = await getDataFromDB(options);
    event.sender.send('dataSentFromDB', data);
  });
});

app.on('window-all-closed', () => app.quit());
