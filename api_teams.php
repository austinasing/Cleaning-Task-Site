<?php
//handles requests related to team assignments.

require_once 'auth_check.php';
ensureUserIsLoggedInApi(); // Check session login for submission
require_once 'db_functions.php';

// Set content type to JSON for all responses
header('Content-Type: application/json');

// Process the request based on method and action
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle GET requests
    if (isset($_GET['action'])) {
        switch($_GET['action']) {
            case 'getTasks':
                echo json_encode(getTasks());
                break;
            default:
                echo json_encode([
                    'success' => false, 
                    'message' => 'Invalid action: ' . $_GET['action']
                ]);
        }
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Missing action parameter in GET request'
        ]);
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle POST requests
    if (isset($_POST['action'])) {
        switch($_POST['action']) {
            case 'updateTasks':
                // Decode the JSON data from the form
                $taskAssignments = isset($_POST['taskAssignments']) ? json_decode($_POST['taskAssignments'], true) : [];
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Invalid JSON data: ' . json_last_error_msg()
                    ]);
                } else {
                    $result = updateTaskTeams($taskAssignments);
                    echo json_encode($result);
                }
                break;
            default:
                echo json_encode([
                    'success' => false, 
                    'message' => 'Invalid action: ' . $_POST['action']
                ]);
        }
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Missing action parameter in POST request'
        ]);
    }
} 
else {
    // Handle other request methods
    echo json_encode([
        'success' => false, 
        'message' => 'Invalid request method: ' . $_SERVER['REQUEST_METHOD']
    ]);
}
?>