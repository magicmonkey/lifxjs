var lifx = require('../../lifx');
var util = require('util');
var mqtt = require('mqtt');

var broker = '10.1.0.1';
var lx = lifx.init();

console.log("Searching for a LIFX gateway...");
console.log('');
console.log('=== Instructions ===');
console.log('Publish JSON to one of the following topics:');
console.log('  /lifx/bulbcmd/<lifxAddress>/colour : {"hue":<hue>,"saturation":<sat>,"luminance":<lum>,"colourTemp":<whiteCol>}');
console.log('  /lifx/bulbcmd/<lifxAddress>/on : {"on":<boolean>}');
console.log('(where hue/sat/lum/whiteCol are 16-bit integers)');
console.log('');
console.log('or subscribe to one of the following topics:');
console.log('  /lifx/newbulb : gets notified when a new bulb is found');
console.log('  /lifx/bulb/<lifxAddress> : gets messages whenever the bulb state changes (will likely get duplicates)');
console.log('');

var mqttClient = mqtt.createClient(1883, broker);

lx.on('gateway', function(g) {
	mqttClient.publish('/lifx/gateway', JSON.stringify({ipAddress:g.ipAddress, lifxAddress:g.lifxAddress.toString('hex')}));
});
lx.on('bulb', function(b) {
	b.lifxAddress = b.lifxAddress.toString('hex');
	mqttClient.publish('/lifx/newbulb', JSON.stringify({bulb:b,mqttTopicBase:"/lifx/bulbcmd/"+b.lifxAddress.toString('hex')}));
});
lx.on('bulbstate', function(s) {
	s.bulb.lifxAddress = s.bulb.lifxAddress.toString('hex');
	mqttClient.publish('/lifx/bulb/'+s.bulb.lifxAddress.toString('hex'), JSON.stringify(s));
});
lx.on('bulbonoff', function(s) {
	mqttClient.publish('/lifx/bulb/'+s.bulb.lifxAddress.toString('hex'), JSON.stringify({on:s.on}));
});

mqttClient.subscribe('/lifx/bulbcmd/#');
mqttClient.on('message', function(topic, message) {
	console.log(topic + " " + message);
	if (matches = topic.match(/bulbcmd\/([0-9a-f]{16})\/([a-z]*)$/)) {
		var lifxAddress = matches[1];
		var cmd = matches[2];
		try{
			var params = JSON.parse(message);
		} catch (e) {
			console.log("Could not parse JSON message: " + message);
		}
		switch (cmd) {

			case "colour":
				if (
					typeof params.hue == 'undefined'
					|| typeof params.saturation == 'undefined'
					|| typeof params.luminance == 'undefined'
					|| typeof params.colourTemp == 'undefined'
				) {
					console.log("Incomplete message; expecting all of hue/saturation/luminance/colourTemp in message " + message);
				} else {
					lx.lightsColour(params.hue, params.saturation, params.luminance, params.colourTemp, 0, lifxAddress);
				}
				break;

			case "on":
			case "off":
				if (typeof params.on != 'undefined') {
					if (params.on) {
						lx.lightsOn(lifxAddress);
					} else {
						lx.lightsOff(lifxAddress);
					}
				} else if (typeof params.off != 'undefined') {
					if (params.off) {
						lx.lightsOff(lifxAddress);
					} else {
						lx.lightsOn(lifxAddress);
					}
				} else {
					console.log("Incomplete message; expecting one of on/off in message " + message);
				}
				break;
		}
	}
	if (matches = topic.match(/bulbcmd\/all\/([a-z]*)$/)) {
		var cmd = matches[1];
		try{
			var params = JSON.parse(message);
		} catch (e) {
			console.log("Could not parse JSON message: " + message);
		}
		switch (cmd) {

			case "colour":
				if (
					typeof params.hue == 'undefined'
					|| typeof params.saturation == 'undefined'
					|| typeof params.luminance == 'undefined'
					|| typeof params.colourTemp == 'undefined'
				) {
					console.log("Incomplete message; expecting all of hue/saturation/luminance/colourTemp in message " + message);
				} else {
					lx.lightsColour(params.hue, params.saturation, params.luminance, params.colourTemp, 0);
				}
				break;

			case "on":
			case "off":
				if (typeof params.on != 'undefined') {
					if (params.on) {
						lx.lightsOn();
					} else {
						lx.lightsOff();
					}
				} else if (typeof params.off != 'undefined') {
					if (params.off) {
						lx.lightsOff();
					} else {
						lx.lightsOn();
					}
				} else {
					console.log("Incomplete message; expecting one of on/off in message " + message);
				}
				break;
		}
	}
});

