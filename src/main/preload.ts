const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, ...args: any[]) => {
        const validChannels = [
            'import-local-meme',
            'import-url-meme',
            'get-all-memes',
            'delete-meme'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`不允许使用 IPC 通道: ${channel}`);
    }
}); 