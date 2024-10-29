<!-- src/components/Game.vue -->
<template>
  <div>
    <div v-if="!gameId">
      <button @click="createGame" aria-label="Create a new game session">Create New Game</button>
      <div>
        <h2>Join Existing Game</h2>
        <input v-model="joinId" placeholder="Enter Game ID" aria-label="Game ID">
        <button @click="joinGame" aria-label="Join game">Join Game</button>
      </div>
    </div>

    <div v-else>
      <h2>Game Session: {{ game.id }}</h2>
      <div
          class="board"
          role="grid"
          aria-label="Tic Tac Toe Board"
      >
        <div
            v-for="(cell, index) in game.board"
            :key="index"
            role="gridcell"
            tabindex="0"
            :aria-label="`Cell ${index + 1}: ${cell ? cell : 'empty'}`"
            @click="makeMove(index)"
            @keypress.enter="makeMove(index)"
            class="cell"
        >
          {{ cell }}
        </div>
      </div>
      <div v-if="game.winner">
        <h3>Winner: {{ game.winner }}</h3>
      </div>
      <div v-else>
        <h3>Current Player: {{ game.currentPlayer }}</h3>
      </div>
      <button @click="exitGame" aria-label="Exit Game">Exit Game</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { io } from 'socket.io-client';

export default {
  props: ['id'],
  data() {
    return {
      gameId: this.id || null,
      joinId: '',
      game: {
        id: '',
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        moves: []
      },
      socket: null,
      playerSymbol: null,
      hasAlerted: false // To prevent multiple alerts
    };
  },
  methods: {
    async createGame() {
      try {
        const response = await axios.post('http://localhost:3002/api/games');
        this.game = response.data;
        this.gameId = this.game.id;
        this.initializeSocket();
      } catch (error) {
        console.error('Error creating game:', error);
      }
    },
    async joinGame() {
      try {
        const response = await axios.get(`http://localhost:3002/api/games/${this.joinId}`);
        this.game = response.data;
        this.gameId = this.game.id;
        this.initializeSocket();
      } catch (error) {
        alert('Game not found');
      }
    },
    initializeSocket() {
      // Initialize Socket.IO client
      this.socket = io('http://localhost:3002');

      // Join the game room
      this.socket.emit('joinGame', this.gameId);

      // Listen for player symbol assignment
      this.socket.on('playerSymbol', (symbol) => {
        this.playerSymbol = symbol;
      });

      // Listen for game data updates
      this.socket.on('gameData', (updatedGame) => {
        this.game = updatedGame;
        this.checkGameStatus();
      });

      // Listen for player joined notifications
      this.socket.on('playerJoined', (message) => {
        console.log(message);
      });

      // Listen for error messages
      this.socket.on('errorMessage', (message) => {
        alert(message);
      });
    },
    makeMove(index) {
      if (this.game.winner || this.game.board[index]) return;

      if (this.playerSymbol !== this.game.currentPlayer) {
        alert('Not your turn');
        return;
      }

      // Emit move to server
      this.socket.emit('makeMove', {
        gameId: this.gameId,
        index,
        player: this.playerSymbol
      });
    },
    exitGame() {
      // Disconnect the socket if connected
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.gameId = null;
      this.joinId = '';
      this.game = {
        id: '',
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        moves: []
      };
      this.playerSymbol = null;
      this.hasAlerted = false;
    },
    checkGameStatus() {
      if (this.game.winner && !this.hasAlerted) {
        if (this.game.winner === 'Draw') {
          alert('The game is a draw!');
        } else {
          alert(`Player ${this.game.winner} wins!`);
        }
        this.hasAlerted = true;
      }
    }
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
};
</script>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-template-rows: repeat(3, 100px);
  gap: 10px;
  justify-content: center;
  margin: 20px 0;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f2f2f2;
  border: 2px solid #000;
  font-size: 2em;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cell:hover,
.cell:focus {
  background-color: #d9d9d9;
  outline: none;
  box-shadow: 0 0 0 3px #66afe9;
}

button {
  padding: 10px 20px;
  font-size: 1em;
  margin: 10px;
  cursor: pointer;
}

input {
  padding: 8px;
  font-size: 1em;
  margin: 10px 0;
  width: 200px;
}

@media (max-width: 600px) {
  .board {
    grid-template-columns: repeat(3, 80px);
    grid-template-rows: repeat(3, 80px);
    gap: 8px;
  }

  .cell {
    font-size: 1.5em;
  }
}

@media (max-width: 400px) {
  .board {
    grid-template-columns: repeat(3, 60px);
    grid-template-rows: repeat(3, 60px);
    gap: 5px;
  }

  .cell {
    font-size: 1.2em;
  }

  input {
    width: 150px;
  }
}
</style>
