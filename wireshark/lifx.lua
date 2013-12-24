local lifx = Proto("lifx", "LIFX wifi lightbulb")

local onOffStrings = {
	[0x0000] = "Off",
	[0x0001] = "On",
	[0xffff] = "On"
}

local F = lifx.fields

F.size       = ProtoField.uint16("lifx.size"         , "Packet size"                 , base.HEX)
F.protocol   = ProtoField.uint16("lifx.protocol"     , "LIFX protocol"               , base.HEX)
F.reserved   = ProtoField.bytes("lifx.reserved"      , "Reserved"                    , base.HEX)
F.targetAddr = ProtoField.ether("lifx.targetAddr"    , "Target address"              , base.HEX)
F.site       = ProtoField.ether("lifx.site"          , "Site address"                , base.HEX)
F.timestamp  = ProtoField.uint64("lifx.timestamp"    , "Timestamp"                   , base.HEX)
F.packetType = ProtoField.uint16("lifx.packetType"   , "Packet type"                 , base.HEX)

F.unknown1   = ProtoField.uint8("lifx.unknown1"      , "Unknown - always 1 or 2"     , base.HEX)
F.unknown2   = ProtoField.uint32("lifx.unknown2"     , "Unknown - always 7c dd 00 00", base.HEX)
F.onoffReq   = ProtoField.uint8("lifx.onoff"         , "On/off setting"              , base.HEX, onOffStrings)
F.bulbName   = ProtoField.string("lifx.bulbName"     , "Bulb name"                   , base.HEX)
F.hue        = ProtoField.uint16("lifx.hue"          , "Hue"                         , base.HEX)
F.saturation = ProtoField.uint16("lifx.saturation"   , "Saturation"                  , base.HEX)
F.luminance  = ProtoField.uint16("lifx.luminance"    , "Luminance"                   , base.HEX)
F.colourTemp = ProtoField.uint16("lifx.colourTemp"   , "Colour temperature"          , base.HEX)
F.fadeTime   = ProtoField.uint16("lifx.fadeTime"     , "Fade time"                   , base.HEX)
F.onoffRes   = ProtoField.uint16("lifx.onoffResponse", "On/off"                      , base.HEX, onOffStrings)

function switch(t)
	t.case = function (self, pType, buffer, pinfo, tree)
		local f=self[pType] or self.default
		if f then
			-- local subtree = tree:add(f[2])
			tree:append_text(" ("..f[2]..")")
			pinfo.cols.info = f[2]
			if type(f[1])=="function" then
				f[1](buffer, pinfo, tree, self)
			end
		end
	end
	return t
end

function unknownPacket(buffer, pinfo, tree)
	print("Unknown packet "..buffer(0,2):uint().." in packet number "..pinfo.number)
end

-- 0x03 or 768
function deviceState(buffer, pinfo, tree)
	tree:add(F.unknown1, buffer(0, 1))
	tree:add(F.unknown2, buffer(1, 4))
end

-- 0x15 or 5376
function onoffRequest(buffer, pinfo, tree)
	tree:add(F.onoffReq, buffer(0, 1))
end

-- 0x18 or 6144
function changeName(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0))
end

-- 0x66 or 26112
function setBulbState(buffer, pinfo, tree)
	tree:add_le(F.hue, buffer(1,2))
	tree:add_le(F.saturation, buffer(3,2))
	tree:add_le(F.luminance,  buffer(5,2))
	tree:add_le(F.colourTemp, buffer(7,2))
	tree:add_le(F.fadeTime,   buffer(8,2))
end

-- 0x16 or 5632
function onoffResponse(buffer, pinfo, tree)
	tree:add(F.onoffRes, buffer(0, 2))
end

-- 0x19 or 6400
function changeNameResponse(buffer, pinfo, tree)
	tree:add(F.bulbName, buffer(0))
end

-- 0x6b or 27392
function statusResponse(buffer, pinfo, tree)
	tree:add_le(F.hue       , buffer(0 , 2))
	tree:add_le(F.saturation, buffer(2 , 2))
	tree:add_le(F.luminance , buffer(4 , 2))
	tree:add_le(F.colourTemp, buffer(6 , 2))
	tree:add(F.reserved     , buffer(8 , 2))
	tree:add(F.onoffRes     , buffer(10, 2))
	tree:add(F.bulbName     , buffer(12))
end

packetTable = switch {
	[768]   = { deviceState       , "Device state response"},
	[512]   = { nil               , "Get PAN Gateway"},
	[5376]  = { onoffRequest      , "On/off request"},
	[6144]  = { changeName        , "Change name request"},
	[25856] = { nil               , "Status request"},
	[26112] = { setBulbState      , "Set bulb state"},
	[5632]  = { onoffResponse     , "On/off response"},
	[6400]  = { changeNameResponse, "Change name response"},
	[27392] = { statusResponse    , "Status response"},
	[26624] = { nil               , "Set dim - absolute"},
	[26880] = { nil               , "Set dim - relative"},
	[12033] = { nil               , "Wifi state"},
	default = { unknownPacket     , "Unknown packet"}
}

function lifx.dissector(buffer, pinfo, tree)
	analyse(buffer, pinfo, tree)
end

function analyse(buffer, pinfo, tree)
	pinfo.cols.info = "LIFX"

	-- LE maths on the packet length
	local lifxlength = buffer(0,1):uint() + (buffer(1,1):uint() * 256)

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

	-- local pSubtree = subtree:add(buffer(36, lifxlength-36), "Payload")
	packetTable:case(buffer(32,2):uint(), buffer(36), pinfo, packetPayload)

	-- Check if there's another LIFX packet inside this TCP packet
	if (lifxlength > 0 and buffer:len() > lifxlength) then
		analyse(buffer(lifxlength), pinfo, tree)
	end


end

local tcpTable = DissectorTable.get("tcp.port")
tcpTable:add(56700, lifx)
local udpTable = DissectorTable.get("udp.port")
udpTable:add(56700, lifx)

