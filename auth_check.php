<?php
// auth_check.php
require_once 'config.php';

function isUserLoggedIn() {
    if (isset($_SESSION['user_logged_in']) && $_SESSION['user_logged_in'] === true) {
        return true;
    }
    if (isset($_COOKIE[REMEMBER_ME_COOKIE_NAME]) && $_COOKIE[REMEMBER_ME_COOKIE_NAME] === 'yes') { // Be more specific with cookie value check
        $_SESSION['user_logged_in'] = true;
        $_SESSION['username'] = LOGIN_USER; // Re-establish username if needed
        return true;
    }
    return false;
}

// This function is now primarily for protecting API endpoints.
function ensureUserIsLoggedInApi() {
    if (!isUserLoggedIn()) {
        header('Content-Type: application/json');
        // Send a 401 Unauthorized status code as well
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required. Please log in.', 'action' => 'logout']);
        exit;
    }
}

function loginUser($username, $password, $rememberMe = false) {
    if ($username === LOGIN_USER && password_verify($password, LOGIN_PASSWORD_HASH)) {
        $_SESSION['user_logged_in'] = true;
        $_SESSION['username'] = $username;

        if ($rememberMe) {
            setcookie(REMEMBER_ME_COOKIE_NAME, 'yes', time() + REMEMBER_ME_COOKIE_DURATION, "/");
        } else {
            // If "remember me" is not checked, ensure any old "remember me" cookie is cleared
            if (isset($_COOKIE[REMEMBER_ME_COOKIE_NAME])) {
                unset($_COOKIE[REMEMBER_ME_COOKIE_NAME]);
                setcookie(REMEMBER_ME_COOKIE_NAME, '', time() - 3600, '/');
            }
        }
        return true;
    }
    return false;
}

function logoutUser() {
    $_SESSION = array();

    if (isset($_COOKIE[REMEMBER_ME_COOKIE_NAME])) {
        unset($_COOKIE[REMEMBER_ME_COOKIE_NAME]);
        setcookie(REMEMBER_ME_COOKIE_NAME, '', time() - 3600, '/');
    }

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
}
?>