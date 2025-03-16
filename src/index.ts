import { app, BrowserWindow } from 'electron';
import * as path from 'path';

app.enableSandbox();

function createWindow() {
    console.log("hello world");
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    win.loadURL('https://example.com');
}

app.whenReady().then(createWindow);
