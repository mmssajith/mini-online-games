import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        asteroidBlaster: resolve(__dirname, 'games/asteroid-blaster/index.html'),
        fruitCatcher: resolve(__dirname, 'games/fruit-catcher/index.html'),
        mazeRunner: resolve(__dirname, 'games/maze-runner/index.html'),
        bubblePop: resolve(__dirname, 'games/bubble-pop/index.html'),
        platformerQuest: resolve(__dirname, 'games/platformer-quest/index.html'),
      },
    },
  },
});
