<?php
function hextobin($hexstr)
{
  $n = strlen($hexstr);
  $sbin="";
  $i=0;
  while($i<$n)
    {
      $a =substr($hexstr,$i,2);
      $c = pack("H*",$a);
      if ($i==0){$sbin=$c;}
      else {$sbin.=$c;}
      $i+=2;
    }
  return $sbin;
}
class Packet {
  public static $gateway = '';

  public static function Discovery() {
    return "\x24\x00\x00\x34\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00";
  }
  public static function StatusRequest($target = null) {
    if($target === null) {
      $target = "\x00\x00\x00\x00\x00\x00\x00\x00";
      $to = "\x34";
    } else {
      $target = hextobin($target);
      $to = "\x14";
    }
    return "\x24\x00\x00$to\x00\x00\x00\x00$target" . Packet::$gateway . "\x00\x00\x00\x00\x00\x00\x00\x00\x65\x00\x00\x00";
  }
  public static function On($target = null) {
    if($target === null) {
      $target = "\x00\x00\x00\x00\x00\x00\x00\x00";
      $to = "\x34";
    } else {
      $target = hextobin($target);
      $to = "\x14";
    }
    return "\x26\x00\x00$to\x00\x00\x00\x00$target". Packet::$gateway . "\x00\x00\x00\x00\x00\x00\x00\x00\x15\x00\x00\x00\x01\x00";
  }
  public static function Off($target = null) {
    if($target === null) {
      $target = "\x00\x00\x00\x00\x00\x00\x00\x00";
      $to = "\x34";
    } else {
      $target = hextobin($target);
      $to = "\x14";
    }
    return "\x26\x00\x00$to\x00\x00\x00\x00$target". Packet::$gateway . "\x00\x00\x00\x00\x00\x00\x00\x00\x15\x00\x00\x00\x00\x00";
  }
  public static function Set($col, $sat, $bri, $whi, $tim, $target = null) {
    if($target === null) {
      $target = "\x00\x00\x00\x00\x00\x00\x00\x00";
      $to = "\x34";
    } else {
      $target = hextobin($target);
      $to = "\x14";
    }
    $col = hextobin($col);
    $sat = hextobin($sat);
    $bri = hextobin($bri);
    $whi = hextobin($whi);
    $tim = hextobin($tim);
    return "\x31\x00\x00$to\x00\x00\x00\x00$target". Packet::$gateway . "\x00\x00\x00\x00\x00\x00\x00\x00\x66\x00\x00\x00\x00$col$sat$bri$whi$tim\x00\x00";
  }
}
?>
