var lifx = require('./lifx');
var util = require('util');

var gw = null;

lifx.Gateway.discoverAndInit(function(err, _gw) {
	if (err) {
		console.log("Err " + err);
	} else {
		gw = _gw;
	}
});

var stdin = process.openStdin();
process.stdin.setRawMode(true)
process.stdin.resume();

console.log("Control 2 lights independently: press numbers 1-8");

stdin.on('data', function (key) {
	//process.stdout.write('Got key ' + util.inspect(key) + '\n');
	switch (key[0]) {

		case 0x31: // 1
			console.log("Lights on");
			gw.lightsOn();
			break;

		case 0x32: // 2
			console.log("Lights off");
			gw.lightsOff();
			break;

		case 0x33: // 3
			console.log(util.inspect(gw));
			break;

		case 0x34: // 4
			gw.lightsOn(gw.bulbs[0]);
			break;

		case 0x35: // 5
			gw.lightsOff(gw.bulbs[0]);
			break;

		case 0x36: // 6
			gw.lightsOn(gw.bulbs[1]);
			break;

		case 0x37: // 7
			gw.lightsOff(gw.bulbs[1]);
			break;

		case 0x38: // 8
			console.log(gw.bulbs);
			break;

		case 0x39: // 9
			gw.findBulbs();
			break;

		case 0x03: // ctrl-c
			console.log("Closing...");
			gw.close();
			process.stdin.pause();
			//process.exit();
			break;

	}
});

