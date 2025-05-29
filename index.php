<?php
// index.php
require_once 'auth_check.php'; // Includes config.php and starts session

$login_error_message = ''; //

// Handle login attempt
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_attempt'])) { //
    $username = $_POST['username'] ?? ''; //
    $password = $_POST['password'] ?? ''; //
    $remember_me = isset($_POST['remember_me']); //

    if (loginUser($username, $password, $remember_me)) { //
        header('Location: index.php'); //
        exit; //
    } else {
        $login_error_message = 'Invalid username or password.'; //
    }
}

$is_logged_in = isUserLoggedIn(); //

// Data fetching ALWAYS happens, regardless of login state
require_once 'db_functions.php'; //
$tasks = getTasks(); //
$tasksWithSubtasks = getAllTasksWithSubtasks(); //
$supplies = getSupplies(); //
$wishlistItems = getWishlistItems();  //
$allRoommates = getAllRoommates(); //
$lateTasks = getLateTasks(); //
$daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; //

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>7.2 Cleaning Tasks</title>
    <link rel="stylesheet" href="styles.css"> <style>
        /* Styles for the top login/user status bar */
        .status-bar {
            background-color: #e9ecef;
            padding: 10px 20px;
            border-bottom: 1px solid #dee2e6;
            margin-bottom: 20px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
        }
        .status-bar .login-area form {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-bar .login-area input[type="text"],
        .status-bar .login-area input[type="password"] {
            padding: 5px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .status-bar .login-area button {
            padding: 5px 10px;
            font-size: 0.9em;
        }
        .status-bar .user-info span {
            margin-right: 15px;
        }
        .status-bar .user-info a, .status-bar .login-area button {
            padding: 6px 12px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            border: none;
            cursor: pointer;
        }
        .status-bar .user-info a:hover, .status-bar .login-area button:hover {
            background-color: #0056b3;
        }
         .status-bar .user-info a.logout {
            background-color: #dc3545;
         }
         .status-bar .user-info a.logout:hover {
            background-color: #c82333;
         }
        .login-error-top {
            color: red;
            font-size: 0.9em;
            margin-right: 15px;
        }
        .remember-me-top label {
            font-size: 0.9em;
            margin-left: 2px;
        }
    </style>
</head>
<body>

    <div class="status-bar">
        <?php if ($is_logged_in): ?>
            <div class="user-info">
                <span>Welcome, <?php echo htmlspecialchars($_SESSION['username'] ?? 'User'); ?>!</span>
                <a href="logout.php" class="logout">Logout</a>
            </div>
        <?php else: ?>
            <div class="login-area">
                <?php if (!empty($login_error_message)): ?>
                    <span class="login-error-top"><?php echo htmlspecialchars($login_error_message); ?></span>
                <?php endif; ?>
                <form method="POST" action="index.php">
                    <input type="hidden" name="login_attempt" value="1">
                    <input type="text" id="username_top" name="username" placeholder="Username" required>
                    <input type="password" id="password_top" name="password" placeholder="Password" required>
                    <span class="remember-me-top">
                        <input type="checkbox" id="remember_me_top" name="remember_me">
                        <label for="remember_me_top">Remember</label>
                    </span>
                    <button type="submit">Login</button>
                </form>
            </div>
        <?php endif; ?>
    </div>

    <h1>7.2 Cleaning Tasks</h1> <div class="section" id="subtask-assignment-section"> <h2>Sign off on your task!</h2> <?php if (empty($tasksWithSubtasks)): ?>
            <p>No tasks found or no members assigned to tasks yet.</p> <?php else: ?>
            <?php foreach ($tasksWithSubtasks as $task): ?>
                <div class="task-container" id="task-<?= $task['id'] ?>"> <div class="task-header"> <div class="task-title"><?= htmlspecialchars($task['taskname']) ?></div> <?php if (!empty($task['team_members'])): ?>
                            <div class="team-info"> Assigned: 
                                <?php foreach ($task['team_members'] as $index => $member): ?>
                                    <span class="team-member"><?= htmlspecialchars($member) ?></span> <?php if ($index < count($task['team_members']) - 1): ?> & <?php endif; ?> <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <div class="team-info">No members assigned yet</div> <?php endif; ?>
                    </div>
                    
                    <div class="subtask-success-message-<?= $task['id'] ?> message success" style="display:none;"> Subtask assignments saved successfully! </div>
                    
                    <?php if (empty($task['subtasks'])): ?>
                        <p>No subtasks found for this task.</p> <?php elseif (empty($task['team_members']) && $is_logged_in): // Show forms only if members can be assigned or are assigned ?>
                        <p>Please assign members to this task first (in the 'Assign Members' section below).</p> <?php elseif (empty($task['team_members']) && !$is_logged_in): ?>
                         <p>Members not yet assigned to this task.</p>
                    <?php else: ?>
                        <form class="subtask-form" data-task-id="<?= $task['id'] ?>"> <table>
                                <thead>
                                    <tr>
                                        <th>Subtask</th> <th>Sign-off</th> </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($task['subtasks'] as $subtask): ?>
                                        <tr>
                                            <td><?= htmlspecialchars($subtask['subtask']) ?></td> <td>
                                                <select name="signature[<?= $subtask['id'] ?>]" class="person-select" <?php if (!$is_logged_in) echo 'disabled'; ?>> <option value="">-- Select Person --</option> <?php foreach ($task['team_members'] as $member): ?>
                                                        <option value="<?= htmlspecialchars($member) ?>" <?= ($subtask['signature'] === $member) ? 'selected' : '' ?>> <?= htmlspecialchars($member) ?> </option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                            <?php if ($is_logged_in): ?>
                                <button type="submit">Submit</button> <?php else: ?>
                                <button type="submit" disabled title="Please log in to submit changes">Submit</button>
                            <?php endif; ?>
                        </form>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <div class="section" id="member-assignment-section"> <h2>Assign Members to Tasks</h2> <div id="taskAssignmentSuccessMessage" class="message success" style="display:none;"></div> <div id="taskAssignmentErrorMessage" class="message error" style="display:none;"></div> <form id="taskAssignmentForm"> <table id="taskTable"> <thead>
                    <tr>
                        <th>Task</th> <th>Member 1</th> <th>Member 2</th> </tr>
                </thead>
                <tbody>
                    <?php foreach($tasks as $task): ?>
                    <tr data-task-id="<?= $task['id'] ?>"> <td><?= htmlspecialchars($task['taskname']) ?></td> <td>
                            <select class="member-select" name="tasks[<?= $task['id'] ?>][member1]" <?php if (!$is_logged_in) echo 'disabled'; ?>> <option value="">-- Select Member 1 --</option> <?php foreach($allRoommates as $roommate): ?>
                                    <option value="<?= $roommate['id'] ?>" <?= ($roommate['id'] == $task['member1_id']) ? 'selected' : '' ?>> <?= htmlspecialchars($roommate['name']) ?> </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                        <td>
                            <select class="member-select" name="tasks[<?= $task['id'] ?>][member2]" <?php if (!$is_logged_in) echo 'disabled'; ?>> <option value="">-- Select Member 2 --</option> <?php foreach($allRoommates as $roommate): ?>
                                    <option value="<?= $roommate['id'] ?>" <?= ($roommate['id'] == $task['member2_id']) ? 'selected' : '' ?>> <?= htmlspecialchars($roommate['name']) ?> </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php if ($is_logged_in): ?>
                <button type="submit" id="saveTaskAssignmentButton">Save Member Assignments</button> <?php else: ?>
                <button type="submit" id="saveTaskAssignmentButton" disabled title="Please log in to submit changes">Save Member Assignments</button>
            <?php endif; ?>
        </form>
    </div>
    
    <div class="section" id="supplies-section"> <h2>Supplies</h2> <div id="suppliesSuccessMessage" class="message success" style="display:none;"></div> <?php if (empty($supplies)): ?>
            <p>No supplies found in the database.</p> <?php else: ?>
            <form id="suppliesForm"> <table id="suppliesTable"> <thead>
                    <tr>
                        <th>Item</th> <th>Status</th> </tr>
                </thead>
                <tbody>
                    <?php foreach ($supplies as $supply): ?>
                        <tr data-supply-id="<?= $supply['id'] ?>"> <td><?= htmlspecialchars(ucfirst(str_replace('_', ' ', $supply['item']))) ?></td> <td>
                                <select name="supplies[<?= $supply['id'] ?>]" class="supply-status-select" <?php if (!$is_logged_in) echo 'disabled'; ?>> <option value="still enough" <?= ($supply['collected'] === 'still enough') ? 'selected' : '' ?>>Still Enough</option> <option value="bought items" <?= ($supply['collected'] === 'bought items') ? 'selected' : '' ?>>Bought Items</option> <option value=" " <?= (!in_array($supply['collected'], ['still enough', 'bought items'])) ? 'selected' : '' ?>> </option> </select>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
                <?php if ($is_logged_in): ?>
                    <button type="submit" id="saveSuppliesButton">Update Supplies</button> <?php else: ?>
                    <button type="submit" id="saveSuppliesButton" disabled title="Please log in to submit changes">Update Supplies</button>
                <?php endif; ?>
            </form>
        <?php endif; ?>
    </div>

    <div class="section" id="wishlist-section"> <h2>Wishlist</h2> <div id="wishlistSuccessMessage" class="message success" style="display:none;"></div> <div id="wishlistErrorMessage" class="message error" style="display:none;"></div> <?php if ($is_logged_in): ?>
            <form id="addWishlistItemForm"> <input type="text" id="wishlistItemName" placeholder="Enter item name" required> <button type="submit">Add to Wishlist</button> </form>
        <?php endif; ?>
        <h4>Current Wishlist:</h4> <ul id="wishlistItemsList"> <?php if (empty($wishlistItems)): ?>
                <li id="no-wishlist-items">No items in the wishlist yet.</li> <?php else: ?>
                <?php foreach ($wishlistItems as $item): ?>
                    <li data-id="<?= $item['id'] ?>"> <?= htmlspecialchars($item['item']) ?> <?php if ($is_logged_in): ?>
                            <button class="delete-wishlist-item" data-id="<?= $item['id'] ?>">Delete</button> <?php endif; ?>
                    </li>
                <?php endforeach; ?>
            <?php endif; ?>
        </ul>
    </div>

    <div class="section" id="latetasks-section"> <h2>Late Tasks</h2> <div id="lateTaskSuccessMessage" class="message success" style="display:none;"></div> <div id="lateTaskErrorMessage" class="message error" style="display:none;"></div> <?php if ($is_logged_in): ?>
            <form id="addLateTaskForm"> <div>
                    <label for="lateTaskName">Name:</label> <select id="lateTaskName" name="lateTaskName" required> <option value="">-- Select Roommate --</option> <?php foreach ($allRoommates as $roommate): ?>
                            <option value="<?= htmlspecialchars($roommate['name']) ?>"><?= htmlspecialchars($roommate['name']) ?></option> <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label for="lateTaskDay">Day:</label> <select id="lateTaskDay" name="lateTaskDay" required> <option value="">-- Select Day --</option> <?php foreach ($daysOfWeek as $day): ?>
                            <option value="<?= htmlspecialchars($day) ?>"><?= htmlspecialchars($day) ?></option> <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label for="lateTaskDescription">Task:</label> <input type="text" id="lateTaskDescription" name="lateTaskDescription" placeholder="Enter task description" required> </div>
                <button type="submit">Add Late Task</button> </form>
        <?php endif;