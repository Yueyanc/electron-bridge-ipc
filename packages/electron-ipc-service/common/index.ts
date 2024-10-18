import { isObject } from 'lodash'
import type { Subject } from 'rxjs'

export class Protocol {
  send(channelName: string, message?: Message) {}
  onMessage: Subject<any>
  listen() {}
}

export enum RequestType {

}
interface MessageHeader {
  type: RequestType
  id: number
  channelName?: string
  name?: string
}
const textEncoder = new TextEncoder()
export class Message {
  header: MessageHeader
  body: any
  constructor(header?: MessageHeader, body?: any) {
    if (header)
      this.header = header
    if (body)
      this.body = body
  }

  buffer() {
    return serialize(this.header, this.body)
  }
}

function serialize(header: MessageHeader, data: any) {
  if (isObject(data)) {
    return textEncoder.encode(JSON.stringify({ header, body: data }))
  }
}
