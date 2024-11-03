<!-- src/components/Game.vue -->
<template>
  <div>
    <div v-if="!gameId">
      <button @click="createGame" aria-label="Create a new game session">Create New Game</button>
      <div>
        <h2>Join Existing Game</h2>
        <input v-model="joinId" placeholder="Enter Game ID"  @keyup.enter="joinGame">
        <button @click="joinGame" aria-label="Join game" >Join Game</button>
      </div>
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        {{ liveAnnouncement }}
      </div>
    </div>

    <div v-else>
      <h2>Game Session: {{ game.id }}</h2>
      <div
          class="board"
          role="grid">
        <div
            v-for="(cell, index) in game.board"
            :key="index"
            role="gridcell"
            tabindex="0"
            @click="makeMove(index)"
            @keypress.enter="makeMove(index)"
            class="cell">
          <!--Invisible but readable by NVDA screen reader-->
          <span style="color: transparent;position: absolute; font-size: 5px;">Cell {{ index + 1 }}: {{ cell ? cell : 'empty' }}</span>
          <span aria-hidden="true">{{ cell }}</span>
        </div>
      </div>
      <div v-if="game.winner">
        <h3>Winner: {{ game.winner }}</h3>
      </div>
      <div v-else>
        <h3 aria-live="polite" aria-atomic="true" class="sr-only">You are Player {{playerSymbol}}</h3>
        <h3>Current Turn: Player {{ game.currentPlayer }}</h3>
      </div>

      <button @click="exitGame" aria-label="Exit Game">Exit Game</button>

      <div class="move-history" aria-label="Past Moves">
        <!-- ARIA Live Region for Dynamic Announcements -->
        <div aria-live="polite" aria-atomic="true" class="sr-only">
          {{ liveAnnouncement }}
        </div>

        <br>
        <h3>Past Moves:</h3>

        <h3 v-for="(move, index) in game.moves" :key="index">
          Move {{ index + 1 }}: Player {{ move.player }} to Cell {{ move.index + 1 }}
        </h3>
      </div>
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
      liveAnnouncement: '' // ARIA live region announcement
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
        this.liveAnnouncement = `Game ${this.joinId} not found!`;
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
        //this.liveAnnouncement = `You are Player ${symbol}.`
      });

      // Listen for game data updates
      this.socket.on('gameData', (updatedGame) => {
        const previousMoves = [...this.game.moves];
        this.game = updatedGame;
        this.checkGameStatus();
        this.updateLiveAnnouncement(previousMoves, this.game.moves);
      });

      // Listen for player joined notifications
      this.socket.on('playerJoined', (message) => {
        console.log(message);
        this.liveAnnouncement = message;
      });

      // Listen for error messages
      this.socket.on('errorMessage', (message) => {
        // alert(message);
        this.liveAnnouncement = '';
        this.liveAnnouncement = message;
        if (message === 'Game is already full') {
          this.exitGame();
        }
      });
    },

    // Update the live announcement based on the latest move
    updateLiveAnnouncement(previousMoves, currentMoves) {

        if (this.game.winner) {
        if (this.game.winner === 'Draw') {
          this.liveAnnouncement = 'The game is a draw.';
        } else {
          this.liveAnnouncement = `Player ${this.game.winner} has won the game.`;
        }
      } else if (currentMoves.length > previousMoves.length) {
        const latestMove = currentMoves[currentMoves.length - 1];
        const player = latestMove.player;
        const cell = latestMove.index + 1;
        const nextPlayer = player === 'X' ? 'O' : 'X';

        if (this.playerSymbol === player) {
          this.liveAnnouncement = `You marked Cell ${cell}. Waiting for Player ${nextPlayer} to make a move.`
        } else {
          this.liveAnnouncement = `Player ${player} made a move to Cell ${cell}. Now it is your turn.`;
        }
      } else {
        this.liveAnnouncement = `Waiting for Player ${this.game.currentPlayer} to make a move`;
      }
    },
    makeMove(index) {
      if (this.game.winner || this.game.board[index]) return;

      if (this.playerSymbol !== this.game.currentPlayer) {
        this.liveAnnouncement = '';
        setTimeout(() => {
          this.liveAnnouncement = 'Not your turn.';
        }, 200);
        // alert('Not your turn');
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
      this.liveAnnouncement = '';
    },
    checkGameStatus() {
      if (this.game.winner) {
        if (this.game.winner === 'Draw') {
          this.liveAnnouncement = 'This game is a draw!';
        } else {
          this.liveAnnouncement = `Player ${this.game.winner} wins!`;
        }
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

.move-history {
  margin-top: 20px;
  padding: 10px;
  border-top: 2px solid #000;
  text-align: center;
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
