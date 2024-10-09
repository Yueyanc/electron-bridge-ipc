// electron-preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
function validateIPC(channel) {
  if (!channel || !channel.startsWith("_ipc:")) {
    throw new Error(`Unsupported event IPC channel '${channel}'`);
  }
  return true;
}
function createPreload() {
  contextBridge.exposeInMainWorld("__el_bridge", {
    ipcRenderer: {
      send(channel, ...args) {
        if (validateIPC(channel)) {
          ipcRenderer.send(channel, ...args);
        }
      },
      invoke(channel, ...args) {
        validateIPC(channel);
        return ipcRenderer.invoke(channel, ...args);
      },
      on(channel, listener) {
        validateIPC(channel);
        ipcRenderer.on(channel, listener);
        return this;
      },
      once(channel, listener) {
        validateIPC(channel);
        ipcRenderer.once(channel, listener);
        return this;
      },
      removeListener(channel, listener) {
        validateIPC(channel);
        ipcRenderer.removeListener(channel, listener);
        return this;
      }
    }
  });
}
export {
  createPreload
};
