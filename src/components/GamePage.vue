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
          aria-label="Tic Tac Toe Board">
        <div
            v-for="(cell, index) in game.board"
            :key="index"
            role="gridcell"
            tabindex="0"
            :aria-label="`Cell ${index + 1}: ${cell ? cell : 'empty'}`"
            @click="makeMove(index)"
            @keypress.enter="makeMove(index)"
            class="cell">
          {{ cell }}
        </div>
      </div>
      <div v-if="game.winner">
        <h3>Winner: {{ game.winner }}</h3>
      </div>
      <div v-else>
        <h3>Current Player: {{ game.currentPlayer }}</h3>
      </div>
      <button @click="resetGame" aria-label="Reset Game">Reset Game</button>
    </div>
  </div>
</template>


<script>
import axios from 'axios';

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
      }
    };
  },
  methods: {
    async createGame() {
      const response = await axios.post('http://localhost:3002/api/games');
      this.game = response.data;
      this.gameId = this.game.id;
    },
    async joinGame() {
      try {
        console.log('this.joinID', this.joinId)
        const response = await axios.get(`http://localhost:3002/api/games/${this.joinId}`);
        this.game = response.data;
        this.gameId = this.game.id;
      } catch (error) {
        alert('Game not found');
      }
    },
    async makeMove(index) {
      if (this.game.winner || this.game.board[index]) return;

      const player = this.game.currentPlayer;
      const response = await axios.post(`http://localhost:3002/api/games/${this.gameId}/move`, {
        index,
        player
      });
      this.game = response.data;
    },
    resetGame() {
      this.gameId = null;
      this.game = {
        id: '',
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        moves: []
      };
    }
  },
  mounted() {
    if (this.gameId) {
      axios.get(`http://localhost:3002/api/games/${this.gameId}`)
          .then(response => {
            this.game = response.data;
          })
          .catch(() => {
            alert('Game not found');
            this.gameId = null;
          });
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
</style>
