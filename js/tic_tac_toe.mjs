import readline from 'readline';
import { WebSocket, WebSocketServer } from 'ws';
import EventEmitter from 'events';


const DEBUG = false;

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
    if (!DEBUG) { console.clear() };
    for (let row of board) {
        console.log(row.join(" "))
    }
}

const game = new EventEmitter();
game.on("move", (moveMessage) => {
    /**
     * Every time there is a move we:
     * 1. Parse it
     * 2. Check that it's valid
     * 3. Apply it to the local board
     * 4. Send the move to the remote board
     */
    let move = parseMove(moveMessage);
    if (!moveIsValid(move)) {
        console.log("invalid move");
        return;
    }
    applyMove(move, turn % 2 == 0 ? 'X' : "O");
    game.emit("draw");
    game.emit("switchTurn", move);
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


function applyMove(move, pc) {
    board[move.row][move.column] = pc;
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
            game.emit(parsedMessage.message, JSON.stringify(parsedMessage));
            displayBoard(board);
        })
        ws.send(JSON.stringify({ message: 'init', value: board }))
    });


}


game.on("switchTurn", (move) => {
    let tmp_turn = (turn + 1) % (clients.size + 1);
    // console.log("tmp turn is ", tmp_turn);
    game.emit("updateTurnValue", JSON.stringify({ s: tmp_turn.toString(), move }));
    // emit on websocket for client the switchturn event, which
    // will increment their turn counter
    // and then allow them to make a move
})

game.on("updateTurnValue", (turn_str) => {

    let x = JSON.parse(turn_str);
    turn = parseInt(x.s);
    if (!is_server) {
        return;
    }
    for (let client of clients.keys()) {
        client.send(JSON.stringify({ message: "updateTurnValue", value: turn, move: x.move }));
    }
})

game.on("updateTurnValueServer", (s) => {
    let x = JSON.parse(s);
    applyMove(x.move, 'O')
    turn = 0;
    game.emit("breakLoop");
})


if (!is_server) {
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', function open() {
        ws.send(JSON.stringify({ hello: 1 }));
    });

    game.on("updateTurnValue", (turn_str) => {
        let json = JSON.parse(turn_str);
        ws.send(JSON.stringify({ message: "updateTurnValueServer", value: turn, move: json.move }));
    })

    ws.on('message', function message(data) {
        let parsedData = JSON.parse(data);
        switch (parsedData.message) {
            case "updateTurnValue": turn = parsedData.value;
                applyMove(parsedData.move, 'X')
                game.emit("breakLoop");
                game.emit("draw");
                break;
            case "init": board = parsedData.value;
                displayBoard(board);
                break;
        }
        displayBoard(board);
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
        const userMove = new Promise((resolve) => rl.question("What is your move? ", function (move) {
            resolve({ move: move });
            rl.on("close", function () {
                console.log("\nExiting.");
                process.exit(0);
            });
        }));
        const promises = [userMove];
        await Promise.any(promises).then((value) => {
            game.emit("move", value.move)
        });
    } else {
        /**
         * Wait until something breaks us out of this loop. Probably a client message handled elsewhere.
         */
        await new Promise((resolve) => {
            game.on("breakLoop", () => {
                console.log(`breaking loop on ${player_id} for turn ${turn}`)
                resolve();
            })
        })
    }
}
