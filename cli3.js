var lifx = require('./lifx');
var util = require('util');

var lx = lifx.init();

var stdin = process.openStdin();
process.stdin.setRawMode(true);
process.stdin.resume();

console.log("Control 2 lights independently: press numbers 1-8");

stdin.on('data', function (key) {
	//process.stdout.write('Got key ' + util.inspect(key) + '\n');
	switch (key[0]) {

		case 0x31: // 1
			console.log("Lights on");
			lx.lightsOn();
			break;

		case 0x32: // 2
			console.log("Lights off");
			lx.lightsOff();
			break;

		case 0x33: // 3
			console.log(util.inspect(lx));
			break;

		case 0x34: // 4
			lx.lightsOn(lx.bulbs[0]);
			break;

		case 0x35: // 5
			lx.lightsOff(lx.bulbs[0]);
			break;

		case 0x36: // 6
			lx.lightsOn(lx.bulbs[1]);
			break;

		case 0x37: // 7
			lx.lightsOff(lx.bulbs[1]);
			break;

		case 0x38: // 8
			console.log(lx.bulbs);
			break;

		case 0x39: // 9
			lx.findBulbs();
			break;

		case 0x03: // ctrl-c
			console.log("Closing...");
			lx.close();
			process.stdin.pause();
			//process.exit();
			break;

	}
});

