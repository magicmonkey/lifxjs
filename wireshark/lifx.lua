local lifx = Proto("lifx", "LIFX wifi lightbulb")
local F = lifx.fields

function switch(t)
	t.case = function (self, pType, buffer, pinfo, tree)
		local f=self[pType]
		if packetNames[pType] then pinfo.cols.info = packetNames[pType] end
		if f then
			if type(f)=="function" then
				f(buffer, pinfo, tree, self)
			end
		end
	end
	return t
end

local onOffStrings = {
	[0x0000] = "Off",
	[0x0001] = "On",
	[0xffff] = "On"
}

local resetSwitchStrings = {
	[0] = "Up",
	[1] = "Down"
}

local interfaceStrings = {
	[1] = "soft_ap",
	[2] = "station"
}

local wifiStatusStrings = {
	[0] = "connecting",
	[1] = "connected",
	[2] = "failed",
	[3] = "off"
}

local securityProtocolStrings = {
	[1] = "OPEN",
	[2] = "WEP_PSK",
	[3] = "WPA_TKIP_PSK",
	[4] = "WPA_AES_PSK",
	[5] = "WPA2_AES_PSK",
	[6] = "WPA2_TKIP_PSK",
	[7] = "WPA2_MIXED_PSK"
}

packetNames = {
	[0x0002]   = "Get PAN Gateway",
	[0x0003]   = "Device state response",
	[0x0004]   = "Get time",
	[0x0005]   = "Set time",
	[0x0006]   = "Time state",
	[0x0007]   = "Get reset switch",
	[0x0008]   = "Reset switch state",
	[0x0009]   = "Get dummy load",
	[0x000a]   = "Set dummy load",
	[0x000b]   = "Dummy load",
	[0x000c]   = "Get mesh info",
	[0x000d]   = "Mesh info",
	[0x000e]   = "Get mesh firmware",
	[0x000f]   = "Mesh firmware state",
	[0x0010]   = "Get wifi info",
	[0x0011]   = "Wifi info",
	[0x0012]   = "Get wifi firmware state",
	[0x0013]   = "Wifi firmware state",
	[0x0014]   = "Get power state",
	[0x0015]   = "Set power state",
	[0x0016]   = "Power state",
	[0x0017]   = "Get bulb label",
	[0x0018]   = "Set bulb label",
	[0x0019]   = "Bulb label",
	[0x001a]   = "Get tags",
	[0x001c]   = "Tags",
	[0x001d]   = "Get tag labels",
	[0x001f]   = "Tag labels",
	[0x0020]   = "Get version",
	[0x0022]   = "Get info",
	[0x0023]   = "Info",
	[0x0024]   = "Get MCU rail voltage",
	[0x0025]   = "MCU rail voltage",
	[0x0026]   = "Reboot",
	[0x0065]   = "Get light state",
	[0x0066]   = "Set light colour",
	[0x0067]   = "Set waveform",
	[0x0068]   = "Set dim (absolute)",
	[0x0069]   = "Set dim (relative)",
	[0x006b]   = "Light status",
	[0x012d]   = "Get wifi state",
	[0x012e]   = "Set wifi state",
	[0x012f]   = "Wifi state",
	[0x0130]   = "Get access points",
	[0x0131]   = "Set access point",
	[0x0132]   = "Access point"
}

function deviceStateResponse(buffer, pinfo, tree)
	tree:add(F.unknown, buffer(0, 1))
	tree:add(F.unknown, buffer(1, 2))
end

function setTime(buffer, pinfo, tree)
	tree:add(F.time, buffer(0, 8))
end

function getTime(buffer, pinfo, tree)
	tree:add(F.time, buffer(0, 8))
end

function resetSwitchState(buffer, pinfo, tree)
	tree:add(F.time, buffer(0, 8))
end

function wifiInfo(buffer, pinfo, tree)
	tree:add(F.unknown, buffer(0, 14))
end

function wifiFirmwareState(buffer, pinfo, tree)
	tree:add(F.unknown, buffer(0, 16))
	tree:add(F.unknown, buffer(0, 2))
	tree:add(F.unknown, buffer(0, 2))
end

function setPowerState(buffer, pinfo, tree)
	tree:add(F.onoffReq, buffer(0, 1))
end

function powerState(buffer, pinfo, tree)
	tree:add(F.onoffRes, buffer(0, 2))
end

function bulbLabel(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0, 32))
end

function setBulbLabel(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0, 32))
end

function tags(buffer, pinfo, tree)
	tree:add(F.tags, buffer(0, 8))
end

function mcuRailVoltage(buffer, pinfo, tree)
	tree:add(F.voltage, buffer(0, 4))
end

function setLightColour(buffer, pinfo, tree)
	tree:add(F.stream       , buffer(0, 1))
	tree:add_le(F.hue       , buffer(1, 2))
	tree:add_le(F.saturation, buffer(3, 2))
	tree:add_le(F.brightness, buffer(5, 2))
	tree:add_le(F.kelvin    , buffer(7, 2))
	tree:add_le(F.fadeTime  , buffer(9, 4))
end

function setWaveform(buffer, pinfo, tree)
	tree:add(F.stream       , buffer(0 , 1))
	tree:add(F.transient    , buffer(1 , 1))
	tree:add_le(F.hue       , buffer(2 , 2))
	tree:add_le(F.saturation, buffer(4 , 2))
	tree:add_le(F.brightness, buffer(6 , 2))
	tree:add_le(F.kelvin    , buffer(8 , 2))
	tree:add_le(F.period    , buffer(10, 4))
	tree:add(F.cycles       , buffer(14, 4))
	tree:add(F.waveform     , buffer(18, 1))
end

function setDimAbsolute(buffer, pinfo, tree)
	tree:add_le(F.brightness, buffer(0, 2))
	tree:add_le(F.fadeTime  , buffer(2, 4))
end

function setDimRelative(buffer, pinfo, tree)
	tree:add_le(F.brightness, buffer(0, 2))
	tree:add_le(F.fadeTime  , buffer(2, 4))
end

function lightStatus(buffer, pinfo, tree)
	tree:add_le(F.hue       , buffer(0 , 2))
	tree:add_le(F.saturation, buffer(2 , 2))
	tree:add_le(F.brightness, buffer(4 , 2))
	tree:add_le(F.kelvin    , buffer(6 , 2))
	tree:add(F.dim          , buffer(8 , 2))
	tree:add(F.power        , buffer(10, 2))
	tree:add(F.bulbName     , buffer(12, 32))
	tree:add(F.tags         , buffer(44, 8))
end

function getWifiState(buffer, pinfo, tree)
	tree:add(F.interface, buffer(0, 1))
end

function wifiState(buffer, pinfo, tree)
	tree:add(F.interface , buffer(0, 1))
	tree:add(F.wifiStatus, buffer(1, 1))
	tree:add(F.ip4Address, buffer(2, 4))
	tree:add(F.ip6Address, buffer(6, 16))
end

function setAccessPoint(buffer, pinfo, tree)
	tree:add(F.interface       , buffer(0 , 1))
	tree:add(F.ssid            , buffer(1 , 32))
	tree:add(F.password        , buffer(33, 64))
	tree:add(F.securityProtocol, buffer(97, 1))
end

packetTable = switch {
	[0x0002] = getPanGateway,
	[0x0003] = deviceStateResponse,
	[0x0004] = getTime,
	[0x0005] = setTime,
	[0x0006] = timeState,
	[0x0007] = getResetSwitch,
	[0x0008] = resetSwitchState,
	[0x0009] = getDummyLoad,
	[0x000a] = setDummyLoad,
	[0x000b] = dummyLoad,
	[0x000c] = getMeshInfo,
	[0x000d] = meshInfo,
	[0x000e] = getMeshFirmware,
	[0x000f] = meshFirmwareState,
	[0x0010] = getWifiInfo,
	[0x0011] = wifiInfo,
	[0x0012] = getWifiFirmwareState,
	[0x0013] = wifiFirmwareState,
	[0x0014] = getPowerState,
	[0x0015] = setPowerState,
	[0x0016] = powerState,
	[0x0017] = getBulbLabel,
	[0x0018] = setBulbLabel,
	[0x0019] = bulbLabel,
	[0x001a] = getTags,
	[0x001c] = tags,
	[0x001d] = getTagLabels,
	[0x001f] = tagLabels,
	[0x0020] = getVersion,
	[0x0022] = getInfo,
	[0x0023] = info,
	[0x0024] = getMcuRailVoltage,
	[0x0025] = mcuRailVoltage,
	[0x0026] = reboot,
	[0x0065] = getLightState,
	[0x0066] = setLightColour,
	[0x0067] = setWaveform,
	[0x0068] = setDimAbsolute,
	[0x0069] = setDimRelative,
	[0x006b] = lightStatus,
	[0x012d] = getWifiState,
	[0x012e] = setWifiState,
	[0x012f] = wifiState,
	[0x0130] = getAccessPoints,
	[0x0131] = setAccessPoint,
	[0x0132] = accessPoint
}

F.size             = ProtoField.uint16("lifx.size"           , "Packet size"          , base.HEX)
F.protocol         = ProtoField.uint16("lifx.protocol"       , "LIFX protocol"        , base.HEX)
F.reserved         = ProtoField.bytes("lifx.reserved"        , "Reserved"             , base.HEX)
F.targetAddr       = ProtoField.ether("lifx.targetAddr"      , "Target address"       , base.HEX)
F.site             = ProtoField.ether("lifx.site"            , "Site address"         , base.HEX)
F.timestamp        = ProtoField.uint64("lifx.timestamp"      , "Timestamp"            , base.HEX)
F.packetType       = ProtoField.uint16("lifx.packetType"     , "Packet type"          , base.HEX , packetNames)

F.unknown          = ProtoField.bytes("lifx.unknown"         , "Unknown"              , base.HEX)
F.onoffReq         = ProtoField.uint8("lifx.onoff"           , "On/off setting"       , base.HEX , onOffStrings)
F.bulbName         = ProtoField.string("lifx.bulbName"       , "Bulb name"            , base.HEX)
F.hue              = ProtoField.uint16("lifx.hue"            , "Hue"                  , base.HEX)
F.saturation       = ProtoField.uint16("lifx.saturation"     , "Saturation"           , base.HEX)
F.brightness       = ProtoField.uint16("lifx.brightness"     , "Brightness"           , base.HEX)
F.kelvin           = ProtoField.uint16("lifx.kelvin"         , "Colour temperature"   , base.HEX)
F.fadeTime         = ProtoField.uint16("lifx.fadeTime"       , "Fade time"            , base.HEX)
F.onoffRes         = ProtoField.uint16("lifx.onoffResponse"  , "On/off"               , base.HEX , onOffStrings)
F.time             = ProtoField.uint64("lifx.time"           , "Time (us since epoch)", base.HEX)
F.resetSwitch      = ProtoField.uint8("lifx.resetSwitch"     , "Reset switch"         , base.HEX , resetSwitchStrings)
F.tags             = ProtoField.uint64("lifx.tags"           , "Tags"                 , base.HEX)
F.voltage          = ProtoField.uint64("lifx.voltage"        , "Voltage"              , base.HEX)
F.stream           = ProtoField.uint8("lifx.stream"          , "Stream"               , base.HEX)
F.transient        = ProtoField.uint8("lifx.transient"       , "Transient"            , base.HEX)
F.period           = ProtoField.uint32("lifx.period"         , "Period"               , base.HEX)
F.cycles           = ProtoField.float("lifx.cycles"          , "Cycles"               , base.HEX)
F.waveform         = ProtoField.uint8("lifx.waveform"        , "Waveform"             , base.HEX)
F.dim              = ProtoField.uint16("lifx.dim"            , "Dim"                  , base.HEX)
F.power            = ProtoField.uint16("lifx.power"          , "Power"                , base.HEX)
F.interface        = ProtoField.uint8("lifx.interface"       , "Interface"            , base.HEX , interfaceStrings)
F.wifiStatus       = ProtoField.uint8("lifx.wifiStatus"      , "Wifi status"          , base.HEX , wifiStatusStrings)
F.ip4Address       = ProtoField.bytes("lifx.ip4Address"      , "IP4 address"          , base.HEX)
F.ip6Address       = ProtoField.bytes("lifx.ip6Address"      , "IP6 address"          , base.HEX)
F.ssid             = ProtoField.bytes("lifx.ssid"            , "SSID (UTF8)"          , base.HEX)
F.password         = ProtoField.bytes("lifx.password"        , "Password (UTF8)"      , base.HEX)
F.securityProtocol = ProtoField.bytes("lifx.securityProtocol", "Security protocol"    , base.HEX , securityProtocolStrings)

function lifx.dissector(buffer, pinfo, tree)
	analyse(buffer, pinfo, tree)
end

function analyse(buffer, pinfo, tree)
	pinfo.cols.info = "LIFX"

	-- LE maths on the packet length
	local lifxlength = buffer(0,2):le_uint()

	local subtree = tree:add(buffer(0, lifxlength), "LIFX packet")
	subtree:add_le(F.size, buffer(0,2))
	subtree:add(F.protocol, buffer(2,2))
	subtree:add(F.reserved, buffer(4,4))
	subtree:add(F.targetAddr, buffer(8,6))
	subtree:add(F.reserved, buffer(14,2))
	subtree:add(F.site, buffer(16,6))
	subtree:add(F.reserved, buffer(22,2))
	subtree:add(F.timestamp, buffer(24,8))
	local packetPayload = subtree:add_le(F.packetType, buffer(32,2))
	subtree:add(F.reserved, buffer(34,2))

	-- Call the packet-specific handler
	packetTable:case(buffer(32,2):le_uint(), buffer(36), pinfo, packetPayload)

	-- Check if there's another LIFX packet inside this TCP packet
	if (lifxlength > 0 and buffer:len() > lifxlength) then
		analyse(buffer(lifxlength), pinfo, tree)
	end


end

local tcpTable = DissectorTable.get("tcp.port")
tcpTable:add(56700, lifx)
local udpTable = DissectorTable.get("udp.port")
udpTable:add(56700, lifx)

