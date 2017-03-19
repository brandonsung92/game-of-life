const utils = {
	generateRandomColor: function(minValue, maxValue) {
		minValue = minValue || 0;
		maxValue = maxValue || 255;

		return {
			r: (Math.floor((Math.random() * (maxValue - minValue)) + minValue)),
			g: (Math.floor((Math.random() * (maxValue - minValue)) + minValue)),
			b: (Math.floor((Math.random() * (maxValue - minValue)) + minValue))
		};
	}
};

module.exports = utils;