<?php
/**
 * db_functions.php
 * 
 * Contains all database functions for accessing and manipulating data.
 * This file only provides functions - it doesn't handle any requests directly.
 */

require_once 'db_connect.php';

/**
 * Gets all teams with their members
 * 
 * @return array Associative array of team IDs and member names
 */
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

/**
 * Gets all tasks with their assigned teams
 * 
 * @return array Array of tasks with their assigned team information
 */
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

/**
 * Gets all tasks with their subtasks and team information
 * 
 * @return array Array of tasks including subtasks and assigned team members
 */
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

/**
 * Updates task team assignments
 * 
 * @param array $taskTeams Array of task ID and team ID pairs
 * @return array Success/error message
 */
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

/**
 * Updates subtask signature assignments
 * 
 * @param int $taskId The task ID being updated
 * @param array $signatures Array of subtask ID and signature pairs
 * @return array Success/error message
 */
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

/**
 * Resets all subtask signature assignments to NULL
 * 
 * @return array Success/error message
 */
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

/**
 * Debug logging function
 * 
 * @param string $message The message to log
 * @param mixed $data Optional data to include in the log
 */
function debugLog($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $logMessage .= " - " . (is_array($data) || is_object($data) ? json_encode($data) : $data);
    }
    $logMessage .= "\n";
    file_put_contents('debug.log', $logMessage, FILE_APPEND);
}
?>