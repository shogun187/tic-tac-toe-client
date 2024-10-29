const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

let games = {}; // In-memory storage for simplicity

// Create new game
app.post('/api/games', (req, res) => {
    const gameId = Object.keys(games).length + 1;
    games[gameId] = {
        id: gameId,
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        moves: []
    };
    res.json(games[gameId]);
});

// Get existing game
app.get('/api/games/:id', (req, res) => {
    const game = games[req.params.id];
    if (game) {
        res.json(game);
    } else {
        res.status(404).send('Game not found');
    }
});

app.get('/api/games', (req, res) => {
    res.json(Object.values(games));
});

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Socket.IO Event Handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a game room
    socket.on('joinGame', (gameId) => {
        const game = games[gameId];
        if (game) {
            const clients = io.sockets.adapter.rooms.get(gameId);
            const numClients = clients ? clients.size : 0;

            if (numClients >= 2) {
                socket.emit('errorMessage', 'Game is already full');
                return;
            }

            socket.join(gameId);

            // Assign player symbol
            const playerSymbol = numClients === 0 ? 'X' : 'O';
            socket.emit('playerSymbol', playerSymbol);

            socket.emit('gameData', game);
            socket.to(gameId).emit('playerJoined', `Player ${playerSymbol} has joined Game ${gameId}`);
        } else {
            socket.emit('errorMessage', 'Game not found');
        }
    });

    // Handle making a move
    socket.on('makeMove', ({ gameId, index, player }) => {
        const game = games[gameId];
        if (!game) {
            socket.emit('errorMessage', 'Game not found');
            return;
        }

        if (game.winner) {
            socket.emit('errorMessage', 'Game has already ended');
            return;
        }

        if (game.board[index] !== null) {
            socket.emit('errorMessage', 'Cell is already occupied');
            return;
        }

        if (player !== game.currentPlayer) {
            socket.emit('errorMessage', 'Not your turn');
            return;
        }

        // Make the move
        game.board[index] = player;
        game.moves.push({ player, index });

        // Check for winner
        const winPatterns = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];

        let hasWinner = false;
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
                game.winner = game.board[a];
                hasWinner = true;
                break;
            }
        }

        // Check for draw if no winner
        if (!hasWinner && game.board.every(cell => cell !== null)) {
            game.winner = 'Draw';
        }

        // Switch player only if game is not over
        if (!game.winner) {
            game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
        }

        // Emit updated game state to all clients in the room
        io.to(gameId).emit('gameData', game);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
