<?php
// handles requests to update supplies collection

require_once 'db_functions.php';

// Set content type to JSON for all responses
header('Content-Type: application/json');

// Process the request based on method and action
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle POST requests
    if (isset($_POST['action'])) {
        debugLog("Supplies API - POST action: " . $_POST['action']);
        
        switch($_POST['action']) {
            case 'updateSupplies':
                debugLog("Processing updateSupplies action");
                
                if (isset($_POST['supplies'])) {
                    $supplies = json_decode($_POST['supplies'], true);
                    debugLog("Supplies data received:", $supplies);
                    
                    $result = updateSupplies($supplies);
                    debugLog("Update result:", $result);
                    echo json_encode($result);
                } else {
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Missing supplies data'
                    ]);
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