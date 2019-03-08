<?php
function socketQuery($data) {
  $socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
  if($socket === false) {
    return null;
  }

  $result = socket_connect($socket, "127.0.0.1", 55942);
  if($result === false) {
    return null;
  }

  socket_write($socket, $data, strlen($data));

  $out = "";
  while($buf = socket_read($socket, 2048)) {
    $out .= $buf;
  }
  
  socket_shutdown($socket);
  socket_close($socket);

  return $out;
}
?>
