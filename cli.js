var lifx = require('./lifx');
var async = require('async');
var util = require('util');

var bulb;

async.series([

	// Init the bulb
	function(cb) {
		lifx.discoverAndInit(function(err, _bulb) {
			if (err) {
				cb(err);
			} else {
				bulb = _bulb;
				console.log("Found a controller bulb at " + bulb.address);
				cb();
			}
		});
	},

	// Init the UI
	function(cb) {

		console.log("Keys:");
		console.log("Press 1 to turn the lights on");
		console.log("Press 2 to turn the lights off");
		console.log("Press 3 to turn the lights a dim red");
		console.log("Press 4 to turn the lights a dim purple");
		console.log("Press 5 to turn the lights a bright white");
		console.log("Press 6 to cycle forwards through colours");
		console.log("Press 7 to cycle backwards through colours");
		console.log("Press a to request an info update from the lights");

		var stdin = process.openStdin();
		process.stdin.setRawMode(true)
		process.stdin.resume();

		stdin.on('data', function (key) {
			//process.stdout.write('Got key ' + util.inspect(key) + '\n');
			switch (key[0]) {

				case 0x31: // 1
					console.log("Lights on");
					bulb.lightsOn();
					break;

				case 0x32: // 2
					console.log("Lights off");
					bulb.lightsOff();
					break;

				case 0x33: // 3
					console.log("Dim red");
					bulb.red();
					break;

				case 0x34: // 4
					console.log("Dim purple");
					bulb.purple();
					break;

				case 0x35: // 5
					console.log("Bright white");
					bulb.brightWhite();
					break;

				case 0x36: // 6
					console.log("Test 1 (colour cycle forwards)");
					bulb.test1();
					break;

				case 0x37: // 7
					console.log("Test 2 (colour cycle backwards)");
					bulb.test2();
					break;

				case 0x61: // a
					console.log("Requesting info...");
					bulb.getInfo();
					break;

				case 0x03: // ctrl-c
					console.log("Closing...");
					bulb.close();
					process.stdin.pause();
					//process.exit();
					break;

			}
		});


	}

], function(err, results) {
	if (err) {
		console.log("Err: " + err);
	}
	console.log(results);
});

