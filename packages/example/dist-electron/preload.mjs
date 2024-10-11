"use strict";
const electron = require("electron");
function validateIPC(channel) {
  if (!channel || !channel.startsWith("_ipc:")) {
    throw new Error(`Unsupported event IPC channel '${channel}'`);
  }
  return true;
}
function createPreload() {
  electron.contextBridge.exposeInMainWorld("__el_bridge", {
    ipcRenderer: {
      send(channel, ...args) {
        if (validateIPC(channel)) {
          electron.ipcRenderer.send(channel, ...args);
        }
      },
      invoke(channel, ...args) {
        validateIPC(channel);
        return electron.ipcRenderer.invoke(channel, ...args);
      },
      on(channel, listener) {
        validateIPC(channel);
        electron.ipcRenderer.on(channel, listener);
        return this;
      },
      once(channel, listener) {
        validateIPC(channel);
        electron.ipcRenderer.once(channel, listener);
        return this;
      },
      removeListener(channel, listener) {
        validateIPC(channel);
        electron.ipcRenderer.removeListener(channel, listener);
        return this;
      }
    }
  });
}
createPreload();
