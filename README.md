# Multiplayer Game of Life
Very simple implementation of [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway's_Game_of_Life), that is able to handle multiple users.

To create live cells, a user clicks on a live cell, or selects one of the patterns at the bottom of the page to randomly input a pattern of live cells.

## How to run it
Clone repo and run `node server.js <board size> <generation lifespan>`.

If `<board size>` is not entered, a default of 50 is used, if `<generation lifespan>` is not used, a default of 3000 is used.

A board of <board size> will be created, and the next generation is created <generation lifespan> milliseconds after the latest input received from any user.
