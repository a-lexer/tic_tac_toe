import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8080');


let turn = 0;

ws.on('open', function open() {
  ws.send(JSON.stringify({ hello: 1 }));
});

ws.on('message', function message(data) {
  let parsedData = JSON.parse(data);
  switch (parsedData.message) {
    case "updateTurnValue": turn = parsedData.value;
      break;
  }
  console.log('received: %s', parsedData);
  console.log(turn);
});


ws.on('opesn', function open() {
  ws.send(JSON.stringify({ eventName: 'move', value: 'A0' }));
});