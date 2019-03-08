<?php
if(!array_key_exists("ruleid", $_GET)) {
  http_response_code(400);
  exit("Missing parameter");
}

$ruleid = intval($_GET["ruleid"]);

$output = array();

$conn = mysqli_connect("localhost", "php", "password", "hab");
if(!$conn) {
  http_response_code(500);
  exit("Connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "utf8mb4");

$stmt = mysqli_stmt_init($conn);
$stmt->prepare("SELECT action, title FROM rules WHERE id=?");
$stmt->bind_param('i', $ruleid);
$stmt->execute();
$result = mysqli_stmt_get_result($stmt);
if(mysqli_num_rows($result) > 0) {
  $row = mysqli_fetch_assoc($result);
  $output["action"] = $row["action"];
  $output["title"] = $row["title"];
} else {
  $output["action"] = "[]";
  $output["title"] = null;
}
$stmt->close();

$stmt = mysqli_stmt_init($conn);
$stmt->prepare("SELECT trigger_id, trigger_name, trigger_group, trigger_messagename, trigger_oldstate, trigger_newstate FROM triggers WHERE ruleid=?");
$stmt->bind_param('i', $ruleid);
$stmt->execute();
$result = mysqli_stmt_get_result($stmt);
$num_rows = mysqli_num_rows($result);
if($num_rows > 0) {
  $triggers = array();
  for($i = 0; $i < $num_rows; $i++) {
    $row = mysqli_fetch_assoc($result);
    array_push($triggers, $row);
  }
  $output["triggers"] = $triggers;
} else {
  $output["triggers"] = array();
}
$stmt->close();

echo json_encode($output);
?>
