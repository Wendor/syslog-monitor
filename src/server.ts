/*
{ facility: 6,
  severity: 1,
  tag: 'ndm',
  time: 2018-06-28T17:00:00.000Z,
  hostname: '21:40:28',
  address: '10.0.0.1',
  family: 'IPv4',
  port: 60290,
  size: 71,
  msg: 'Core::ConfigurationSaver: configuration saved.' }
*/

import Syslogd from 'syslogd';
import WebSocket, { WebSocketServer } from 'ws';
import { Message } from './Message';
const wss = new WebSocketServer({ port: 5050 });

let messages: Message[] = [];

interface ExtWebSocket extends WebSocket {
    filters?: Filters;
}

interface Filters {
    keywords: string[];
}

wss.on('connection', (client: ExtWebSocket) => {
  client.on('message', function incoming(message) {
    let forClient = [];

    try {
        client.filters = JSON.parse(message.toString()) as Filters;
    } catch (e) {
        return;
    }

    for(let log of messages) {
      if(!client.filters || isHiddenMessage(log, client.filters)) continue;
      if(forClient.push(log) > 250) forClient.shift()
    }

    client.send(JSON.stringify(forClient));

  });
});


Syslogd((log: Message) => {
  console.log(log);
  if(messages.push(log) > 50000) {
    messages.shift();
  }

  for(let client of wss.clients) {
    const socket = client as ExtWebSocket;
    if (socket.readyState === WebSocket.OPEN) {
      if(!socket.filters || isHiddenMessage(log, socket.filters)) continue;
      client.send(JSON.stringify([log]));
    }
  }
// @ts-ignore
}).listen(1514, (err) => {
  if(err) console.error(err);
  console.log('Started')
});

const isHiddenMessage = (log: Message, filters: Filters) => {
  if(!filters.keywords || !(filters.keywords instanceof Array)) return true;

  for(let filter of filters.keywords) {
    if (filter.length < 1) continue;

    let match = true;

    for(let word of filter.split(' ').map(e => e.trim())) {
      if (
        word &&
        log.msg.toLowerCase().indexOf(word.toLowerCase()) === -1 &&
        log.hostname.toLowerCase().indexOf(word.toLowerCase()) === -1 &&
        log.tag.toLowerCase().indexOf(word.toLowerCase()) === -1 &&
        log.address.toLowerCase().indexOf(word.toLowerCase()) === -1
      ) {
        match = false;
        break;
      }
    }

    if(match) return false;
  }

  return true;
}
