var lifx = require('./lifx');
var util = require('util');

var step = 100;
var autoCommit = true;
var timing = 0;

var lx = lifx.init();

lx.on('bulbstate', function(b) {
	console.log('Bulb state: ' + util.inspect(b));
});
lx.on('bulbonoff', function(b) {
	console.log('Bulb on/off: ' + util.inspect(b));
});
lx.on('bulb', function(b) {
	console.log('New bulb found: ' + b.name);
});
lx.on('gateway', function(g) {
	console.log('New gateway found: ' + g.ipAddress.ip);
});

console.log("Keys:");
console.log("Press 1 to turn the lights on");
console.log("Press 2 to turn the lights off");
console.log("");
console.log("Press q and a to cycle the hue");
console.log("Press w and s to cycle the saturation");
console.log("Press e and d to cycle the luminance");
console.log("Press r and f to cycle the white colour");
console.log("Press enter to send these values to the bulbs");
console.log("");
console.log("Press 6 to make the changes apply immediately");
console.log("Press 7 to make it wait until you hit enter before applying");
console.log("Press 8 to show debug messages including network traffic");
console.log("Press 9 to hide debug messages including network traffic");
//console.log("Press a to request an info update from the lights");

var stdin = process.openStdin();
process.stdin.setRawMode(true);
process.stdin.resume();

var hue = 0;
var sat = 0;
var lum = 0;
var whi = 0;

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

		case 0x36: // 6
			console.log("Auto commit on");
			autoCommit = true;
			break;

		case 0x37: // 7
			console.log("Auto commit off");
			autoCommit = false;
			break;

		case 0x38: // 8
			console.log("Debug on");
			lifx.setDebug(true);
			break;

		case 0x39: // 9
			console.log("Debug off");
			lifx.setDebug(false);
			break;

		case 0x71: // q
			hue = (hue + step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x61: // a
			hue = (hue - step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x77: // w
			sat = (sat + step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x73: // s
			sat = (sat - step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x65: // e
			lum = (lum + step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x64: // d
			lum = (lum - step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x72: // r
			whi = (whi + step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x66: // f
			whi = (whi - step) & 0xffff;
			console.log("H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			if (autoCommit) lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x67: // g
			lx.findBulbs();
			break;

		case 0x0d: // enter
			console.log("Sending H<" + hue + "> S<" + sat + "> L<" + lum + "> W<" + whi + ">");
			lx.lightsColour(hue, sat, lum, whi, timing);
			break;

		case 0x03: // ctrl-c
			console.log("Closing...");
			lx.close();
			process.stdin.pause();
			//process.exit();
			break;

	}
});

