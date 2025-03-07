import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import Store from 'electron-store';
import { MemeService } from './services/meme-service';
import type { BrowserWindow as ElectronBrowserWindow } from 'electron';

// 添加类型声明
declare const __dirname: string;
declare const process: NodeJS.Process;

const store = new Store();

let mainWindow: ElectronBrowserWindow | null = null;

const createWindow = () => {
    const windowOptions = {
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, '../preload/preload.cjs')
        }
    };

    mainWindow = new BrowserWindow(windowOptions);

    if (process.env.NODE_ENV === 'development') {
        mainWindow?.loadURL('http://localhost:5173');
    } else {
        mainWindow?.loadFile(join(__dirname, '../renderer/index.html'));
    }
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

const memeService = new MemeService();

// 注册IPC处理器
ipcMain.handle('import-local-meme', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const memes = await Promise.all(
            result.filePaths.map((path: string) => memeService.importFromLocal(path))
        );
        return memes;
    }
    return [];
});

ipcMain.handle('import-url-meme', async (_: unknown, url: string) => {
    return await memeService.importFromUrl(url);
});

ipcMain.handle('get-all-memes', async () => {
    return await memeService.getAllMemes();
});

ipcMain.handle('delete-meme', async (_: unknown, id: string) => {
    return await memeService.deleteMeme(id);
}); 