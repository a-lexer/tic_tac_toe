import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  ws.send(JSON.stringify({ eventName: 'move', value: 'A0' }));
});

ws.on('message', function message(data) {
  console.log('received: %s', data);
});