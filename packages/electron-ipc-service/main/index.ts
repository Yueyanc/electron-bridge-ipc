import { ipcMain } from 'electron'

export class Server {
  serviceClients = new Map<number, ServiceClient>()
  services = new Map<string, any>()
  constructor() {
    ipcMain.on('_ipc:hello', ({ sender }) => {
      if (this.serviceClients.get(sender.id)) {
        this.serviceClients.set(sender.id, new ServiceClient(sender.id))
      }
    })
    ipcMain.on('_ipc:message', ({ sender }) => {

    })
  }

  registerService(id: string, service: any) {
    this.services.set(id, service)
  }
}

export class ServiceClient {
  constructor(private windowId: number) {

  }
}
