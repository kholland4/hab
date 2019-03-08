<?php
$conn = mysqli_connect("localhost", "php", "password", "hab");
if(!$conn) {
  http_response_code(500);
  exit("Connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "utf8mb4");

$result = mysqli_query($conn, "INSERT INTO rules (title) VALUES ('Unnamed Rule')");
if($result) {
  $ruleid = mysqli_insert_id($conn);
  header("Location: nodes.html?ruleid=" . intval($ruleid));
  echo "<a href=\"nodes.html?ruleid=" . $ruleid . "\">click to redirect</a>";
} else {
  http_response_code(500);
  echo "Error: " . mysqli_error($conn) . "\n";
  exit();
}
mysqli_close($conn);
?>
