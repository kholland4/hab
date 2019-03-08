<?php
if(!array_key_exists("ruleid", $_GET)) {
  http_response_code(400);
  exit("Missing parameter");
}

$ruleid = intval($_GET["ruleid"]);

$conn = mysqli_connect("localhost", "php", "password", "hab");
if(!$conn) {
  http_response_code(500);
  exit("Connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "utf8mb4");

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
$stmt = mysqli_stmt_init($conn);
$stmt->prepare("DELETE FROM rules WHERE id=?");
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

header("Location: rulelist.php");
?>
