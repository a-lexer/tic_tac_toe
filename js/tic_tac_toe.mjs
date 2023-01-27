import readline from 'readline';
import { WebSocket, WebSocketServer } from 'ws';
import EventEmitter from 'events';


let board = []

let is_server = false;

if (process.argv[2]) {
    // we have a board size
    board = createBoard(process.argv[2])
    // we'll say a server is whatever creates a board from arguments
    is_server = true;
}

/**
 * Creates a board of size * size
 * @param {} size 
 * @returns 
 */
function createBoard(size) {
    let acc = [];
    let tmp_board = [];
    for (let i = 0; i < size; i++) {
        acc.push("_")
    }
    for (let i = 0; i < size; i++) {
        tmp_board.push([...acc]);
    }
    return tmp_board;
}


let player_id = is_server ? 0 : 1;

// turn counter that matches player id
let turn = 0;

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
    console.log("got move message: ", moveMessage);
    let move = parseMove(moveMessage);
    if (!moveIsValid(move)) {
        console.log("invalid move");
        return;
    }
    applyMove(move);
    game.emit("draw");
    game.emit("switchTurn");
});

game.on("makeMove", () => {

});

game.on("draw", () => {
    displayBoard(board);
})
game.emit("draw");
game.emit("firstMove");



/**
 * 
 * @param {*} move - e.g. a3, B2
 * @returns - row and column indices
 */
function parseMove(move) {
    let row = move.split("")[0].toLowerCase().charCodeAt(0) - 97
    let column = parseInt(move.split("")[1])
    return { row, column }
}


/**
 * Checks move is within a limited range.
 * @param {*} move 
 * @returns 
 */
function moveIsValid(move) {
    if (move.row >= board[0].length || move.column >= board[0].length || move.row < 0 || move.column < 0) {
        return false
    }
    return true
}


function applyMove(move) {
    board[move.row][move.column] = turn % 2 == 0 ? 'X' : "O";
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const clients = new Map();

if (is_server) {
    const wss = new WebSocketServer({ port: 8080 });


    wss.on('connection', (ws) => {
        // const id = ++player_id;
        const id = 1
        const color = Math.floor(Math.random() * 360);
        const metadata = { id, color };
        clients.set(ws, metadata);
        ws.on('message', (messageAsString) => {
            let parsedMessage = JSON.parse(Buffer.from(messageAsString).toString('utf8'))
            game.emit(parsedMessage.eventName, parsedMessage.value);
            console.log('received messages', JSON.parse(Buffer.from(messageAsString).toString('utf8'))
            )
        })
        ws.send(JSON.stringify({ message: 'init', value: board }))
    });


}
game.local
game.on("switchTurn", () => {
    let tmp_turn = (turn + 1) % (clients.size + 1);
    console.log("tmp turn is ", tmp_turn);
    game.emit("updateTurnValue", tmp_turn.toString());
    // emit on websocket for client the switchturn event, which
    // will increment their turn counter
    // and then allow them to make a move
})

game.on("updateTurnValue", (turn_str) => {
    turn = parseInt(turn_str);
    for (let client of clients.keys()) {
        console.log("sending turn string: ", turn_str);
        client.send(JSON.stringify({ message: "updateTurnValue", value: turn }));
    }
})


if (!is_server) {
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', function open() {
        ws.send(JSON.stringify({ hello: 1 }));
    });

    game.on("updateTurnValue", (turn_str) => {
        ws.send(JSON.stringify({ message: "updateTurnValue", value: turn }));
    })

    ws.on('message', function message(data) {
        let parsedData = JSON.parse(data);
        switch (parsedData.message) {
            case "updateTurnValue": turn = parsedData.value;
                game.emit("breakLoop");
                break;
            case "init": board = parsedData.value;
                displayBoard(board);
                break;
        }
        console.log('received: %s', parsedData);
        console.log(`turn is ${turn} and player_id is ${player_id}`);
    });

}

/**
 * main game loop
 */
while (true) {

    /**
     * Accept user input as it is a player's turn
    */
    console.log(`in game loop as ${player_id} and turn ${turn}`);
    if (player_id === turn) {
        console.log(`player id is ${player_id} and turn is ${turn} and argv ${process.argv}`)
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
    } else {
        /**
         * Wait until we get a move message from the other player
         */
        console.log('waiting for an update on turn value to break to input')
        await new Promise((resolve) => {
            game.on("breakLoop", () => {
                console.log('resolved on breakLook')
                resolve();
            })
        })
    }
}
