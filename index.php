<?php
require_once 'auth_check.php'; // Includes config.php and starts session

$login_error_message = '';

// Handle login attempt
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_attempt'])) {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $remember_me = isset($_POST['remember_me']);

    if (loginUser($username, $password, $remember_me)) {
        header('Location: index.php');
        exit;
    } else {
        $login_error_message = 'Invalid username or password.';
    }
}

$is_logged_in = isUserLoggedIn();

// Data fetching
require_once 'db_functions.php';

// Fetch all task data with subtasks once
$allTasksRaw = getAllTasksWithSubtasks(); //

// Helper function to find a specific task by its 'taskname'
function findTaskByName($tasksArray, $name) {
    foreach ($tasksArray as $task) {
        if ($task['taskname'] === $name) {
            return $task;
        }
    }
    return null;
}

// Assign specific task data to variables
$kitchenThursData = findTaskByName($allTasksRaw, 'Kitchen (Thurs)');
$kitchenSunData = findTaskByName($allTasksRaw, 'Kitchen (Sun)');
$toiletFrontData = findTaskByName($allTasksRaw, 'Toilet (Front)');
$toiletBackData = findTaskByName($allTasksRaw, 'Toilet (Back)');
$bathroomData = findTaskByName($allTasksRaw, 'Bathroom');
$hallwayData = findTaskByName($allTasksRaw, 'Hallway');
$garbageData = findTaskByName($allTasksRaw, 'Garbage');


// Other necessary data
$tasksForAssignmentTable = getTasks(); 
$supplies = getSupplies(); 
$wishlistItems = getWishlistItems(); 
$allRoommates = getAllRoommates(); 
$lateTasks = getLateTasks(); 
$daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    <!-- Login status -->
    <div class="status-bar">
        <?php if ($is_logged_in): ?>
            <a href="logout.php" class="logout">Logout</a>
        <?php else: ?>
            <div class="login-area">
                <?php if (!empty($login_error_message)): ?>
                    <span class="login-error-top"><?php echo htmlspecialchars($login_error_message); ?></span>
                <?php endif; ?>
                <form method="POST" action="index.php">
                    <input type="hidden" name="login_attempt" value="1">
                    <input type="text" id="username_top" name="username" placeholder="Username" required>
                    <input type="password" id="password_top" name="password" placeholder="Password" required>
                    <button type="submit">Login</button>
                    <span class="remember-me-top">
                        <input type="checkbox" id="remember_me_top" name="remember_me">
                        <label for="remember_me_top">Remember me</label>
                    </span>
                </form>
            </div>
        <?php endif; ?>
    </div>
    
    <img class='mural'src='../pics/seventwo_trans_bg.png' alt='seven point two mural'>

    <!-- Task Sign Off -->
    <div class="task-section" id="subtask-assignment-section">
        <?php if (empty($allTasksRaw)): ?>
            <p>No task data found in the system.</p>
        <?php else: ?>
            <!-- Kitchen Tasks -->
            <?php if ($kitchenThursData && $kitchenSunData): ?>
            <div class="task-group-container" id="task-group-kitchen">
                <div class="task-header">
                    <div class="task-title">Kitchen</div>
                    <img class = 'task-gif' src='../pics/kitchen.gif'>
                </div>
                
                <div class="subtask-success-message-<?= $kitchenThursData['id'] ?> message success" style="display:none;">Kitchen (Thursday) assignments saved!</div>
                <div class="subtask-success-message-<?= $kitchenSunData['id'] ?> message success" style="display:none;">Kitchen (Sunday) assignments saved!</div>

                <table class="multi-column-task-table">
                    <thead>
                        <tr>
                            <th>Subtask</th>
                            <th>
                                Thursday
                                <?php if ($kitchenThursData['team_members']): ?><small class="team-info-header"><?= implode(' & ', array_map('htmlspecialchars', $kitchenThursData['team_members'])) ?></small><?php else: ?><small class="team-info-header">No team</small><?php endif; ?>
                            </th>
                            <th>
                                Sunday
                                <?php if ($kitchenSunData['team_members']): ?><small class="team-info-header"><?= implode(' & ', array_map('htmlspecialchars', $kitchenSunData['team_members'])) ?></small><?php else: ?><small class="team-info-header">No team</small><?php endif; ?>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $masterKitchenSubtasks = $kitchenThursData['subtasks'] ?? [];
                        foreach ($masterKitchenSubtasks as $masterSubtask):
                            $subtaskName = $masterSubtask['subtask'];
                        ?>
                        <tr>
                            <td><?= htmlspecialchars($subtaskName) ?></td>
                            <td> <?php
                                $currentVariantSubtask = null;
                                if ($kitchenThursData && !empty($kitchenThursData['subtasks'])) {
                                    foreach($kitchenThursData['subtasks'] as $s) { if($s['subtask'] === $subtaskName) { $currentVariantSubtask = $s; break; }}
                                }
                                if ($currentVariantSubtask && !empty($kitchenThursData['team_members'])):
                                ?>
                                <select 
                                name="signature[<?= $currentVariantSubtask['id'] ?>]"
                                class="person-select" 
                                data-task-variant-name="kitchen_thurs"
                                <?php if (!$is_logged_in) echo 'disabled'; ?>
                                data-blockout-day="5">
                                    <option value=""> </option>
                                    <?php foreach ($kitchenThursData['team_members'] as $member): ?>
                                    <option value="<?= htmlspecialchars($member) ?>" <?= ($currentVariantSubtask['signature'] === $member) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($member) ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php elseif(empty($kitchenThursData['team_members']) && $is_logged_in): echo "<small>Assign team</small>"; elseif(empty($kitchenThursData['team_members']) && !$is_logged_in): echo "<small>Login to assign</small>"; else: echo "N/A"; endif; ?>
                            </td>
                            <td> <?php
                                $currentVariantSubtask = null;
                                if ($kitchenSunData && !empty($kitchenSunData['subtasks'])) {
                                    foreach($kitchenSunData['subtasks'] as $s) { if($s['subtask'] === $subtaskName) { $currentVariantSubtask = $s; break; }}
                                }
                                if ($currentVariantSubtask && !empty($kitchenSunData['team_members'])):
                                ?>
                                <select name="signature[<?= $currentVariantSubtask['id'] ?>]"
                                class="person-select" 
                                data-task-variant-name="kitchen_sun"
                                <?php if (!$is_logged_in) echo 'disabled'; ?>
                                data-blockout-day="1">
                                    <option value=""> </option>
                                    <?php foreach ($kitchenSunData['team_members'] as $member): ?>
                                    <option value="<?= htmlspecialchars($member) ?>" <?= ($currentVariantSubtask['signature'] === $member) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($member) ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php elseif(empty($kitchenSunData['team_members']) && $is_logged_in): echo "<small>Assign team</small>"; elseif(empty($kitchenSunData['team_members']) && !$is_logged_in): echo "<small>Login to assign</small>"; else: echo "N/A"; endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>&nbsp;</td> <td>
                                <?php if ($is_logged_in && !empty($kitchenThursData['team_members']) && !empty($kitchenThursData['subtasks'])): ?>
                                <form class="subtask-form" data-task-id="<?= $kitchenThursData['id'] ?>" data-task-variant-name="kitchen_thurs">
                                    <button type="submit">Submit</button>
                                </form>
                                <?php elseif($is_logged_in): ?><button type="button" disabled title="Assign members/subtasks exist">Submit</button><?php endif; ?>
                            </td>
                            <td>
                                <?php if ($is_logged_in && !empty($kitchenSunData['team_members']) && !empty($kitchenSunData['subtasks'])): ?>
                                <form class="subtask-form" data-task-id="<?= $kitchenSunData['id'] ?>" data-task-variant-name="kitchen_sun">
                                    <button type="submit">Submit</button>
                                </form>
                                <?php elseif($is_logged_in): ?><button type="button" disabled title="Assign members/subtasks exist">Submit</button><?php endif; ?>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <?php else: echo "<p>Kitchen task data not fully available.</p>"; endif; ?>
            <!-- Toilet Tasks -->
            <?php if ($toiletFrontData && $toiletBackData): ?>
            <div class="task-group-container" id="task-group-toilet">
                <div class="task-header">
                    <div class="task-title">Toilet</div>
                    <img class = 'task-gif' src='../pics/toilet.gif'>
                </div>
                
                <div class="subtask-success-message-<?= $toiletFrontData['id'] ?> message success" style="display:none;">Toilet (Front) assignments saved!</div>
                <div class="subtask-success-message-<?= $toiletBackData['id'] ?> message success" style="display:none;">Toilet (Back) assignments saved!</div>

                <table class="multi-column-task-table">
                    <thead>
                        <tr>
                            <th>Subtask</th>
                            <th>
                                Front
                                <?php if ($toiletFrontData['team_members']): ?><small class="team-info-header"><?= implode(' & ', array_map('htmlspecialchars', $toiletFrontData['team_members'])) ?></small><?php else: ?><small class="team-info-header">No team</small><?php endif; ?>
                            </th>
                            <th>
                                Back
                                <?php if ($toiletBackData['team_members']): ?><small class="team-info-header"><?= implode(' & ', array_map('htmlspecialchars', $toiletBackData['team_members'])) ?></small><?php else: ?><small class="team-info-header">No team</small><?php endif; ?>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $masterToiletSubtasks = $toiletFrontData['subtasks'] ?? [];
                        foreach ($masterToiletSubtasks as $masterSubtask):
                            $subtaskName = $masterSubtask['subtask'];
                        ?>
                        <tr>
                            <td><?= htmlspecialchars($subtaskName) ?></td>
                            <td> <?php
                                $currentVariantSubtask = null;
                                if($toiletFrontData && !empty($toiletFrontData['subtasks'])) {
                                    foreach($toiletFrontData['subtasks'] as $s) { if($s['subtask'] === $subtaskName) { $currentVariantSubtask = $s; break; }}
                                }
                                if ($currentVariantSubtask && !empty($toiletFrontData['team_members'])):
                                ?>
                                <select
                                name="signature[<?= $currentVariantSubtask['id'] ?>]"
                                class="person-select" 
                                data-task-variant-name="toilet_front"
                                <?php if (!$is_logged_in) echo 'disabled'; ?>
                                data-blockout-day="1">
                                    <option value=""> </option>
                                    <?php foreach ($toiletFrontData['team_members'] as $member): ?>
                                    <option value="<?= htmlspecialchars($member) ?>" <?= ($currentVariantSubtask['signature'] === $member) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($member) ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php elseif(empty($toiletFrontData['team_members']) && $is_logged_in): echo "<small>Assign team</small>"; elseif(empty($toiletFrontData['team_members']) && !$is_logged_in): echo "<small>Login to assign</small>"; else: echo "N/A"; endif; ?>
                            </td>
                            <td> <?php
                                $currentVariantSubtask = null;
                                 if($toiletBackData && !empty($toiletBackData['subtasks'])) {
                                    foreach($toiletBackData['subtasks'] as $s) { if($s['subtask'] === $subtaskName) { $currentVariantSubtask = $s; break; }}
                                 }
                                if ($currentVariantSubtask && !empty($toiletBackData['team_members'])):
                                ?>
                                <select
                                name="signature[<?= $currentVariantSubtask['id'] ?>]"
                                class="person-select" 
                                data-task-variant-name="toilet_back"
                                <?php if (!$is_logged_in) echo 'disabled'; ?>
                                data-blockout-day="1">
                                    <option value=""> </option>
                                    <?php foreach ($toiletBackData['team_members'] as $member): ?>
                                    <option value="<?= htmlspecialchars($member) ?>" <?= ($currentVariantSubtask['signature'] === $member) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($member) ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php elseif(empty($toiletBackData['team_members']) && $is_logged_in): echo "<small>Assign team</small>"; elseif(empty($toiletBackData['team_members']) && !$is_logged_in): echo "<small>Login to assign</small>"; else: echo "N/A"; endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                    <tfoot>
                        <tr>
                           <td>&nbsp;</td> <td>
                                <?php if ($is_logged_in && !empty($toiletFrontData['team_members']) && !empty($toiletFrontData['subtasks'])): ?>
                                <form class="subtask-form" data-task-id="<?= $toiletFrontData['id'] ?>" data-task-variant-name="toilet_front">
                                    <button type="submit">Submit</button>
                                </form>
                                <?php elseif($is_logged_in): ?><button type="button" disabled title="Assign members/subtasks exist">Submit</button><?php endif; ?>
                           </td>
                           <td>
                                <?php if ($is_logged_in && !empty($toiletBackData['team_members']) && !empty($toiletBackData['subtasks'])): ?>
                                <form class="subtask-form" data-task-id="<?= $toiletBackData['id'] ?>" data-task-variant-name="toilet_back">
                                    <button type="submit">Submit</button>
                                </form>
                                <?php elseif($is_logged_in): ?><button type="button" disabled title="Assign members/subtasks exist">Submit</button><?php endif; ?>
                           </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <?php else: echo "<p>Toilet task data not fully available.</p>"; endif; ?>
            <!-- Bathroom Tasks -->
            <?php if ($bathroomData): $task = $bathroomData; ?>
            <div class="task-container" id="task-<?= $task['id'] ?>">
                <div class="task-header">
                    <div class="task-info-left">
                        <div class="task-title"><?= htmlspecialchars($task['taskname']) ?>:</div>
                        <?php if (!empty($task['team_members'])): ?>
                            <div class="team-info"><?= implode(' & ', array_map('htmlspecialchars', $task['team_members'])) ?></div>
                        <?php else: ?>
                            <div class="team-info">No members assigned yet</div>
                        <?php endif; ?>
                    </div>
                    <img class='task-gif' src='../pics/shower2.gif'>
                </div>
                <div class="subtask-success-message-<?= $task['id'] ?> message success" style="display:none;">Assignments saved!</div>
                <?php if (empty($task['subtasks'])): ?>
                    <p>No subtasks found for this task.</p>
                <?php elseif (empty($task['team_members']) && $is_logged_in): ?>
                    <p>Please assign members to this task first.</p>
                <?php elseif (empty($task['team_members']) && !$is_logged_in): ?>
                    <p>Members not yet assigned. Log in to assign members.</p>
                <?php else: ?>
                    <form class="subtask-form" data-task-id="<?= $task['id'] ?>" data-task-variant-name="<?= $task['taskname'] ?>">
                        <table>
                            <thead><tr><th>Subtask</th><th>Sign-off</th></tr></thead>
                            <tbody>
                            <?php foreach ($task['subtasks'] as $subtask): ?>
                                <tr>
                                    <td><?= htmlspecialchars($subtask['subtask']) ?></td>
                                    <td>
                                        <select name="signature[<?= $subtask['id'] ?>]"
                                                class="person-select" 
                                                data-task-variant-name="<?= $task['taskname'] ?>"
                                                <?php if (!$is_logged_in) echo 'disabled'; ?>
                                                <?php 
                                                $defaultBlockDay = 1;
                                                $blockDay = $defaultBlockDay;
                                                if ($subtaskName === 'Mid-Week Drains (Thurs)') {
                                                    $blockDay = 5; // Override
                                                }?>>
                                            <option value=""> </option>
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
                        <?php if ($is_logged_in): ?><button type="submit">Submit</button>
                        <?php else: ?><button type="submit" disabled title="Log in to submit">Submit</button><?php endif; ?>
                    </form>
                <?php endif; ?>
            </div>
            <?php else: echo "<p>Bathroom task data not available.</p>"; endif; ?>
            <!-- Hallway Tasks -->
            <?php if ($hallwayData): $task = $hallwayData; ?>
            <div class="task-container" id="task-<?= $task['id'] ?>">
                 <div class="task-header">
                    <div class="task-info-left">
                        <div class="task-title"><?= htmlspecialchars($task['taskname']) ?>:</div>
                        <?php if (!empty($task['team_members'])): ?>
                            <div class="team-info"><?= implode(' & ', array_map('htmlspecialchars', $task['team_members'])) ?></div>
                        <?php else: ?>
                            <div class="team-info">No members assigned yet</div>
                        <?php endif; ?>
                    </div>
                    <img class='task-gif' src='../pics/hallway.gif'>
                </div>
                <div class="subtask-success-message-<?= $task['id'] ?> message success" style="display:none;">Assignments saved!</div>
                <?php if (empty($task['subtasks'])): ?> <p>No subtasks found for this task.</p>
                <?php elseif (empty($task['team_members']) && $is_logged_in): ?> <p>Please assign members to this task first.</p>
                <?php elseif (empty($task['team_members']) && !$is_logged_in): ?> <p>Members not yet assigned. Log in to assign members.</p>
                <?php else: ?>
                    <form class="subtask-form" data-task-id="<?= $task['id'] ?>" data-task-variant-name="<?= $task['taskname'] ?>">
                        <table>
                            <thead><tr><th>Subtask</th><th>Sign-off</th></tr></thead>
                            <tbody>
                            <?php foreach ($task['subtasks'] as $subtask): ?>
                                <tr>
                                    <td><?= htmlspecialchars($subtask['subtask']) ?></td>
                                    <td>
                                        <select
                                        name="signature[<?= $subtask['id'] ?>]"
                                        class="person-select" 
                                        data-task-variant-name="<?= $task['taskname'] ?>"
                                        <?php if (!$is_logged_in) echo 'disabled'; ?>
                                        data-blockout-day="1">
                                            <option value=""> </option>
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
                        <?php if ($is_logged_in): ?><button type="submit">Submit</button>
                        <?php else: ?><button type="submit" disabled title="Log in to submit">Submit</button><?php endif; ?>
                    </form>
                <?php endif; ?>
            </div>
            <?php else: echo "<p>Hallway task data not available.</p>"; endif; ?>
            <!-- Garbage Tasks -->
            <?php if ($garbageData): $task = $garbageData; ?>
            <div class="task-container" id="task-<?= $task['id'] ?>">
                <div class="task-header">
                    <div class="task-info-left">
                        <div class="task-title"><?= htmlspecialchars($task['taskname']) ?>:</div>
                        <?php if (!empty($task['team_members'])): ?>
                            <div class="team-info"><?= implode(' & ', array_map('htmlspecialchars', $task['team_members'])) ?></div>
                        <?php else: ?>
                            <div class="team-info">No members assigned yet</div>
                        <?php endif; ?>
                    </div>
                    <img class='task-gif' src='../pics/trash.gif'>
                </div>
                <div class="subtask-success-message-<?= $task['id'] ?> message success" style="display:none;">Assignments saved!</div>
                 <?php if (empty($task['subtasks'])): ?> <p>No subtasks found for this task.</p>
                <?php elseif (empty($task['team_members']) && $is_logged_in): ?> <p>Please assign members to this task first.</p>
                <?php elseif (empty($task['team_members']) && !$is_logged_in): ?> <p>Members not yet assigned. Log in to assign members.</p>
                <?php else: ?>
                    <form class="subtask-form" data-task-id="<?= $task['id'] ?>" data-task-variant-name="<?= $task['taskname'] ?>">
                        <table>
                            <thead><tr><th>Subtask</th><th>Sign-off</th></tr></thead>
                            <tbody>
                            <?php foreach ($task['subtasks'] as $subtask): ?>
                                <tr>
                                    <td><?= htmlspecialchars($subtask['subtask']) ?></td>
                                    <td>
                                        <select
                                        name="signature[<?= $subtask['id'] ?>]"
                                        class="person-select" 
                                        data-task-variant-name="<?= $task['taskname'] ?>"
                                        <?php if (!$is_logged_in) echo 'disabled'; ?>
                                        <?php 
                                        $defaultBlockDay = 1;
                                        $blockDay = $defaultBlockDay;
                                        if ($subtaskName === 'Check Bags (Tue)') {
                                            $blockDay = 3; // Override
                                        } else if ($subtaskName === 'Check Bags (Thur)') {
                                            $blockDay = 5; // Override
                                        }
                                        ?>>
                                            <option value=""> </option>
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
                        <?php if ($is_logged_in): ?><button type="submit">Submit</button>
                        <?php else: ?><button type="submit" disabled title="Log in to submit">Submit</button><?php endif; ?>
                    </form>
                <?php endif; ?>
            </div>
            <?php else: echo "<p>Garbage task data not available.</p>"; endif; ?>
            <?php endif; // End main check for $allTasksRaw ?>
    </div>
    <!-- Assignment Member -->
    <div class="section" id="member-assignment-section">
        <h2 class='section-title'>Assign Members to Tasks</h2>
        <div id="taskAssignmentSuccessMessage" class="message success" style="display:none;"></div>
        <div id="taskAssignmentErrorMessage" class="message error" style="display:none;"></div>
        <?php if (!empty($tasksForAssignmentTable)): ?>
        <form id="taskAssignmentForm">
            <table id="taskTable">
                <thead>
                    <tr>
                        <th>Task</th>
                        <th>Member 1</th>
                        <th>Member 2</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($tasksForAssignmentTable as $task_assignment_item): ?>
                    <tr data-task-id="<?= $task_assignment_item['id'] ?>">
                        <td><?= htmlspecialchars($task_assignment_item['taskname']) ?></td>
                        <td>
                            <select class="member-select" name="tasks[<?= $task_assignment_item['id'] ?>][member1]" <?php if (!$is_logged_in) echo 'disabled'; ?>>
                                <option value="">-- --</option>
                                <?php foreach($allRoommates as $roommate): ?>
                                    <option value="<?= $roommate['id'] ?>" <?= ($roommate['id'] == $task_assignment_item['member1_id']) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($roommate['name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                        <td>
                            <select class="member-select" name="tasks[<?= $task_assignment_item['id'] ?>][member2]" <?php if (!$is_logged_in) echo 'disabled'; ?>>
                                <option value="">-- --</option>
                                <?php foreach($allRoommates as $roommate): ?>
                                    <option value="<?= $roommate['id'] ?>" <?= ($roommate['id'] == $task_assignment_item['member2_id']) ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($roommate['name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <?php if ($is_logged_in): ?>
                <button type="submit" id="saveTaskAssignmentButton">Save Member Assignments</button>
            <?php else: ?>
                <button type="submit" id="saveTaskAssignmentButton" disabled title="Please log in to submit changes">Save Member Assignments</button>
            <?php endif; ?>

            <!-- Reserve section 
            <?php
            if (!empty($allRoommates) && !empty($tasksForAssignmentTable)) {
                // Create an array of all roommate IDs
                $allRoommateIds = array_map(function($r) { return $r['id']; }, $allRoommates);

                // Create an array of assigned roommate IDs
                $assignedRoommateIds = [];
                foreach ($tasksForAssignmentTable as $task) {
                    if ($task['member1_id']) $assignedRoommateIds[] = $task['member1_id'];
                    if ($task['member2_id']) $assignedRoommateIds[] = $task['member2_id'];
                }
                $assignedRoommateIds = array_unique($assignedRoommateIds);

                // Find the IDs of roommates who are not assigned and not Zarrin (ID 17)
                $reserveRoommateIds = array_diff($allRoommateIds, $assignedRoommateIds);
                $zarrinId = 17;
                if (($key = array_search($zarrinId, $reserveRoommateIds)) !== false) {
                    unset($reserveRoommateIds[$key]);
                }

                // Get the names of the reserve roommates
                $reserveRoommates = [];
                foreach ($reserveRoommateIds as $id) {
                    foreach ($allRoommates as $roommate) {
                        if ($roommate['id'] == $id) {
                            $reserveRoommates[] = $roommate['name'];
                            break;
                        }
                    }
                }

                // Display the reserve roommates
                if (!empty($reserveRoommates)) {
                    echo '<p> Reserve: ' . htmlspecialchars(implode(', ', $reserveRoommates)) . '</p>';
                }
            }
            ?>
            -->
        </form>
        <?php else: echo "<p>Task list for assignments not available.</p>"; endif; ?>
    </div>
    <!-- Supplies -->
    <div class="section" id="supplies-section">
        <h2 class='section-title'>Supplies</h2>
        <div id="suppliesSuccessMessage" class="message success" style="display:none;"></div>
         <?php if (empty($supplies)): ?>
            <p>No supplies found in the database.</p>
        <?php else: ?>
            <form id="suppliesForm">
                <table id="suppliesTable">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($supplies as $supply): ?>
                        <tr data-supply-id="<?= $supply['id'] ?>">
                            <td><?= htmlspecialchars(ucfirst(str_replace('_', ' ', $supply['item']))) ?></td>
                            <td>
                                <select name="supplies[<?= $supply['id'] ?>]" class="supply-status-select" <?php if (!$is_logged_in) echo 'disabled'; ?>>
                                    <option value="still enough" <?= ($supply['collected'] === 'still enough') ? 'selected' : '' ?>>Still Enough</option>
                                    <option value="bought items" <?= ($supply['collected'] === 'bought items') ? 'selected' : '' ?>>Bought Items</option>
                                    <option value=" " <?= (!in_array($supply['collected'], ['still enough', 'bought items'])) ? 'selected' : '' ?>> </option>
                                </select>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
                <?php if ($is_logged_in): ?>
                    <button type="submit" id="saveSuppliesButton">Update Supplies</button>
                <?php else: ?>
                    <button type="submit" id="saveSuppliesButton" disabled title="Please log in to submit changes">Update Supplies</button>
                <?php endif; ?>
            </form>
        <?php endif; ?>
    </div>
    <!-- Wishlist -->
    <div class="section" id="wishlist-section">
        <h2 class='section-title'>Wishlist</h2>
        <div id="wishlistSuccessMessage" class="message success" style="display:none;"></div>
        <div id="wishlistErrorMessage" class="message error" style="display:none;"></div>
        <?php if ($is_logged_in): ?>
            <form id="addWishlistItemForm">
                <input type="text" id="wishlistItemName" placeholder="Enter item name" required>
                <button type="submit">Add to Wishlist</button>
            </form>
        <?php else: ?>
            <p><small>Log in to add items to the wishlist.</small></p>
        <?php endif; ?>
        <h4>Current Wishlist:</h4>
        <ul id="wishlistItemsList">
            <?php if (empty($wishlistItems)): ?>
                <li id="no-wishlist-items">No items in the wishlist yet.</li>
            <?php else: ?>
                <?php foreach ($wishlistItems as $item): ?>
                    <li data-id="<?= $item['id'] ?>">
                        <?= htmlspecialchars($item['item']) ?>
                        <?php if ($is_logged_in): ?>
                            <button class="delete-wishlist-item" data-id="<?= $item['id'] ?>">Delete</button>
                        <?php endif; ?>
                    </li>
                <?php endforeach; ?>
            <?php endif; ?>
        </ul>
    </div>
    <!-- Latetasks -->
    <div class="section" id="latetasks-section">
        <h2 class='section-title'>Late Tasks</h2>
        <div id="lateTaskSuccessMessage" class="message success" style="display:none;"></div>
        <div id="lateTaskErrorMessage" class="message error" style="display:none;"></div>
        <?php if ($is_logged_in): ?>
            <form id="addLateTaskForm">
                <div>
                    <label for="lateTaskName">Name:</label>
                    <select id="lateTaskName" name="lateTaskName" required>
                        <option value="">-- Select Roommate --</option>
                        <?php foreach ($allRoommates as $roommate): ?>
                            <option value="<?= htmlspecialchars($roommate['name']) ?>"><?= htmlspecialchars($roommate['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label for="lateTaskDay">Day:</label>
                    <select id="lateTaskDay" name="lateTaskDay" required>
                        <option value="">-- Select Day --</option>
                        <?php foreach ($daysOfWeek as $day): ?>
                            <option value="<?= htmlspecialchars($day) ?>"><?= htmlspecialchars($day) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label for="lateTaskDescription">Task:</label>
                    <input type="text" id="lateTaskDescription" name="lateTaskDescription" placeholder="Enter task description" required>
                </div>
                <button type="submit">Add Late Task</button>
            </form>
        <?php else: ?>
            <p><small>Log in to add late tasks.</small></p>
        <?php endif; ?>
        <h4>Current Late Tasks:</h4>
        <ul id="lateTasksList">
            <?php if (empty($lateTasks)): ?>
                <li id="no-late-tasks">No late tasks recorded.</li>
            <?php else: ?>
                <?php foreach ($lateTasks as $lt): ?>
                    <li data-id="<?= $lt['id'] ?>">
                        <strong><?= htmlspecialchars($lt['name']) ?></strong> (<?= htmlspecialchars($lt['day']) ?>): <?= htmlspecialchars($lt['task']) ?>
                    </li>
                <?php endforeach; ?>
            <?php endif; ?>
        </ul>
    </div>
    <!-- Incomplete Tasks -->
    <div class="section" id="summary-section">
        <h2 class='section-title'>Incomplete Tasks</h2>
        <button id="showSummaryButton" class="summary-btn">Show Summary</button>
    </div>
    <!-- Reset -->
    <div class="section" id="reset-section">
        <h2 class='section-title'>Reset For The New Week</h2>
        <div id="resetSignaturesSuccessMessage" class="message success" style="display:none;">All signatures reset!</div>
        <button id="resetAllSignaturesButton" class="danger-button" <?php if (!$is_logged_in) echo 'disabled title="Log in to use reset functions"'; ?>>Reset Task Signatures</button>
        <div id="resetSuppliesSuccessMessage" class="message success" style="display:none;">Supplies reset!</div>
        <button id="resetSuppliesButton" class="danger-button" <?php if (!$is_logged_in) echo 'disabled title="Log in to use reset functions"'; ?>>Reset Supplies</button>
        <div id="resetLateTasksSuccessMessage" class="message success" style="display:none;">Late tasks reset!</div>
        <div id="resetLateTasksErrorMessage" class="message error" style="display:none;"></div>
        <button id="resetAllLateTasksButton" class="danger-button" <?php if (!$is_logged_in) echo 'disabled title="Log in to use reset functions"'; ?>>Reset All Late Tasks</button>
    </div>

    <div id="summaryModal" class="modal">
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2 id="summary-title">Incomplete Tasks</h2>
            <div id="summaryContent">
                </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>