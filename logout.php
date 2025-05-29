<?php
// logout.php
require_once 'config.php'; // Ensures session_start() is called
require_once 'auth_check.php';

logoutUser();
header('Location: index.php');
exit;
?>