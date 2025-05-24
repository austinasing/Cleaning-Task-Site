<?php
//handles requests related to subtasks and signatures.

require_once 'db_functions.php';

// Set content type to JSON for all responses
header('Content-Type: application/json');

// Process the request based on method and action
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle GET requests
    if (isset($_GET['action'])) {
        switch($_GET['action']) {
            case 'getTasksWithSubtasks':
                echo json_encode(getAllTasksWithSubtasks());
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
        debugLog("POST action: " . $_POST['action']);
        
        switch($_POST['action']) {
            case 'updateSignatures':
                debugLog("Processing updateSignatures action");
                
                if (!isset($_POST['taskId']) || !isset($_POST['signatures'])) {
                    $missing = [];
                    if (!isset($_POST['taskId'])) $missing[] = 'taskId';
                    if (!isset($_POST['signatures'])) $missing[] = 'signatures';
                    
                    debugLog("Missing parameters: " . implode(', ', $missing));
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Missing required parameters: ' . implode(', ', $missing)
                    ]);
                    break;
                }
                
                $taskId = intval($_POST['taskId']);
                $signaturesJson = $_POST['signatures'];
                debugLog("Received taskId: $taskId");
                debugLog("Received signatures JSON: $signaturesJson");
                
                $signatures = json_decode($signaturesJson, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    debugLog("JSON decode error: " . json_last_error_msg());
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Invalid JSON data: ' . json_last_error_msg()
                    ]);
                } else {
                    debugLog("Decoded signatures:", $signatures);
                    $result = updateSubtaskSignatures($taskId, $signatures);
                    debugLog("Update result:", $result);
                    echo json_encode($result);
                }
                break;
            default:
                debugLog("Invalid action: " . $_POST['action']);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Invalid action: ' . $_POST['action']
                ]);
        }
    } else {
        // Try to get raw POST data in case the form data isn't being properly parsed
        $rawPostData = file_get_contents('php://input');
        debugLog("Raw POST data: " . $rawPostData);
        
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