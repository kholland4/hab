<?php
/*CREATE TABLE nodes (
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
name TEXT NOT NULL,
groups TEXT NOT NULL,
display_name TEXT,
default_control_type TEXT
)*/
/*CREATE TABLE rules (
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
action MEDIUMTEXT,
title TEXT
)*/
/*CREATE TABLE triggers (
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
ruleid BIGINT UNSIGNED,
trigger_id BIGINT UNSIGNED,
trigger_name TEXT,
trigger_group TEXT,
trigger_messagename TEXT,
trigger_oldstate TEXT,
trigger_newstate TEXT
)*/
$conn = create_sql_connection();

$sql = "";
if(mysqli_query($conn, $sql)) {
  echo "Command successful";
} else {
  echo "Error: " . mysqli_error($conn);
}
mysqli_close($conn);
?>
