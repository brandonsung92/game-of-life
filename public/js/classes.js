function Game() {
	this.start = function() {
		this.communications.start();
	}

	this.profile = new Profile();

	var onInit = function(id, color, size) {
		// Save id, color, and size
		this.profile.set(id, color, size);

		// Setup Info
		this.info.setColor(color);
		document.getElementById('info_container').appendChild(this.info.el);

		// Game Grid Setup
		if (this.gameGrid) this.gameGrid.el.parentNode.removeChild(this.gameGrid.el);
		this.gameGrid = new Grid(size, size)
		this.gameGrid.el.addEventListener('click', function(e) {
			let el = e.target;
			if (el.className != 'cell') return;
			let row = el.getAttribute('row');
			let column = el.getAttribute('column');
			this.communications.postLiveCells([{
				row: row,
				column: column
			}]);
		}.bind(this));
		document.getElementById('game_container').appendChild(this.gameGrid.el);

		// Pattern Menu Setup
		let defaultPatterns = [
			{
				name: 'Beehive',
				cells: [
					[0, 1, 1, 0],
					[1, 0, 0, 1],
					[0, 1, 1, 0]
				]
			},
			{
				name: 'Blinker',
				cells: [
					[1, 1, 1]
				]
			},
			{
				name: 'Beacon',
				cells: [
					[1, 1, 0, 0],
					[1, 1, 0, 0],
					[0, 0, 1, 1],
					[0, 0, 1, 1]
				]
			},
			{
				name: 'Glider',
				cells: [
					[0, 0, 1],
					[1, 0, 1],
					[0, 1, 1]
				]
			}
		];
		if (this.patternMenu.isEmpty()) {
			this.patternMenu.addPatterns(defaultPatterns);
			document.getElementById('pattern_menu_container').appendChild(this.patternMenu.el);
		} else this.patternMenu.updateColor();
	}.bind(this);

	var onUpdate = function(userCount, liveCells) {
		this.info.setUserCount(userCount);
		this.gameGrid.setLiveCells(liveCells);
	}.bind(this);

	this.communications = new Communications(this.profile, onInit, onUpdate);

	this.info = new Info();
	this.gameGrid = null;
	this.patternMenu = new PatternMenu(this.profile, this.communications.postLiveCells);
}

// Singleton Profile Class
function Profile() {
	this.id = null;
	this.color = null;
	this.size = null;

	this.set = function(id, color, size) {
		this.id = id;
		this.color = color;
		this.size = size;
	}
}

// Singleton Communications Class
function Communications(profile, onInit, onUpdate) {
	this.profile = profile;
	this.onInit = onInit;
	this.onUpdate = onUpdate;
	this.eventSource = null;

	this.onMessage = function(message) {
		var data = JSON.parse(message.data);
		if (!data) return;
		if (data.eventType == 'init') {
			this.onInit(data.id, data.color, data.size);
		} else if (data.eventType == 'update') {
			this.onUpdate(data.userCount, data.liveCells);
		}
	}.bind(this);
	this.start = function() {
		this.eventSource = new EventSource('/subscribe');
		this.eventSource.onmessage = this.onMessage;
	};
	this.postLiveCells = function(cells) {
		var postData = {
			id: this.profile.id,
			cells: cells
		};
		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/addLiveCells');
		xhr.send(JSON.stringify(postData));
	};
};

// Singleton Info Class
function Info() {
	this.el = document.createElement('div');
	this.el.className = 'info';

	var usersOnlineContainer = document.createElement('div');
	var colorIndicatorContainer = document.createElement('div');

	usersOnlineContainer.innerHTML = 'Users online: ';
	this.userCountEl = document.createElement('span');
	usersOnlineContainer.appendChild(this.userCountEl);

	colorIndicatorContainer.innerHTML = 'Your color is: ';
	this.colorIndicatorEl = document.createElement('div');
	this.colorIndicatorEl.className = 'color_indicator';
	colorIndicatorContainer.appendChild(this.colorIndicatorEl);

	this.el.appendChild(usersOnlineContainer);
	this.el.appendChild(colorIndicatorContainer);

	this.setColor = function(color) {
		applyColor(this.colorIndicatorEl, color);
	};

	this.setUserCount = function(userCount) {
		this.userCountEl.innerHTML = userCount;
	};
}

// Grid Class
function Grid(width, height, onCellGenerate) {
	this.liveCells = [];
	this.cellMap = [];
	this.el = document.createElement('table');

	this.el.className = 'grid';
	for (var row = 0; row < width; row++) {
		this.cellMap[row] = [];
		var rowEl = document.createElement('tr');
		for (var column = 0; column < height; column++) {
			var cellEl = document.createElement('td');
			cellEl.className = 'cell';
			cellEl.setAttribute('row', row);
			cellEl.setAttribute('column', column);
			this.cellMap[row][column] = cellEl;
			rowEl.appendChild(cellEl);

			if (onCellGenerate) onCellGenerate(row, column, cellEl);
		}
		this.el.appendChild(rowEl);
	}
}

Grid.prototype.setLiveCells = function(liveCells) {
	this.clearLiveCells();
	for (var i = 0; i < liveCells.length; i++) {
		var {row, column, color} = liveCells[i];
		applyColor(this.cellMap[row][column], color);
		this.liveCells.push(liveCells[i]);
	}
};

Grid.prototype.clearLiveCells = function() {
	while (this.liveCells.length != 0) {
		this.cellMap[this.liveCells[0].row][this.liveCells[0].column].style.background = null;
		this.liveCells.splice(0, 1);
	}
};

// Singleton PatternMenu
function PatternMenu(profile, onInsert) {

	// Nested MenuItem Class
	function MenuItem(name, color, pattern) {
		this.name = name;
		this.color = color;
		this.pattern = pattern;

		this.el = document.createElement('div');
		this.el.className = this.className;

		this.labelEl = document.createElement('div');
		this.labelEl.className = this.labelClassName;
		this.labelEl.innerHTML = this.name.charAt(0).toUpperCase() + this.name.substr(1);

		this.grid = this.createGridFromPattern(profile, pattern);

		this.el.appendChild(this.labelEl);
		this.el.appendChild(this.grid.el);
	}

	MenuItem.prototype.className = 'menu_item';
	MenuItem.prototype.labelClassName = 'menu_item_label';
	MenuItem.prototype.createGridFromPattern = function(profile, pattern) {
		var liveCells = [];
		var grid = new Grid(pattern.length, pattern[0].length, function(row, column, el) {
			if (pattern[row][column]) 
				liveCells.push({row: row, column: column, color: this.color});
		}.bind(this));
		grid.setLiveCells(liveCells);
		return grid;
	};
	MenuItem.prototype.onClick = function(handler) {
		var menuItem = this;
		this.el.addEventListener('click', function(e) {
			handler(menuItem);
		});
	};

	// Methods
	this.insertPattern = function(menuItem) {
		var pattern = menuItem.pattern;
		var height = pattern.length;
		var width = pattern[0].length;
		var startRow = Math.floor(Math.random() * (this.profile.size + 1 - height));
		var startColumn = Math.floor(Math.random() * (this.profile.size + 1 - width));

		var cells = [];
		for (var row = 0; row < pattern.length; row++) {
			for (var column = 0; column < pattern[row].length; column++) {
				if (pattern[row][column]) {
					cells.push({
						row: row + startRow,
						column: column + startColumn
					});
				}
			}
		}
		this.onInsert(cells);
	}.bind(this);

	this.addPattern = function(patternName, pattern) {
		var menuItem = new MenuItem(patternName, this.profile.color, pattern);
		menuItem.onClick(this.insertPattern);
		this.el.appendChild(menuItem.el);
		this.menuItems.push(menuItem);
	}

	this.addPatterns = function(patterns) {
		for (var i = 0; i < patterns.length; i++) {
			this.addPattern(patterns[i].name, patterns[i].cells);
		}
	}

	this.updateColor = function() {
		for (var i = 0; i < this.menuItems.length; i++) {
			var grid = this.menuItems[i].grid;
			var newLiveCells = grid.liveCells.map(function(cell) {
				return {
					row: cell.row,
					column: cell.column,
					color: this.profile.color
				}
			}, this);
			grid.setLiveCells(newLiveCells);
		}
	};

	this.isEmpty = function() {
		return this.menuItems.length == 0;
	};

	this.profile = profile;
	this.onInsert = onInsert;
	this.menuItems = [];

	this.el = document.createElement('div');
	this.el.id = 'pattern_menu';
}

function applyColor(el, color) {
	var hexR = color.r.toString(16);
	var hexG = color.g.toString(16);
	var hexB = color.b.toString(16);
	if (hexR.length != 2) hexR = '0' + hexR;
	if (hexG.length != 2) hexG = '0' + hexG;
	if (hexB.length != 2) hexB = '0' + hexB;
	el.style.background = '#' + hexR + hexG + hexB;
}