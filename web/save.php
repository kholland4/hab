<?php
if(!array_key_exists("data", $_POST) || !array_key_exists("ruleid", $_POST) || !array_key_exists("title", $_POST)) {
  http_response_code(400);
  exit("Missing parameter");
}

$data = $_POST["data"];
$title = $_POST["title"];
$ruleid = intval($_POST["ruleid"]);

$conn = mysqli_connect("localhost", "php", "password", "hab");
if(!$conn) {
  http_response_code(500);
  exit("Connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "utf8mb4");

$stmt = mysqli_stmt_init($conn);
$stmt->prepare("UPDATE rules SET action=?, title=? WHERE id=?");
$stmt->bind_param('ssi', $data, $title, $ruleid);
$stmt->execute();
$result = mysqli_stmt_get_result($stmt);
if(!$result) {
  //echo "ok";
} else {
  http_response_code(500);
  echo "Error: " . mysqli_error($conn) . "\n";
  exit();
}
$stmt->close();

if(array_key_exists("triggers", $_POST)) {
  $triggerData = json_decode($_POST["triggers"], true);
  
  $stmt = mysqli_stmt_init($conn);
  $stmt->prepare("DELETE FROM triggers WHERE ruleid=?");
  $stmt->bind_param('i', $ruleid);
  $stmt->execute();
  $result = mysqli_stmt_get_result($stmt);
  if(!$result) {
    //echo "ok";
  } else {
    http_response_code(500);
    echo "Error: " . mysqli_error($conn) . "\n";
    exit();
  }
  $stmt->close();
  
  var_dump($triggerData);
  foreach($triggerData as $trigger) {
    $props = array("trigger_id", "trigger_name", "trigger_group", "trigger_messagename", "trigger_oldstate", "trigger_newstate");
    foreach($props as $prop) {
      if(!array_key_exists($prop, $trigger)) {
        $trigger[$prop] = null;
      }
    }
    
    $stmt = mysqli_stmt_init($conn);
    $stmt->prepare("INSERT INTO triggers (ruleid, trigger_id, trigger_name, trigger_group, trigger_messagename, trigger_oldstate, trigger_newstate) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('iisssss', $ruleid, $trigger["trigger_id"], $trigger["trigger_name"], $trigger["trigger_group"], $trigger["trigger_messagename"], $trigger["trigger_oldstate"], $trigger["trigger_newstate"]);
    $stmt->execute();
    $result = mysqli_stmt_get_result($stmt);
    if(!$result) {
      //echo "ok";
    } else {
      http_response_code(500);
      echo "Error: " . mysqli_error($conn) . "\n";
      exit();
    }
    $stmt->close();
  }
}

mysqli_close($conn);
?>
