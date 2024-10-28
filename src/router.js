import { createRouter, createWebHistory } from 'vue-router';
import Game from './components/GamePage.vue';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Game
    },
    {
        path: '/game/:id',
        name: 'Game',
        component: Game,
        props: true
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;