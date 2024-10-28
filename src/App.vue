<template>
  <div id="app">
    <header>
      <h1>Tic-Tac-Toe Accessible Game</h1>
    </header>
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>

#app {
  font-family: Arial, sans-serif;
  text-align: center;
  margin-top: 20px;
}
</style>