let GAME_SIZE = 50;
let GENERATION_LIFESPAN = 3000;

// Check command line args
(function() {
	let numArg;
	if (process.argv[2]) {
		numArg = Number(process.argv[2]);
		if (Number.isInteger(numArg) && numArg > 0) GAME_SIZE = numArg;
		else {
			console.error('Invalid game size argument');
			process.exit(1);
		}
	}
	if (process.argv[3]) {
		numArg = Number(process.argv[3]);
		if (numArg && numArg > 0) GENERATION_LIFESPAN = numArg;
		else {
			console.error('Invalid generation lifespan argument');
			process.exit(1);
		}
	}
})();

const http = require('http');
const fs = require('fs');
const path = require('path');

const utils = require('./utils.js');
const Game = require('./Game.js');

const publicBasePath = './public';

let users;
let game;
let server;

(function() {
	users = {};
	game = new Game(GAME_SIZE, GENERATION_LIFESPAN, sendUpdates);

	server = http.createServer(function(req, res) {
		if (req.method === 'GET') {
			if (req.url === '/subscribe') {
				let id = Date.now();
				let color = utils.generateRandomColor(0, 230); // use 230 as max value so color isnt too 'bright'

				users[id] = {
					color: color,
					res: res
				};

				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive'
				});
				res.write('retry: 10000\n');

				data = {
					eventType: 'init',
					id: id,
					color: color,
					size: GAME_SIZE
				};
				res.write('data:' + JSON.stringify(data) + '\n\n');

				req.connection.addListener('close', function() {
					delete users[id];
				});

				sendUpdates();
			} else {
				let filename = req.url === '/' ? 'index.html' : req.url;
				let filePath = path.join(path.resolve(publicBasePath), filename);
				let stream = fs.createReadStream(filePath);
				stream.on('error', function(err, content) {
					res.writeHead(404);
					res.end();
				});
				res.writeHead(200);
				stream.pipe(res);
			}
		} else if (req.method === 'POST') {
			if (req.url === '/addLiveCells') {
				let body = '';

				req.on('data', function(data) {
					body += data;
				});

				req.on('end', function() {
					let data = JSON.parse(body);
					if (!data.id || !users[data.id] || !data.cells) res.writeHead(400);
					else {
						game.addLiveCells(users[data.id].color, data.cells);
						res.writeHead(200);
					}
					res.end();
				});
			}
		}
	});

	game.start();

})();

function sendUpdates() {
	let userCount = 0;
	for (let id in users) {
		userCount++;
	}
	let data = {
		eventType: 'update',
		userCount: userCount,
		liveCells: game.getLiveCells()
	};
	let dataString = JSON.stringify(data);
	for (let id in users) {
		let res = users[id].res;
		res.write('data:' + dataString + '\n\n');
	}
}

server.listen(3000);