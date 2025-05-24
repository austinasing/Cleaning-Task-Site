<?php
/**
 * index.php
 * 
 * Main application page that displays the task assignment interface.
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Only include the database functions, not the API endpoints
require_once 'db_functions.php';

// Get all the data needed for the page
$teams = getTeams();
$tasks = getTasks();
$tasksWithSubtasks = getAllTasksWithSubtasks();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>7.2 Cleaning Tasks</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>7.2 Cleaning Tasks</h1>
    
    <!-- Individual Task Assignment Section -->
    <div class="section" id="subtask-assignment-section">
        <h2>Sign off on your task!</h2>
        
        <?php if (empty($tasksWithSubtasks)): ?>
            <p>No tasks found or no teams assigned to tasks yet.</p>
        <?php else: ?>
            <?php foreach ($tasksWithSubtasks as $task): ?>
                <div class="task-container" id="task-<?= $task['id'] ?>">
                    <div class="task-header">
                        <div class="task-title"><?= htmlspecialchars($task['taskname']) ?></div>
                        <?php if (!empty($task['team_members'])): ?>
                            <div class="team-info">
                                Assigned Team: 
                                <?php foreach ($task['team_members'] as $index => $member): ?>
                                    <span class="team-member"><?= htmlspecialchars($member) ?></span>
                                    <?php if ($index < count($task['team_members']) - 1): ?> & <?php endif; ?>
                                <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <div class="team-info">No team assigned yet</div>
                        <?php endif; ?>
                    </div>
                    
                    <div class="subtask-success-message-<?= $task['id'] ?> message success">
                        Subtask assignments saved successfully!
                    </div>
                    
                    <?php if (empty($task['subtasks'])): ?>
                        <p>No subtasks found for this task.</p>
                    <?php elseif (empty($task['team_members'])): ?>
                        <p>Please assign a team to this task first.</p>
                    <?php else: ?>
                        <form class="subtask-form" data-task-id="<?= $task['id'] ?>">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Subtask</th>
                                        <th>Sign-off</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($task['subtasks'] as $subtask): ?>
                                        <tr>
                                            <td><?= htmlspecialchars($subtask['subtask']) ?></td>
                                            <td>
                                                <select name="signature[<?= $subtask['id'] ?>]" class="person-select">
                                                    <option value="">-- Select Person --</option>
                                                    <?php foreach ($task['team_members'] as $member): ?>
                                                        <option value="<?= htmlspecialchars($member) ?>" <?= ($subtask['signature'] === $member) ? 'selected' : '' ?>>
                                                            <?= htmlspecialchars($member) ?>
                                                        </option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                            
                            <button type="submit">Submit task sign off</button>
                        </form>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <!-- Task Team Assignment Section -->
    <div class="section" id="team-assignment-section">
        <h2>Assign Teams to Tasks</h2>
        
        <div id="teamSuccessMessage" class="message success">
            Team assignments saved successfully!
        </div>
        
        <form id="taskAssignmentForm">
            <table id="taskTable">
                <thead>
                    <tr>
                        <th>Task</th>
                        <th>Assigned Team</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($tasks as $task): ?>
                    <tr data-task-id="<?= $task['id'] ?>">
                        <td><?= htmlspecialchars($task['taskname']) ?></td>
                        <td>
                            <select class="team-select" name="tasks[<?= $task['id'] ?>]">
                                <option value="">-- Select Team --</option>
                                <?php foreach($teams as $teamId => $teamMembers): ?>
                                    <option value="<?= $teamId ?>" <?= ($teamId == $task['team_id']) ? 'selected' : '' ?>>
                                        Team <?= $teamId ?>: <?= htmlspecialchars($teamMembers) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <button type="submit" id="saveTeamButton">Save Team Assignments</button>
        </form>
    </div>
    
    <!-- Supplies Section-->
    <div class="section" id="supplies-section">
        <h2>Supplies</h2>
        
    </div>

    <!-- Reset All Signatures Button Section -->
    <div class="section" id="reset-section">
        <h2>Reset all sign-offs</h2>
        
        <div id="resetSuccessMessage" class="message success">
            All signature assignments have been reset successfully!
        </div>
        
        <button id="resetAllSignaturesButton" class="danger-button">Reset</button>
    </div>

    <script src="script.js"></script>
</body>
</html>