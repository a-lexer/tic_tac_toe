import readline from 'readline';
import { WebSocket, WebSocketServer } from 'ws';
import EventEmitter from 'events';






const board = [['_', '_', '_'], ['_', '_', '_'], ['_', '_', '_']]


// a player's turn is the message id modulo player count
let message_id = 0;
let player_id = 0;

/**
 * @param {*} board 
 */
function displayBoard(board) {
    for (let row of board) {
        console.log(row.join(" "))
    }
}

const game = new EventEmitter();
game.on("move", (moveMessage) => {
    console.log("got message move ", moveMessage);
    let move = parseMove(moveMessage);
    applyMove(move);
    game.emit("draw");
})
game.on("draw", () => {
    displayBoard(board);
})

/**
 * 
 * @param {*} move - e.g. a3, B2
 * @returns - row and column indices
 */
function parseMove(move) {
    let row = move.split("")[0].toLowerCase().charCodeAt(0) - 97
    let column = parseInt(move.split("")[1])
    return { row: row, column: column }
}


/**
 * Simply checks move is within a limited range.
 * @param {*} move 
 * @returns 
 */
function validateMove(move) {
    if (move.row >= board[0].length || move.column >= board[0].length || move.row < 0 || move.column < 0) {
        return { valid: false, move: move }
    }
    return { valid: true, ...move }
}


function applyMove(move) {
    board[move.row][move.column] = 'X';
}





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
        let parsedMessage = JSON.parse(Buffer.from(messageAsString).toString('utf8'))
        game.emit(parsedMessage.eventName, parsedMessage.value);
        console.log('received messages', JSON.parse(Buffer.from(messageAsString).toString('utf8'))
        )
    })
});


/**
 * main game loop
 */
while (true) {

    /**
     * Accept user input
     */
    const userMove = new Promise((resolve) => rl.question("What is your move? ", function (move) {
        resolve({ move: move });
        rl.on("close", function () {
            console.log("\nBYE BYE !!!");
            process.exit(0);
        });
    }));

    const promises = [userMove];

    await Promise.any(promises).then((value) => {
        game.emit("move", value.move)
    });
}
