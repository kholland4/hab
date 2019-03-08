<?php
$conn = mysqli_connect("localhost", "php", "password", "hab");
if(!$conn) {
  http_response_code(500);
  exit("Connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "utf8mb4");

$output = [];

$result = mysqli_query($conn, "SELECT * FROM nodes");
$num_rows = mysqli_num_rows($result);
if($num_rows > 0) {
  $triggers = array();
  for($i = 0; $i < $num_rows; $i++) {
    $row = mysqli_fetch_assoc($result);
    array_push($output, array(
      "id" => $row["id"],
      "name" => $row["name"],
      "groups" => $row["groups"],
      "display_name" => $row["display_name"],
      "default_control_type" => $row["default_control_type"]
    ));
  }
}

echo json_encode($output);
?>
