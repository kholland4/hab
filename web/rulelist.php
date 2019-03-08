<?php
$conn = mysqli_connect("localhost", "php", "password", "hab");
if(!$conn) {
  http_response_code(500);
  exit("Connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, "utf8mb4");

$result = mysqli_query($conn, "SELECT id, title FROM rules");
$num_rows = mysqli_num_rows($result);
if($num_rows > 0) {
  for($i = 0; $i < $num_rows; $i++) {
    $row = mysqli_fetch_assoc($result);
    $title = $row["title"];
    if($row["title"] == null) {
      $title = "Unnamed Rule (id " . $row["id"] . ")";
    }
    echo "<a href=\"nodes.html?ruleid=" . $row["id"] . "\">" . htmlspecialchars($title) . "</a>&nbsp;&nbsp;&nbsp;<a href=\"deleterule.php?ruleid=" . $row["id"] . "\">x</a><br>\n";
  }
}
?>
<button onclick="location.href='newrule.php';">+ New Rule</button>
