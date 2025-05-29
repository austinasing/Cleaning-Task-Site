<?php
// config.php

// Authentication credentials
define('LOGIN_USER', 'roommate');
define('LOGIN_PASSWORD_HASH', '$2y$10$UkqUc6ueVcEeU5KshHH7lewtZLrtI1u78kb9X2YE/F1OAEimH5fnC'); // Replace with your generated hash

// Remember me cookie settings
define('REMEMBER_ME_COOKIE_NAME', 'cleaning_remember_me');
define('REMEMBER_ME_COOKIE_DURATION', 60 * 60 * 24 * 30); // 30 days in seconds

// Start sessions globally
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
?>