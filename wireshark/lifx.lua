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

local truefalseStrings = {
   [0] = "False",
   [1] = "True"
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

local serviceStrings = {
	[1] = "UDP",
	[2] = "TCP"
}

packetNames = {
	[0x0002]   = "Get Service",
	[0x0003]   = "State Service",
	[0x0004]   = "Get time",
	[0x0005]   = "Set time",
	[0x0006]   = "Time state",
	[0x0007]   = "Get reset switch state",
	[0x0008]   = "Reset switch state",
	[0x0009]   = "Get dummy load",
	[0x000a]   = "Set dummy load",
	[0x000b]   = "Dummy load",
	[0x000c]   = "Get host info",
	[0x000d]   = "State host info",
	[0x000e]   = "Get host firmware",
	[0x000f]   = "State Host firmware",
	[0x0010]   = "Get wifi info",
	[0x0011]   = "State wifi info",
	[0x0012]   = "Get wifi firmware state",
	[0x0013]   = "State wifi firmware",
	[0x0014]   = "Get power",
	[0x0015]   = "Set power",
	[0x0016]   = "State Power",
	[0x0017]   = "Get bulb label",
	[0x0018]   = "Set bulb label",
	[0x0019]   = "State bulb label",
	[0x001a]   = "Get tags",
	[0x001b]   = "Set tags",
	[0x001c]   = "Tags",
	[0x001d]   = "Get tag labels",
	[0x001e]   = "Set tag labels",
	[0x001f]   = "Tag labels",
	[0x0020]   = "Get version",
	[0x0021]   = "State version",
	[0x0022]   = "Get info",
	[0x0023]   = "State Info",
	[0x0024]   = "Get MCU rail voltage",
	[0x0025]   = "MCU rail voltage",
	[0x0026]   = "Reboot",
	[0x0027]   = "Set factory test mode",
	[0x0028]   = "Disable factory test mode",
	[0x002D]   = "Acknowledgement",
	[0x0030]   = "Get location",
	[0x0032]   = "State location",
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

function panGatewayState(buffer, pinfo, tree)
	tree:add(F.service, buffer(0, 1))
	tree:add_le(F.port, buffer(1, 4))
end

function setTime(buffer, pinfo, tree)
	tree:add(F.time, buffer(0, 8))
end

function timeState(buffer, pinfo, tree)
	tree:add(F.time, buffer(0, 8))
end

function resetSwitchState(buffer, pinfo, tree)
	tree:add(F.resetSwitch, buffer(0, 1))
end

function hostInfo(buffer, pinfo, tree)
	tree:add(F.signal, buffer(0, 4))
	tree:add(F.tx, buffer(4, 4))
	tree:add(F.rx, buffer(8, 4))
	tree:add(F.reserved, buffer(12, 2))
end

function hostFirmwareState(buffer, pinfo, tree)
   tree:add(F.buildTime, buffer(0,8))
   tree:add(F.reserved, buffer(8,8))
	tree:add(F.version, buffer(18, 4))
end

function wifiInfo(buffer, pinfo, tree)
	tree:add(F.signal, buffer(0, 4))
	tree:add(F.tx, buffer(4, 4))
	tree:add(F.rx, buffer(8, 4))
	tree:add(F.reserved, buffer(12, 2))
end

function wifiFirmwareState(buffer, pinfo, tree)
   tree:add(F.buildTime, buffer(0,8))
   tree:add(F.reserved, buffer(8,8))
	tree:add(F.version, buffer(18, 4))
end

function setPowerState(buffer, pinfo, tree)
	tree:add(F.onoff, buffer(0, 2))
end

function powerState(buffer, pinfo, tree)
	tree:add(F.onoff, buffer(0, 2))
end

function bulbLabel(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0, 32))
end

function setBulbLabel(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0, 32))
end

function setTags(buffer, pinfo, tree)
	tree:add(F.tags, buffer(0, 8))
end

function tags(buffer, pinfo, tree)
	tree:add(F.tags, buffer(0, 8))
end

function getTagLabels(buffer, pinfo, tree)
	tree:add(F.tags, buffer(0, 8))
end

function setTagLabels(buffer, pinfo, tree)
	tree:add(F.tags,  buffer(0, 8))
	tree:add(F.label, buffer(8, 40))
end

function tagLabels(buffer, pinfo, tree)
	tree:add(F.tags,  buffer(0, 8))
	tree:add(F.label, buffer(8, 40))
end

function versionState(buffer, pinfo, tree)
	tree:add(F.vendor,  buffer(0, 4))
	tree:add(F.product, buffer(4, 4))
	tree:add(F.version,  buffer(8, 4))
end

function infoState(buffer, pinfo, tree)
	tree:add(F.time,     buffer(0,  8))
	tree:add(F.uptime,   buffer(8,  8))
	tree:add(F.downtime, buffer(16, 8))
end

function mcuRailVoltage(buffer, pinfo, tree)
	tree:add(F.voltage, buffer(0, 4))
end

function setFactoryTestMode(buffer, pinfo, tree)
	tree:add(F.on, buffer(0, 1))
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
	tree:add(F.dutyCycles   , buffer(18, 2))
	tree:add(F.waveform     , buffer(20, 1))
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

function setWifiState(buffer, pinfo, tree)
	tree:add(F.interface , buffer(0, 1))
	tree:add(F.wifiStatus, buffer(1, 1))
	tree:add(F.ip4Address, buffer(2, 4))
	tree:add(F.ip6Address, buffer(6, 16))
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

function accessPoint(buffer, pinfo, tree)
	tree:add(F.interface       , buffer(0 , 1))
	tree:add(F.ssid            , buffer(1 , 32))
	tree:add(F.securityProtocol, buffer(33, 1))
	tree:add(F.strength,         buffer(34, 2))
	tree:add(F.channel,          buffer(36, 2))
end

function stateLocation(buffer, pinfo, tree)
   tree:add(F.location, buffer(0,2))
   tree:add(F.label, buffer(2,4))
   tree:add(F.updatedAt, buffer(4,8))
end

packetLengthTable = {
   [0x0002] = 0,
   [0x0003] = 5,
   [0x0004] = 0,
   [0x0005] = 8,
   [0x0006] = 8,
   [0x0007] = 0,
   [0x0008] = 1,
   [0x0009] = 0,
   [0x000a] = 0,
   [0x000b] = 0,
   [0x000c] = 0,
   [0x000d] = 14,
   [0x000e] = 0,
   [0x000f] = 20,
   [0x0010] = 0,
   [0x0011] = 14,
   [0x0012] = 0,
   [0x0013] = 20,
   [0x0014] = 0,
   [0x0015] = 2,
   [0x0016] = 2,
   [0x0017] = 0,
   [0x0018] = 32,
   [0x0019] = 32,
   [0x001a] = 0,
   [0x001b] = 8,
   [0x001c] = 8,
   [0x001d] = 8,
   [0x001e] = 48,
   [0x001f] = 48,
   [0x0020] = 0,
   [0x0021] = 12,
   [0x0022] = 0,
   [0x0023] = 16,
   [0x0024] = 0,
   [0x0025] = 4,
   [0x0026] = 0,
   [0x0027] = 1,
   [0x0028] = 0,
   [0x002D] = 0,
   [0x0030] = 0,
   [0x0032] = 14
}

packetTable = switch {
	[0x0002] = getPanGateway,
	[0x0003] = panGatewayState,
   [0x0004] = getTime,
	[0x0005] = setTime,
	[0x0006] = timeState,
   [0x0007] = getResetSwitchState,
	[0x0008] = resetSwitchState,
   [0x0009] = getDummyLoad,
	[0x000a] = setDummyLoad,
	[0x000b] = dummyLoad,
	[0x000c] = getHostInfo,
	[0x000d] = hostInfo,
	[0x000e] = getHostFirmware,
	[0x000f] = hostFirmwareState,
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
	[0x001b] = setTags,
	[0x001c] = tags,
	[0x001d] = getTagLabels,
	[0x001e] = setTagLabels,
	[0x001f] = tagLabels,
	[0x0020] = getVersion,
	[0x0021] = versionState,
	[0x0022] = getInfo,
	[0x0023] = infoState,
	[0x0024] = getMcuRailVoltage,
	[0x0025] = mcuRailVoltage,
	[0x0026] = reboot,
	[0x0027] = setFactoryTestMode,
	[0x0028] = disableFactoryTestMode,
   [0x002D] = acknowledgement,
   [0x0030] = getLocation,
   [0x0032] = stateLocation,
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

F.buildTime        = ProtoField.uint64("lifx.buildtime"      , "Build Time"           , base.DEC                                )
F.size             = ProtoField.uint16("lifx.size"           , "Packet size"          , base.DEC                                )
F.protocol         = ProtoField.uint16("lifx.protocol"       , "Protocol"             , base.DEC , nil                  , 0x0FFF)
F.origin           = ProtoField.uint16("lifx.origin"         , "Origin"               , base.DEC , nil                  , 0xC000)
F.tagged           = ProtoField.uint16("lifx.tagged"         , "Tagged"               , base.DEC , nil                  , 0x2000)
F.addressable      = ProtoField.uint16("lifx.addressable"    , "Addressable"          , base.DEC , nil                  , 0x1000)
F.responsereserved = ProtoField.uint8("lifx.resreserved"     , "Reserved"             , base.HEX , nil                  , 0xFC  )
F.responsereq      = ProtoField.uint8("lifx.responsereq"     , "Resp required"        , base.HEX , truefalseStrings     , 0x01  )
F.acqreq           = ProtoField.uint8("lifx.acqreq"          , "Ack required"         , base.HEX , truefalseStrings     , 0x02  )
F.source           = ProtoField.uint32("lifx.source"         , "Source"               , base.HEX                                )
F.sequence         = ProtoField.uint8("lifx.sequence"        , "Sequence"             , base.DEC                                )
F.reserved         = ProtoField.bytes("lifx.reserved"        , "Reserved"             , base.HEX                                )
F.targetAddr       = ProtoField.ether("lifx.targetAddr"      , "Target address"       , base.HEX                                )
F.site             = ProtoField.ether("lifx.site"            , "Site address"         , base.HEX                                )
F.timestamp        = ProtoField.uint64("lifx.timestamp"      , "Timestamp"            , base.HEX                                )
F.packetType       = ProtoField.uint16("lifx.packetType"     , "Packet type"          , base.HEX , packetNames                  )
F.unknown          = ProtoField.bytes("lifx.unknown"         , "Unknown"              , base.HEX                                )
F.onoff            = ProtoField.uint16("lifx.onoff"          , "On/off"               , base.HEX , nOffStrings                 )
F.bulbName         = ProtoField.string("lifx.bulbName"       , "Bulb name"            , base.HEX                                )
F.hue              = ProtoField.uint16("lifx.hue"            , "Hue"                  , base.DEC                                )
F.saturation       = ProtoField.uint16("lifx.saturation"     , "Saturation"           , base.DEC                                )
F.brightness       = ProtoField.uint16("lifx.brightness"     , "Brightness"           , base.DEC                                )
F.kelvin           = ProtoField.uint16("lifx.kelvin"         , "Colour temperature"   , base.DEC                                )
F.fadeTime         = ProtoField.uint16("lifx.fadeTime"       , "Fade time"            , base.DEC                                )
F.time             = ProtoField.uint64("lifx.time"           , "Time (us since epoch)", base.HEX                                )
F.uptime           = ProtoField.uint64("lifx.uptime"         , "Uptime"               , base.DEC                                )
F.uptime           = ProtoField.uint64("lifx.downtime"       , "Downtime"             , base.DEC                                )
F.resetSwitch      = ProtoField.uint8("lifx.resetSwitch"     , "Reset switch"         , base.HEX , resetSwitchStrings           )
F.tags             = ProtoField.uint64("lifx.tags"           , "Tags"                 , base.HEX                                )
F.voltage          = ProtoField.uint64("lifx.voltage"        , "Voltage"              , base.DEC                                )
F.stream           = ProtoField.uint8("lifx.stream"          , "Stream"               , base.HEX                                )
F.transient        = ProtoField.uint8("lifx.transient"       , "Transient"            , base.HEX                                )
F.period           = ProtoField.uint32("lifx.period"         , "Period"               , base.HEX                                )
F.cycles           = ProtoField.float("lifx.cycles"          , "Cycles"               , base.HEX                                )
F.dutyCycles       = ProtoField.uint16("lifx.dutyCycles"     , "Duty cycles"          , base.HEX                                )
F.waveform         = ProtoField.uint8("lifx.waveform"        , "Waveform"             , base.HEX                                )
F.dim              = ProtoField.uint16("lifx.dim"            , "Dim"                  , base.DEC                                )
F.power            = ProtoField.uint16("lifx.power"          , "Power"                , base.HEX , onOffStrings                 )
F.interface        = ProtoField.uint8("lifx.interface"       , "Interface"            , base.DEC , interfaceStrings             )
F.wifiStatus       = ProtoField.uint8("lifx.wifiStatus"      , "Wifi status"          , base.HEX , wifiStatusStrings            )
F.ip4Address       = ProtoField.bytes("lifx.ip4Address"      , "IP4 address"          , base.HEX                                )
F.ip6Address       = ProtoField.bytes("lifx.ip6Address"      , "IP6 address"          , base.HEX                                )
F.ssid             = ProtoField.bytes("lifx.ssid"            , "SSID (UTF8)"          , base.HEX                                )
F.password         = ProtoField.bytes("lifx.password"        , "Password (UTF8)"      , base.HEX                                )
F.securityProtocol = ProtoField.bytes("lifx.securityProtocol", "Security protocol"    , base.HEX , securityProtocolStrings      )
F.signal           = ProtoField.float("lifx.signal"          , "Signal strength in mw", base.DEC                                )
F.tx               = ProtoField.uint32("lifx.tx"             , "Tx"                   , base.DEC                                )
F.rx               = ProtoField.uint32("lifx.rx"             , "Rx"                   , base.DEC                                )
F.mcuTemperature   = ProtoField.uint16("lifx.mcuTemperature" , "MCU temperature"      , base.DEC                                )
F.second           = ProtoField.uint8("lifx.second"          , "Second"               , base.DEC                                )
F.minute           = ProtoField.uint8("lifx.minute"          , "Minute"               , base.DEC                                )
F.hour             = ProtoField.uint8("lifx.hour"            , "Hour"                 , base.DEC                                )
F.day              = ProtoField.uint8("lifx.day"             , "Day"                  , base.DEC                                )
F.month            = ProtoField.bytes("lifx.month"           , "Month"                , base.HEX                                )
F.year             = ProtoField.uint8("lifx.year"            , "Year"                 , base.DEC                                )
F.label            = ProtoField.bytes("lifx.label"           , "Label"                , base.HEX                                )
F.version          = ProtoField.uint32("lifx.version"        , "Version"              , base.HEX                                )
F.product          = ProtoField.uint32("lifx.product"        , "Product"              , base.HEX                                )
F.vendor           = ProtoField.uint32("lifx.vendor"         , "Vendor"               , base.HEX                                )
F.on               = ProtoField.uint8("lifx.on"              , "On"                   , base.HEX                                )
F.strength         = ProtoField.uint8("lifx.strength"        , "Strength"             , base.DEC                                )
F.channel          = ProtoField.uint8("lifx.channel"         , "Channel"              , base.DEC                                )
F.service          = ProtoField.uint8("lifx.service"         , "Service"              , base.HEX , serviceStrings               )
F.port             = ProtoField.uint32("lifx.port"           , "Port"                 , base.DEC                                )
F.location         = ProtoField.uint16("lifx.location"       , "Location"             , base.HEX                                )
F.updatedAt        = ProtoField.uint64("lifx.updated_at"     , "Updated At"           , base.DEC                                )

function lifx.dissector(buffer, pinfo, tree)
	analyse(buffer, pinfo, tree)
end

function analyse(buffer, pinfo, tree)
	pinfo.cols.info = "LIFX"

	-- LE maths on the packet length
	local lifxlength = buffer(0,2):le_uint()

   	local subtree = tree:add(buffer(0, lifxlength), "LIFX packet")
   
   -- FRAME data (bytes 0-7)
   local frametree = subtree:add(buffer(0,8),"Frame")
	frametree:add_le(F.size, buffer(0,2))
   local frameaddrdatatree = frametree:add(buffer(2,2), "Frame Address Tags")
   frameaddrdatatree:add_le(F.origin, buffer(2,2))
   frameaddrdatatree:add_le(F.tagged, buffer(2,2))
   frameaddrdatatree:add_le(F.addressable, buffer(2,2))
	frameaddrdatatree:add_le(F.protocol, buffer(2,2))
   frametree:add(F.source, buffer(4,4))
	
   -- FRAME ADDRESS data (bytes 8-23)
   local frameaddrtree = subtree:add(buffer(8,16), "Frame Address")
   frameaddrtree:add(F.targetAddr, buffer(8,6))
	frameaddrtree:add(F.reserved, buffer(14,2))
	frameaddrtree:add(F.reserved, buffer(16,6))
   local responsedatatree = frameaddrtree:add(buffer(22,1), "Response Data")
   responsedatatree:add(F.responsereserved, buffer(22,1))
   responsedatatree:add(F.acqreq,buffer(22,1))
   responsedatatree:add(F.responsereq,buffer(22,1))
   frameaddrtree:add(F.sequence, buffer(23,1))
   
   -- PROTOCOL data (bytes 24-X)
   local protocolSize = packetLengthTable[buffer(32,2):le_uint()] + 12
   local protocoltree = subtree:add(buffer(24,protocolSize), "Protocol Data")
   protocoltree:add(F.reserved, buffer(24,8))
   protocoltree:add_le(F.packetType, buffer(32,2))
   protocoltree:add(F.reserved, buffer(34,2))
   local packettree = protocoltree:add(buffer(36), "Packet Data")
   packetTable:case(buffer(32,2):le_uint(),buffer(36), pinfo, packettree)
   
	-- Check if there's another LIFX packet inside this TCP packet
	if (lifxlength > 0 and buffer:len() > lifxlength) then
		analyse(buffer(lifxlength), pinfo, tree)
	end


end

local tcpTable = DissectorTable.get("tcp.port")
tcpTable:add(56700, lifx)
local udpTable = DissectorTable.get("udp.port")
udpTable:add(56700, lifx)

