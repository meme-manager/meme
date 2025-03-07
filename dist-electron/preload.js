import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, ...args) => {
    const validChannels = [
      "import-local-meme",
      "import-url-meme",
      "get-all-memes",
      "delete-meme"
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`不允许使用 IPC 通道: ${channel}`);
  }
});
