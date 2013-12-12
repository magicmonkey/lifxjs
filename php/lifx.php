<?php
class LiFx {
  public static $GATEWAY = "0000-0015";
  public static $GATEWAYADDR = "0015-0008";
  private $gateway;
  private $gatewayaddr;

  private function getshmo($key) {
    $id = shmop_open(0xdeadbeef, "c", 0644, 10000);
    $start = (int)($key[0].$key[1].$key[2].$key[3]);
    $len =   (int)($key[5].$key[6].$key[7].$key[8]);
    $string = shmop_read($id, $start, $len);
    shmop_close($id);
    return $string;
  }

  private function putshmo($key, $value) {
    $start = (int)($key[0].$key[1].$key[2].$key[3]);
    $len =   (int)($key[5].$key[6].$key[7].$key[8]);
    if($len < strlen($value)) {
      echo "$value is too long for $key\n";
    }
    $id = shmop_open(0xdeadbeef, "c", 0644, 10000);
    shmop_write($id, $value, $start);
    shmop_close($id);
  }

  public function establishConnection() {
    $pid = pcntl_fork();
    if($pid == -1) {
      die("Error forking for establish\n");
    } elseif($pid == 0) {

    } else {
      echo "Creating socket to gateway ";
      $socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
      socket_connect($socket, $this->gateway, 56700);
      $continue = true;
      while($continue) {
        $command = file_get_contents("pendingCommand");
        if($command == "") {
          sleep(1);
        } else {
          echo $command;
          file_put_contents("pendingCommand", "");
          if(strpos($command, "/status") !== false) {
            $command = str_replace("/status/", "", $command);
            if($command == "/status")
              $packet = Packet::StatusRequest();
            else
              $packet = Packet::StatusRequest($command);
          } elseif(strpos($command, "/turn/on") !== false) {
            $command = str_replace("/turn/on/", "", $command);
            if($command == "/turn/on")
              $packet = Packet::On();
            else
              $packet = Packet::On($command);
          } elseif(strpos($command, "/turn/off") !== false) {
            $command = str_replace("/turn/off/", "", $command);
            if($command == "/turn/off")
              $packet = Packet::Off();
            else
              $packet = Packet::Off($command);
          } elseif(strpos($command, "/set/") !== false) {
            $color = substr($command, 5, 4);
            $saturation = substr($command, 10, 4);
            $bright = substr($command, 15, 4);
            $white = substr($command, 20, 4);
            $time = substr($command, 25, 4);
            if(strlen($command) == 29)
              $packet = Packet::Set($color, $saturation, $bright, $white, $time);
            else {
              $target = substr($command, -16);
              $packet = Packet::Set($color, $saturation, $bright, $white, $time, $target);
            }
          }
          echo "\nSending packet " . bin2hex($packet) . "\n";
          socket_write($socket, $packet);
        }
      }
      echo "Leaving establish";
    }
  }
  //Listen to UDP packets on 56700 for messages from lifx                                                                                                                                                                                                                                                  
  //Create TCP socket to send commands to lifx                                                                                                                                                                                                                                                             
  //Listen to UDP packets on 56701 for messages from user                                                                                                                                                                                                                                                  
  public function disco() {
    $this->putshmo(LiFx::$GATEWAY, "               ");
    $pid = pcntl_fork();
    if($pid == -1) {
      die("Error forking for disco");
    } elseif($pid != 0) {
      $disco = Packet::Discovery();
      sleep(1);
      $socket = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
      $opt_ret = socket_set_option($socket, SOL_SOCKET, SO_BROADCAST, TRUE);
      if($opt_ret < 0) {
        echo "setsockopt() failed, error: " . strerror($opt_ret) . "\n";
      }
      while(trim($this->getshmo(LiFx::$GATEWAY)) == "") {
        echo "Sending Discovery Request\n";
        sleep(1);
        socket_sendto($socket, $disco, strlen($disco), 0, "10.0.1.255", 56700);
      }
      $this->gateway = trim($this->getshmo(LiFx::$GATEWAY));
      $this->gatewayaddr = $this->getshmo(LiFx::$GATEWAYADDR);
      Packet::$gateway = $this->gatewayaddr;
      echo "Found Gateway: --" . $this->gateway . "--\n";
      echo "Gatway Addr: " . $this->gatewayaddr . "\n";
      socket_close($socket);
      $this->establishConnection();
      return;
    }

    $sock = socket_create_listen(56700);
    $sock = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
    socket_bind($sock, "0.0.0.0", 56700);
    socket_getsockname($sock, $addr, $port);
    print "Server Listening on $addr:$port\n";
    $buffer = '';
    $from = '';
    $port = '';
    while($len = socket_recvfrom($sock, $buffer, 1024, 0, $from, $port)) {
      if($port != 56700) continue;
      if($buffer[32] == "\x03") {
        $this->putshmo(LiFx::$GATEWAY, $from);
        $this->putshmo(LiFx::$GATEWAYADDR, substr($buffer, 16, 8));
        $this->queueResponse(array("ip" => $from, "addr" => bin2hex(substr($buffer, 16, 8))));
      } elseif($buffer[32] == "\x6b") {
        $color = substr($buffer, 36, 2);
        $saturation = substr($buffer, 38, 2);
        $luminance = substr($buffer, 40, 2);
        $temp = substr($buffer, 42, 2);
        $onoff = substr($buffer, 46, 2);
        $onoff = $onoff == 0xffff ? 'on' : 'off';
        $name = substr($buffer, 48);
        $data = array("bulb" => bin2hex(substr($buffer, 8, 8)), "color" => bin2hex($color), "sat" => bin2hex($saturation), "lum" => bin2hex($luminance), "temp" => bin2hex($temp), "status" => $onoff, "name" => trim($name));
        $this->queueResponse($data);
      } elseif($buffer[32] == "\x16") {
        $onoff = substr($buffer, 36, 2);
        $onoff = $onoff == 0xffff ? 'on' : 'off';
        $data = array("bulb" => bin2hex(substr($buffer, 8, 8)), "status" => $onoff);
        $this->queueResponse($data);
      } else {
        $this->queueResponse(array("bulb" => bin2hex(substr($buffer, 8, 8)), "type" => bin2hex($buffer[32]), "body" => bin2hex(substr($buffer, 32))));
      }
    }
    socket_close($sock);
    exit;
  }

  private function queueResponse($data) {
    $file = fopen("pendingResponse", "a");
    fwrite($file, json_encode($data) . "\n");
    fclose($file);
  }
}
?>
