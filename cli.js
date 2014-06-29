var lifx = require('./lifx');
var util = require('util');
var packet = require('./packet');

lifx.setDebug(true);

var lx = lifx.init();

lx.on('bulbstate', function(b) {
	//console.log('Bulb state: ' + util.inspect(b));
});

lx.on('bulbonoff', function(b) {
	//console.log('Bulb on/off: ' + util.inspect(b));
});

lx.on('bulb', function(b) {
	console.log('New bulb found: ' + b.name);
});

lx.on('gateway', function(g) {
	console.log('New gateway found: ' + g.ip);
});

lx.on('packet', function(p) {
	// Show informational packets
	switch (p.packetTypeShortName) {
		case 'powerState':
		case 'wifiInfo':
		case 'wifiFirmwareState':
		case 'wifiState':
		case 'accessPoint':
		case 'bulbLabel':
		case 'tags':
		case 'tagLabels':
		//case 'lightStatus':
		case 'timeState':
		case 'resetSwitchState':
		case 'meshInfo':
		case 'meshFirmware':
		case 'versionState':
		case 'infoState':
		case 'mcuRailVoltage':
			console.log(p.packetTypeName + " - " + p.preamble.bulbAddress.toString('hex') + " - " + util.inspect(p.payload));
			break;
		default:
			break;
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
console.log("Press letters a-m to request various status fields");

var stdin = process.openStdin();
process.stdin.setRawMode(true);
process.stdin.resume();

var cycledColour = 0;

stdin.on('data', function (key) {
	//process.stdout.write('Got key ' + util.inspect(key) + '\n');
	switch (key[0]) {

		case 0x31: // 1
			console.log("Lights on");
			// lx.lightsOn('Bedroom Lamp'); // Can specify one bulb by name
			lx.lightsOn();
			break;

		case 0x32: // 2
			console.log("Lights off");
			lx.lightsOff();
			break;

		case 0x33: // 3
			console.log("Dim red");
			// BB8 7D0
			lx.lightsColour(0x0000, 0xffff, 1000, 0, 0);
			break;

		case 0x34: // 4
			console.log("Dim purple");
			//lx.lightsColour(0x0000, 0xffff, 500, 0, 0);
			lx.lightsColour(0xcc15, 0xffff, 500, 0, 0);
			break;

		case 0x35: // 5
			console.log("Bright white");
			lx.lightsColour(0x0000, 0x0000, 0x8000, 0x0af0, 0x0513);
			break;

		case 0x36: // 6
			cycledColour = (cycledColour+100) & 0xffff; console.log("Colour value is " + cycledColour);
			lx.lightsColour(cycledColour, 0xffff, 0x0200, 0x0000, 0x0000);
			break;

		case 0x37: // 7
			cycledColour = (cycledColour-100) & 0xffff; console.log("Colour value is " + cycledColour);
			lx.lightsColour(cycledColour, 0xffff, 0x0200, 0x0000, 0x0000);
			break;

		case 0x38: // 8
			console.log("Enabling debug");
			lifx.setDebug(true);
			break;

		case 0x39: // 9
			console.log("Disabling debug");
			lifx.setDebug(false);
			break;

		case 0x61: // a
			console.log("Requesting voltage");
			var message = packet.getMcuRailVoltage();
			lx.sendToAll(message);
			break;

		case 0x62: // b
			console.log("Requesting power state");
			var message = packet.getPowerState();
			lx.sendToAll(message);
			break;

		case 0x63: // c
			console.log("Requesting wifi info");
			var message = packet.getWifiInfo();
			lx.sendToAll(message);
			break;

		case 0x64: // d
			console.log("Requesting wifi firmware state");
			var message = packet.getWifiFirmwareState();
			lx.sendToAll(message);
			break;

		case 0x65: // e
			console.log("Requesting wifi state");
			var message = packet.getWifiState({interface:2});
			lx.sendToAll(message);
			break;

		case 0x66: // f
			console.log("Requesting bulb label");
			var message = packet.getBulbLabel();
			lx.sendToAll(message);
			break;

		case 0x67: // g
			console.log("Requesting tags");
			var message = packet.getTags();
			lx.sendToAll(message);
			break;

		case 0x68: // h
			console.log("Requesting tag label for tag 1");
			var message = packet.getTagLabels({tags:new Buffer([1,0,0,0,0,0,0,0])});
			lx.sendToAll(message);
			break;

		case 0x69: // i
			console.log("Requesting time");
			var message = packet.getTime();
			lx.sendToAll(message);
			break;

		case 0x6a: // j
			console.log("Requesting info");
			var message = packet.getInfo();
			lx.sendToAll(message);
			break;

		case 0x6b: // k
			console.log("Requesting reset switch state");
			var message = packet.getResetSwitchState();
			lx.sendToAll(message);
			break;

		case 0x6c: // l
			console.log("Requesting mesh info");
			var message = packet.getMeshInfo();
			lx.sendToAll(message);
			break;

		case 0x6d: // m
			console.log("Requesting mesh firmware");
			var message = packet.getMeshFirmware();
			lx.sendToAll(message);
			break;

		case 0x03: // ctrl-c
			console.log("Closing...");
			lx.close();
			process.stdin.pause();
			//process.exit();
			break;

	}
});
