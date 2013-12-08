var lifx = require('./lifx');
var async = require('async');
var util = require('util');

var gw = null;

lifx.Gateway.discoverAndInit(function(err, _gw) {
	if (err) {
		console.log("Err " + err);
	} else {
		gw = _gw;
	}
});

console.log("Keys:");
console.log("Press 1 to turn the lights on");
console.log("Press 2 to turn the lights off");
console.log("Press 3 to turn the lights a dim red");
console.log("Press 4 to turn the lights a dim purple");
console.log("Press 5 to turn the lights a bright white");
console.log("Press 6 to cycle forwards through colours");
console.log("Press 7 to cycle backwards through colours");
console.log("Press 8 to show debug messages including network traffic");
console.log("Press 9 to hide debug messages including network traffic");
//console.log("Press a to request an info update from the lights");

var stdin = process.openStdin();
process.stdin.setRawMode(true)
process.stdin.resume();

var cycledColour = 0;

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
			console.log("Dim red");
			gw.lightsColour(0xd49e, 0xffff, 0x028f, 0x0dac, 0x0513);
			break;

		case 0x34: // 4
			console.log("Dim purple");
			gw.lightsColour(0xcc15, 0xffff, 0x028f, 0x0dac, 0x0513);
			break;

		case 0x35: // 5
			console.log("Bright white");
			gw.lightsColour(0x0000, 0x0000, 0x8000, 0x0af0, 0x0513);
			break;

		case 0x36: // 6
			cycledColour = (cycledColour+100) & 0xffff; console.log("Colour value is " + cycledColour);
			gw.lightsColour(cycledColour, 0xffff, 0x0200, 0x0000, 0x0000);
			break;

		case 0x37: // 7
			cycledColour = (cycledColour+1000) & 0xffff; console.log("Colour value is " + cycledColour);
			gw.lightsColour(cycledColour, 0xffff, 0x0200, 0x0000, 0x0000);
			break;

		case 0x38: // 8
			console.log("Enabling debug");
			gw.debug(true);
			break;

		case 0x39: // 9
			console.log("Disabling debug");
			gw.debug(false);
			break;

		case 0x61: // a
			console.log("Requesting info");
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

