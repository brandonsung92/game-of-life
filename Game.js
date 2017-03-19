const Game = function(size, generationLifespan, onUpdate) {
	this.maxRow = size - 1;
	this.maxColumn = size - 1;
	this.generationLifespan = generationLifespan;
	this.onUpdate = onUpdate;

	this.liveCells = {};
	this.timeout = null;
	this.timeoutFn = this.nextGeneration.bind(this);
};

Game.prototype.start = function() {
	if (this.timeout) return;
	this.timeout = setTimeout(this.timeoutFn, this.generationLifespan);
};

Game.prototype.stop = function() {
	clearTimeout(this.timeout);
	this.timeout = null;
};

Game.prototype.update = function() {
	// Renew the timeout so the new change stays for a little bit
	this.stop();
	this.start();

	this.onUpdate();
};

Game.prototype.nextGeneration = function() {
	let newLiveCells = {};
	let newDeadCellKeys = [];
	let visitedCellKeys = [];

	for (let key in this.liveCells) {
		let liveNeighbourCount = 0;
		let {row, column} = this.parseCellKey(key);
		let neighbourCellKeys = this.getNeighbourCellKeys(row, column);

		for (let i = 0; i < neighbourCellKeys.length; i++) {
			let cellKey = neighbourCellKeys[i];
			if (this.liveCells[cellKey]) liveNeighbourCount++;
			else {
				// If this dead cell was already visited, then skip
				if (visitedCellKeys.indexOf(cellKey) != -1) continue;
				visitedCellKeys.push(cellKey);

				let {row, column} = this.parseCellKey(cellKey);
				let newLiveCell = this.generateByReproduction(row, column);
				if (newLiveCell) newLiveCells[cellKey] = newLiveCell;
			}
		}

		switch (liveNeighbourCount) {
			case 0:
			case 1:
				newDeadCellKeys.push(key);
				break;
			case 2:
			case 3:
				break;
			default: // any case from 4 - 8
				newDeadCellKeys.push(key);
		}
	}

	for (let key in newLiveCells) {
		this.liveCells[key] = newLiveCells[key]
	}

	for (let i = 0; i < newDeadCellKeys.length; i++) {
		delete this.liveCells[newDeadCellKeys[i]];
	}

	this.update();
};

Game.prototype.getLiveCells = function() {
	let returnData = [];
	for (let key in this.liveCells) {
		let parsedKey = this.parseCellKey(key);
		returnData.push({
			row: parsedKey.row,
			column: parsedKey.column,
			color: this.liveCells[key].color
		});
	}
	return returnData;
};

Game.prototype.addLiveCells = function(color, cells) {
	for (let i = 0; i < cells.length; i++) {
		this.addLiveCell(color, cells[i].row, cells[i].column, true);
	}
	this.update();
};

Game.prototype.addLiveCell = function(color, row, column, suppressUpdate) {
	let key = this.createCellKey(row, column);
	if (this.liveCells[key]) delete this.liveCells[key];
	this.liveCells[key] = {
		color: color
	};

	if (!suppressUpdate) this.update();
};

Game.prototype.generateByReproduction = function(row, column) {
	let liveNeighbourCount = 0;
	let neighbourCellKeys = this.getNeighbourCellKeys(row, column);

	let totalColor = {
		r: 0,
		g: 0,
		b: 0
	};

	for (let i = 0; i < neighbourCellKeys.length; i++) {
		let cell = this.liveCells[neighbourCellKeys[i]];
		if (cell) {
			totalColor.r += cell.color.r;
			totalColor.g += cell.color.g;
			totalColor.b += cell.color.b;

			liveNeighbourCount++;
		}
	}

	// If there are not 3 live neighbours, this cell does not become live
	if (liveNeighbourCount != 3) return false;

	return {
		color: {
			r: Math.floor(totalColor.r / liveNeighbourCount),
			g: Math.floor(totalColor.g / liveNeighbourCount),
			b: Math.floor(totalColor.b / liveNeighbourCount)
		}
	};
};

Game.prototype.getNeighbourCellKeys = function(row, column) {
	let cells = [];
	cells.push([row - 1, column - 1]);
	cells.push([row - 1, column]);
	cells.push([row - 1, column + 1]);
	cells.push([row + 1, column]);
	cells.push([row + 1, column + 1]);
	cells.push([row + 1, column - 1]);
	cells.push([row, column + 1]);
	cells.push([row, column - 1]);
	cells = cells.filter(function(cell) {
		return !(cell[0] < 0)
			&& !(cell[1] < 0)
			&& !(cell[0] > this.maxRow)
			&& !(cell[1] > this.maxColumn);
	}, this);

	return cells.map(function(cell) {
		return this.createCellKey(cell[0], cell[1]);
	}, this);
};

Game.prototype.createCellKey = function(row, column) {
	return row + '_' + column;
};

Game.prototype.parseCellKey = function(key) {
	// key is of form row_col
	let arr = key.split('_');
	return { row: Number(arr[0]), column: Number(arr[1]) };
};

module.exports = Game;