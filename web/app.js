var util = require('util');
var express = require('express');

var app = express();
app.use('/static', express.static(__dirname + '/static'));

app.get('/set/bulb1', function(req, res, next) {
	var bulb1 = req.query.bulb1;
	// scale it
	var hue = bulb1.h * (65536 / 360)
	var sat = bulb1.s * (65536 / 0.8)
	var lum = bulb1.l * (65536 / 1)
	console.log(hue, sat, lum);
	gw.lightsColour(hue, sat, lum, 0x0dac, 0);
	res.end("OK");
});

app.listen(3000);
console.log('Listening on port 3000');



var lifx = require('../lifx');
var gw = null;

lifx.Gateway.discoverAndInit(function(err, _gw) {
	if (err) {
		console.log("Err " + err);
	} else {
		gw = _gw;
		gw.on('bulb', function(b) {
			console.log('New bulb found: ' + b.name);
		});

	}
});

