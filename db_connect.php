<?php
// Database credentials
$servername = 'localhost';
$dbname = 'u926222841_cleaning_tasks';
$username = 'u926222841_austin'; 
$password = 'Cleaning44!';

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>