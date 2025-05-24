<?php
/**
 * api_reset.php
 * 
 * API endpoint for resetting operations.
 * This file handles requests to reset data to initial state.
 */

require_once 'db_functions.php';

// Set content type to JSON for all responses
header('Content-Type: application/json');

// Process the request based on method and action
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle POST requests
    if (isset($_POST['action'])) {
        debugLog("Reset API - POST action: " . $_POST['action']);
        
        switch($_POST['action']) {
            case 'resetAllSignatures':
                debugLog("Processing resetAllSignatures action");
                $result = resetAllSignatures();
                debugLog("Reset result:", $result);
                echo json_encode($result);
                break;
            default:
                debugLog("Invalid action: " . $_POST['action']);
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
} else {
    // Handle other request methods
    echo json_encode([
        'success' => false, 
        'message' => 'Invalid request method: ' . $_SERVER['REQUEST_METHOD'] . '. Only POST is supported.'
    ]);
}
?>