<?php
// Handles requests for late tasks

require_once 'db_functions.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => 'Invalid request'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        debugLog("LateTask API - POST action: " . $_POST['action']);
        switch ($_POST['action']) {
            case 'addLateTask':
                if (isset($_POST['name'], $_POST['day'], $_POST['task']) &&
                    !empty(trim($_POST['name'])) &&
                    !empty(trim($_POST['day'])) &&
                    !empty(trim($_POST['task']))) {
                    
                    $name = trim($_POST['name']);
                    $day = trim($_POST['day']);
                    $task = trim($_POST['task']);
                    $response = addLateTask($name, $day, $task);
                } else {
                    $response['message'] = 'Missing or empty required fields (name, day, task)';
                }
                break;
            default:
                $response['message'] = 'Invalid POST action: ' . $_POST['action'];
                break;
        }
    } else {
        $response['message'] = 'Missing action parameter in POST request';
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action'])) {
        debugLog("LateTask API - GET action: " . $_GET['action']);
        switch ($_GET['action']) {
            case 'getLateTasks':
                $lateTasks = getLateTasks();
                $response = ['success' => true, 'lateTasks' => $lateTasks];
                break;
            case 'getAllRoommates': // Action to get roommates for the dropdown
                $roommates = getAllRoommates();
                $response = ['success' => true, 'roommates' => $roommates];
                break;
            default:
                $response['message'] = 'Invalid GET action: ' . $_GET['action'];
                break;
        }
    } else {
        $response['message'] = 'Missing action parameter in GET request';
    }
} else {
    $response['message'] = 'Invalid request method: ' . $_SERVER['REQUEST_METHOD'];
}

echo json_encode($response);
?>