import readline from 'readline';
import { WebSocket, WebSocketServer } from 'ws';
import EventEmitter from 'events';
import { ArgumentParser } from './utils.mjs';

/**
 * Disables console clearing and enables various other statements.
 */
const DEBUG = process.env.DEBUG === 'true' ? true : false;

/**
 * 2D array.
 */
let board = []

let is_server = false;

let argParser = ArgumentParser({ prog: 'Tic-Tac-Toe', description: 'A 2 player Tic-Tac-Toe terminal app over web sockets', epilog: '_' })
argParser.add_argument({ name: 'server', description: 'whether or not this is the server app', required: true, type: 'bool' })
argParser.add_argument({ name: 'board_size', description: 'value of n for n * n board size', required: false, type: 'int' })
argParser.add_argument({ name: 'host', description: "IP of remote server", required: false, type: 'string' })
let parsedArguments = argParser.parse_args();

if (parsedArguments.get("server")) {
    board = createBoard(parsedArguments.get("board_size"))
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
let player_character = is_server ? 'X' : 'O';

// turn counter that matches player id
let turn = 0;

/**
 * Batched events to be rendered alongside every single board render
 */
let renderPipeline = []

/**
 * @param {*} board 
 */
function displayBoard(board) {
    if (!DEBUG) { console.clear() };
    let leftChar = 97;
    let acc = "  ";
    let i = 0;
    for (let _ of board) {
        acc += (i.toString() + ' ');
        i = i + 1;
    }
    console.log(acc);
    for (let row of board) {
        console.log(String.fromCharCode(leftChar++), row.join(" "))
    }
    for (let item of renderPipeline) {
        console.log(item);
    }
    renderPipeline = [];
}


/**
 * The game event emitter. Remember that this is not the socket, so the game object emits and accepts messages
 * locally only. This means that if you want to handle server events on the game emitter differently to client events,
 * you'll probably want to create a new message name to distinguish server vs. client based on the messaged received on the web socket.
 */
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

/**
 * Initial draw.
 */
game.emit("draw");



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
    if (!(board[move.row][move.column] === '_') || move.row >= board[0].length || move.column >= board[0].length || move.row < 0 || move.column < 0) {
        return false
    }
    return true
}


function applyMove(move, pc) {
    board[move.row][move.column] = pc;
}

/** Check for a win state */
function checkWin() {
    // todo: DRY
    for (let i = 0; i < board.length - 2; i++) {
        for (let j = 0; j < board[i].length - 2; j++) {
            if (board[i][j] === player_character && board[i][j + 1] === player_character && board[i][j + 2] === player_character) {
                return true;
            }
            if (board[i][j] === player_character && board[i + 1][j] === player_character && board[i + 2][j] === player_character) {
                return true;
            }
        }
    }
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const clients = new Map();

/**
 * Server logic
 */
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
    /**
     * A client has no other clients.
     * Todo: make server a 'client' of the client, they are in theory equal in terms of the game.
     * The server was not necessarily intended to be a source of truth as we do not care about cheating in this game etc.
     */
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

/**
 * Client logic
 */
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
 * main game loop for client and server
 */
while (true) {
    if (checkWin()) {
        console.log(`There is a winner, and it is ${player_character}`);
        break;
    }
    /**
     * Accept user input as it is a player's turn
    */
    // console.log(`in game loop as ${player_id} and turn ${turn}`);
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
                resolve();
            })
        })
    }
}
