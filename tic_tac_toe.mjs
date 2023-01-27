import readline from 'readline';
import { WebSocket, WebSocketServer } from 'ws';


const board = [['_', '_', '_'], ['_', '_', '_'], ['_', '_', '_']]

// a player's turn is the message id modulo player count
let message_id = 0;


function displayBoard(board) {
    for (let row of board) {
        console.log(row.join(" "))
    }
}

displayBoard(board)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


if (process.argv[2]) {
    // we have a board size
    // and we have an ip to connect
    console.log(process.argv)
}

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();


wss.on('connection', (ws) => {
    // const id = uuidv4();
    // const color = Math.floor(Math.random() * 360);
    // const metadata = { id, color };
    // clients.set(ws, metadata);
    ws.on('message', (messageAsString) => {
        console.log('received messages', Buffer.from(messageAsString).toString('utf8')
        )
    })
});



while (true) {

    const promise1 = Promise.reject(0);

    const promise2 = new Promise((resolve) => rl.question("What is your move? ", function (move) {
        resolve({ move: move });
        rl.on("close", function () {
            console.log("\nBYE BYE !!!");
            process.exit(0);
        });
    }));
    // const promise3 = new Promise((resolve) => setTimeout(resolve, 500, 'slow'));

    const promises = [promise1, promise2];

    await Promise.any(promises).then((value) => console.log(value, ' -> resolved'));
}





