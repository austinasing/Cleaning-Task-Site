<?php
// Contains all database functions for accessing and manipulating data

require_once 'db_connect.php';

// Get all roommates
function getAllRoommates() {
    global $conn;
    if (!$conn) {
        return [];
    }
    $roommates = [];
    $sql = "SELECT id, name FROM roommates ORDER BY name";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $roommates[] = $row;
        }
    }
    return $roommates;
}

// Gets all cleaning teams with their members
function getTeams() {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return []; // Return empty array instead of dying to prevent errors
    }
    
    $teams = [];
    
    $sql = "SELECT team, GROUP_CONCAT(name SEPARATOR ' & ') as members 
            FROM roommates 
            WHERE team IS NOT NULL 
            GROUP BY team 
            ORDER BY team";
            
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $teams[$row['team']] = $row['members'];
        }
    }
    
    return $teams;
}

// Gets all tasks with their assigned teams
function getTasks() {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return []; // Return empty array instead of dying
    }
    
    $tasks = [];
    
    $sql = "SELECT t.id, t.taskname, t.team_id, 
            GROUP_CONCAT(r.name SEPARATOR ' & ') as team_members 
            FROM taskteams t 
            LEFT JOIN roommates r ON t.team_id = r.team 
            GROUP BY t.id 
            ORDER BY t.id";
            
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $tasks[] = $row;
        }
    }
    
    return $tasks;
}

// Gets all tasks + subtasks and team information
function getAllTasksWithSubtasks() {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return []; // Return empty array instead of dying
    }
    
    // Reuse the tasks data from getTasks() to avoid duplicate queries
    $baseTasks = getTasks();
    $tasksWithSubtasks = [];
    
    foreach ($baseTasks as $baseTask) {
        $task = [
            'id' => $baseTask['id'],
            'taskname' => $baseTask['taskname'],
            'team_id' => $baseTask['team_id'],
            'team_members' => !empty($baseTask['team_members']) ? explode(' & ', $baseTask['team_members']) : [],
            'subtasks' => []
        ];
        
        // Get all subtasks for this task
        $subtaskSql = "SELECT id, subtask, signature 
                      FROM tasks 
                      WHERE task_name = ? 
                      ORDER BY id";
        
        $stmt = $conn->prepare($subtaskSql);
        $stmt->bind_param("s", $baseTask['taskname']);
        $stmt->execute();
        $subtaskResult = $stmt->get_result();
        
        if ($subtaskResult && $subtaskResult->num_rows > 0) {
            while($subtaskRow = $subtaskResult->fetch_assoc()) {
                $task['subtasks'][] = $subtaskRow;
            }
        }
        
        $stmt->close();
        $tasksWithSubtasks[] = $task;
    }
    
    return $tasksWithSubtasks;
}

// Get list of supplies and collection status
function getSupplies() {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return []; // Return empty array instead of dying
    }
    
    $supplies = [];
    
    $sql = "SELECT id, item, collected FROM supplies ORDER BY item";
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $supplies[] = $row;
        }
    }
    
    return $supplies;
}

// Get all wishlist items
function getWishlistItems() {
    global $conn;
    if (!$conn) {
        return [];
    }
    $wishlistItems = [];
    $sql = "SELECT id, item FROM wishlist ORDER BY id";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $wishlistItems[] = $row;
        }
    }
    return $wishlistItems;
}

// Get all late tasks
function getLateTasks() {
    global $conn;
    if (!$conn) {
        return [];
    }
    $lateTasks = [];
    $sql = "SELECT id, name, day, task FROM latetask ORDER BY id DESC"; // Show newest first
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $lateTasks[] = $row;
        }
    }
    return $lateTasks;
}

// Updates task team assignments, input array of tasks and teams
function updateTaskTeams($taskTeams) {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    
    // Prepare the statement once
    $sql = "UPDATE taskteams SET team_id = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        return ['success' => false, 'message' => 'SQL prepare error: ' . $conn->error];
    }
    
    $errors = [];
    
    // Execute for each task-team pair
    foreach ($taskTeams as $task) {
        if (!isset($task['taskId']) || !isset($task['teamId'])) {
            continue;
        }
        
        $taskId = intval($task['taskId']);
        $teamId = $task['teamId'] !== '' ? intval($task['teamId']) : NULL;
        
        $stmt->bind_param("ii", $teamId, $taskId);
        
        if (!$stmt->execute()) {
            $errors[] = "Error updating task ID $taskId: " . $stmt->error;
        }
    }
    
    $stmt->close();
    
    if (count($errors) > 0) {
        return ['success' => false, 'message' => implode("; ", $errors)];
    } else {
        return ['success' => true];
    }
}

// Updates sign-offs for subtasks
function updateSubtaskSignatures($taskId, $signatures) {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    
    // Prepare the statement once
    $sql = "UPDATE tasks SET signature = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        return ['success' => false, 'message' => 'SQL prepare error: ' . $conn->error];
    }
    
    $errors = [];
    
    // Execute for each subtask-signature pair
    foreach ($signatures as $subtaskId => $signature) {
        $subtaskId = intval($subtaskId);
        
        $stmt->bind_param("si", $signature, $subtaskId);
        
        if (!$stmt->execute()) {
            $errors[] = "Error updating subtask ID $subtaskId: " . $stmt->error;
        }
    }
    
    $stmt->close();
    
    if (count($errors) > 0) {
        return ['success' => false, 'message' => implode("; ", $errors)];
    } else {
        return ['success' => true];
    }
}

// Update supplies db with check offs
function updateSupplies($supplies) {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    
    // Prepare the statement once
    $sql = "UPDATE supplies SET collected = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        return ['success' => false, 'message' => 'SQL prepare error: ' . $conn->error];
    }
    
    $errors = [];
    
    // Execute for each supply
    foreach ($supplies as $supply) {
        if (!isset($supply['id']) || !isset($supply['collected'])) {
            continue;
        }
        
        $supplyId = intval($supply['id']);
        $collected = intval($supply['collected']); // Convert to 1 or 0
        
        $stmt->bind_param("ii", $collected, $supplyId);
        
        if (!$stmt->execute()) {
            $errors[] = "Error updating supply ID $supplyId: " . $stmt->error;
        }
    }
    
    $stmt->close();
    
    if (count($errors) > 0) {
        return ['success' => false, 'message' => implode("; ", $errors)];
    } else {
        return ['success' => true];
    }
}

// Add a new item to the wishlist
function addWishlistItem($item) {
    global $conn;
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    $sql = "INSERT INTO wishlist (item) VALUES (?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => 'SQL prepare error: ' . $conn->error];
    }
    $stmt->bind_param("s", $item);
    if ($stmt->execute()) {
        $newItem = ['id' => $stmt->insert_id, 'item' => $item];
        return ['success' => true, 'message' => 'Item added to wishlist successfully', 'item' => $newItem];
    } else {
        return ['success' => false, 'message' => 'Error adding item to wishlist: ' . $stmt->error];
    }
    $stmt->close();
}

// Add a new late task
function addLateTask($name, $day, $task) {
    global $conn;
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    $sql = "INSERT INTO latetask (name, day, task) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => 'SQL prepare error: ' . $conn->error];
    }
    $stmt->bind_param("sss", $name, $day, $task);
    if ($stmt->execute()) {
        $newLateTask = ['id' => $stmt->insert_id, 'name' => $name, 'day' => $day, 'task' => $task];
        return ['success' => true, 'message' => 'Late task added successfully', 'lateTask' => $newLateTask];
    } else {
        return ['success' => false, 'message' => 'Error adding late task: ' . $stmt->error];
    }
    $stmt->close();
}

// Delete an item from the wishlist
function deleteWishlistItem($itemId) {
    global $conn;
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    $sql = "DELETE FROM wishlist WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => 'SQL prepare error: ' . $conn->error];
    }
    $itemId = intval($itemId);
    $stmt->bind_param("i", $itemId);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            return ['success' => true, 'message' => 'Item deleted from wishlist successfully'];
        } else {
            return ['success' => false, 'message' => 'Item not found or already deleted'];
        }
    } else {
        return ['success' => false, 'message' => 'Error deleting item from wishlist: ' . $stmt->error];
    }
    $stmt->close();
}

// Resets all subtask signature assignments to NULL
function resetAllSignatures() {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    
    // Prepare the SQL statement to reset all signatures
    $sql = "UPDATE tasks SET signature = NULL WHERE 1";
    
    // Execute the query
    if ($conn->query($sql) === TRUE) {
        return ['success' => true, 'message' => 'All signatures have been reset successfully'];
    } else {
        return [
            'success' => false, 
            'message' => 'Error resetting signatures: ' . $conn->error
        ];
    }
}

// Reset all supplies to unchecked (0)
function resetSupplies() {
    global $conn;
    
    // Check if connection exists
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    
    // Prepare the SQL statement to reset all supplies
    $sql = "UPDATE supplies SET collected = 0 WHERE 1";
    
    // Execute the query
    if ($conn->query($sql) === TRUE) {
        return ['success' => true, 'message' => 'All supplies have been reset successfully'];
    } else {
        return [
            'success' => false, 
            'message' => 'Error resetting supplies: ' . $conn->error
        ];
    }
}

// Reset all late tasks
function resetAllLateTasks() {
    global $conn;
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection error'];
    }
    $sql = "DELETE FROM latetask"; // Deletes all rows
    if ($conn->query($sql) === TRUE) {
        // Check affected rows to see if any were deleted, though not strictly necessary for DELETE without WHERE
        return ['success' => true, 'message' => 'All late tasks have been reset successfully'];
    } else {
        return [
            'success' => false, 
            'message' => 'Error resetting late tasks: ' . $conn->error
        ];
    }
}

// Debug logging function
function debugLog($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $logMessage .= " - " . (is_array($data) || is_object($data) ? json_encode($data) : $data);
    }
    $logMessage .= "\n";
    file_put_contents('debug.log', $logMessage, FILE_APPEND);
}
?>