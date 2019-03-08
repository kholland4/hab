<?php
require "socket.php";

if(!array_key_exists("data", $_POST)) {
  http_response_code(400);
  exit("Missing parameter");
}

$data = str_replace("\0", "", $_POST["data"]); //TODO: sanitize

echo socketQuery("forward" . $data . "\0");
?>
