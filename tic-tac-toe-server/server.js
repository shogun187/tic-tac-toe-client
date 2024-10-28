const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let games = {}; // In-memory storage for simplicity

// Create a new game session
app.post('/api/games', (req, res) => {
    const gameId = `GameSession_${Object.keys(games).length + 1}`;
    games[gameId] = {
        id: gameId,
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        moves: []
    };
    res.json(games[gameId]);
});

// Get game state
app.get('/api/games/:id', (req, res) => {
    const game = games[req.params.id];
    if (game) {
        res.json(game);
    } else {
        res.status(404).send('Game not found');
    }
});

// Make a move
app.post('/api/games/:id/move', (req, res) => {
    const game = games[req.params.id];
    const { index, player } = req.body;

    if (!game || game.winner) {
        return res.status(400).send('Invalid game or game already ended');
    }

    if (game.board[index] || player !== game.currentPlayer) {
        return res.status(400).send('Invalid move');
    }

    game.board[index] = player;
    game.moves.push({ player, index });

    // Check for winner
    const winPatterns = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];

    winPatterns.forEach(pattern => {
        const [a, b, c] = pattern;
        if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
            game.winner = game.board[a];
        }
    });

    // Switch player
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

    res.json(game);
});

// Get past games
app.get('/api/games', (req, res) => {
    res.json(Object.values(games));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
