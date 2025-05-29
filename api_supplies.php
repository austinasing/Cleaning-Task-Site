<?php
// handles requests to update supplies collection and wishlist

require_once 'auth_check.php';
ensureUserIsLoggedInApi(); // Check session login for submission
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
            case 'addWishlistItem':
                debugLog("Processing addWishlistItem action");
                if (isset($_POST['item']) && !empty(trim($_POST['item']))) {
                    $item = trim($_POST['item']);
                    $result = addWishlistItem($item);
                    echo json_encode($result);
                } else {
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Missing item data or item is empty'
                    ]);
                }
                break;
            case 'deleteWishlistItem':
                debugLog("Processing deleteWishlistItem action");
                if (isset($_POST['itemId'])) {
                    $itemId = $_POST['itemId'];
                    $result = deleteWishlistItem($itemId);
                    echo json_encode($result);
                } else {
                    echo json_encode([
                        'success' => false, 
                        'message' => 'Missing itemId'
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
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle GET requests
    if (isset($_GET['action'])) {
        debugLog("Supplies API - GET action: " . $_GET['action']);
        switch($_GET['action']) {
            case 'getWishlistItems':
                debugLog("Processing getWishlistItems action");
                $result = getWishlistItems();
                echo json_encode(['success' => true, 'items' => $result]);
                break;
            default:
                debugLog("Invalid action: " . $_GET['action']);
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
} else {
    // Handle other request methods
    echo json_encode([
        'success' => false, 
        'message' => 'Invalid request method: ' . $_SERVER['REQUEST_METHOD'] . '. Only POST and GET are supported.'
    ]);
}
?>