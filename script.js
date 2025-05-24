document.addEventListener('DOMContentLoaded', function() {
    // ==========================================
    // Team Assignment Form Handling
    // ==========================================
    const teamForm = document.getElementById('taskAssignmentForm');
    
    // Add submit event listener to the team form
    if (teamForm) {
        teamForm.addEventListener('submit', function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Collect all task-team assignments
            const taskTeams = [];
            const selects = document.querySelectorAll('.team-select');
            
            selects.forEach(select => {
                taskTeams.push({
                    taskId: select.name.match(/\d+/)[0], // Extract task ID from the name attribute
                    teamId: select.value
                });
            });
            
            // Send data to the server
            updateTaskTeams(taskTeams);
        });
    }

    // Function to update task team assignments
    function updateTaskTeams(taskTeams) {
        const formData = new FormData();
        formData.append('action', 'updateTasks');
        formData.append('taskTeams', JSON.stringify(taskTeams));
        
        fetch('api_teams.php', {  // Updated endpoint
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                const successMessage = document.getElementById('teamSuccessMessage');
                successMessage.style.display = 'block';
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
                
                // Reload the page to refresh the subtask section with updated team assignments
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                alert('Error: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the tasks.');
        });
    }
    
    // ==========================================
    // Subtask Assignment Forms Handling
    // ==========================================
    const subtaskForms = document.querySelectorAll('.subtask-form');
    
    // Add submit event listeners to all subtask forms
    subtaskForms.forEach(form => {
        form.addEventListener('submit', function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Get the task ID from the form
            const taskId = this.getAttribute('data-task-id');
            
            // Collect all subtask-signature assignments
            const signatures = {};
            const selects = this.querySelectorAll('.person-select');

            selects.forEach(select => {
                // Extract subtask ID from the name attribute (e.g., signature[123])
                const subtaskId = select.name.match(/\d+/)[0];
                signatures[subtaskId] = select.value;
            });
            
            // Send data to the server
            updateSubtaskSignatures(taskId, signatures);
        });
    });
    
    // Function to update subtask signatures
    function updateSubtaskSignatures(taskId, signatures) {
        const formData = new FormData();
        formData.append('action', 'updateSignatures');
        formData.append('taskId', taskId);
        formData.append('signatures', JSON.stringify(signatures));
        
        // Log what we're sending
        console.log('Sending to server:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        fetch('api_tasks.php', {  // Updated endpoint
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message for this specific task
                const successMessage = document.querySelector(`.subtask-success-message-${taskId}`);
                if (successMessage) {
                    successMessage.style.display = 'block';
                    
                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 3000);
                }
            } else {
                alert('Error: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the subtask assignments.');
        });
    }
    
    // ==========================================
    // Supplies Form Handling
    // ==========================================
    const suppliesForm = document.getElementById('suppliesForm');
    
    if (suppliesForm) {
        suppliesForm.addEventListener('submit', function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Collect all supply statuses
            const supplies = [];
            const checkboxes = document.querySelectorAll('input[name^="supplies["]');
            
            checkboxes.forEach(checkbox => {
                // Extract supply ID from the name attribute (e.g., supplies[1])
                const supplyId = checkbox.name.match(/\d+/)[0];
                supplies.push({
                    id: supplyId,
                    collected: checkbox.checked ? 1 : 0
                });
            });
            
            // Send data to the server
            console.log(supplies)
            updateSupplies(supplies);
        });
    }
    
    // Function to update supplies status
    function updateSupplies(supplies) {
        const formData = new FormData();
        formData.append('action', 'updateSupplies');
        formData.append('supplies', JSON.stringify(supplies));
        
        // Log what we're sending
        console.log('Sending supplies to server:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        fetch('api_supplies.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                const successMessage = document.getElementById('suppliesSuccessMessage');
                successMessage.style.display = 'block';
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                alert('Error: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the supplies.');
        });
    }

    // ==========================================
    // Late Tasks Handling
    // ==========================================
    const addLateTaskForm = document.getElementById('addLateTaskForm');
    const lateTaskNameSelect = document.getElementById('lateTaskName');
    const lateTaskDaySelect = document.getElementById('lateTaskDay');
    const lateTaskDescriptionInput = document.getElementById('lateTaskDescription');
    const lateTasksList = document.getElementById('lateTasksList');
    const lateTaskSuccessMessage = document.getElementById('lateTaskSuccessMessage');
    const lateTaskErrorMessage = document.getElementById('lateTaskErrorMessage');

    function displayLateTaskMessage(message, isSuccess) {
        const messageElement = isSuccess ? lateTaskSuccessMessage : lateTaskErrorMessage;
        if (messageElement) { // Check if element exists
            messageElement.textContent = message;
            messageElement.style.display = 'block';
            messageElement.className = isSuccess ? 'message success' : 'message error';

            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        } else {
            console.warn("Message element for late tasks not found.");
        }
    }

    function addLateTaskToUI(lateTask) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', lateTask.id);
        listItem.innerHTML = `<strong>${escapeHTML(lateTask.name)}</strong> (${escapeHTML(lateTask.day)}): ${escapeHTML(lateTask.task)} `; // Use innerHTML to set strong tag

        lateTasksList.appendChild(listItem);

        const noItemsMessage = document.getElementById('no-late-tasks');
        if (noItemsMessage) {
            noItemsMessage.remove();
        }
    }
    
    // Helper to escape HTML special characters
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    if (addLateTaskForm) {
        addLateTaskForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const name = lateTaskNameSelect.value;
            const day = lateTaskDaySelect.value;
            const task = lateTaskDescriptionInput.value.trim();

            if (!name || !day || !task) {
                displayLateTaskMessage('All fields (Name, Day, Task) are required.', false);
                return;
            }

            const formData = new FormData();
            formData.append('action', 'addLateTask');
            formData.append('name', name);
            formData.append('day', day);
            formData.append('task', task);

            fetch('api_latetask.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.lateTask) {
                    addLateTaskToUI(data.lateTask);
                    lateTaskNameSelect.value = ''; // Clear select
                    lateTaskDaySelect.value = '';  // Clear select
                    lateTaskDescriptionInput.value = ''; // Clear input
                    displayLateTaskMessage(data.message, true);
                } else {
                    displayLateTaskMessage(data.message || 'Could not add late task.', false);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                displayLateTaskMessage('An error occurred while adding the late task.', false);
            });
        });
    }

    // ==========================================
    // Reset All Late Tasks Button Handling
    // ==========================================
    const resetLateTasksButton = document.getElementById('resetAllLateTasksButton');
    const resetLateTasksSuccessMessage = document.getElementById('resetLateTasksSuccessMessage');
    const resetLateTasksErrorMessage = document.getElementById('resetLateTasksErrorMessage');

    if (resetLateTasksButton) {
        resetLateTasksButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset ALL late tasks? This action cannot be undone.')) {
                resetAllLateTasks();
            }
        });
    }

    function displayResetLateTasksMessage(message, isSuccess) {
        const messageElement = isSuccess ? resetLateTasksSuccessMessage : resetLateTasksErrorMessage;
         if (messageElement) { // Check if element exists
            messageElement.textContent = message;
            messageElement.style.display = 'block';
            messageElement.className = isSuccess ? 'message success' : 'message error';

            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        } else {
            console.warn("Message element for reset late tasks not found.");
        }
    }

    function resetAllLateTasks() {
        const formData = new FormData();
        formData.append('action', 'resetAllLateTasks');

        fetch('api_reset.php', { // Pointing to the existing api_reset.php
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayResetLateTasksMessage(data.message, true);
                // Clear the list from UI
                while (lateTasksList.firstChild) {
                    lateTasksList.removeChild(lateTasksList.firstChild);
                }
                const noItemsMessage = document.createElement('li');
                noItemsMessage.id = 'no-late-tasks';
                noItemsMessage.textContent = 'No late tasks recorded.';
                lateTasksList.appendChild(noItemsMessage);
            } else {
                displayResetLateTasksMessage(data.message || 'An unknown error occurred.', false);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayResetLateTasksMessage('An error occurred while resetting late tasks.', false);
        });
    }

    // ==========================================
    // Wishlist Handling
    // ==========================================
    const addWishlistItemForm = document.getElementById('addWishlistItemForm');
    const wishlistItemNameInput = document.getElementById('wishlistItemName');
    const wishlistItemsList = document.getElementById('wishlistItemsList');
    const wishlistSuccessMessage = document.getElementById('wishlistSuccessMessage');
    const wishlistErrorMessage = document.getElementById('wishlistErrorMessage');

    function displayWishlistMessage(message, isSuccess) {
        const messageElement = isSuccess ? wishlistSuccessMessage : wishlistErrorMessage;
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        messageElement.className = isSuccess ? 'message success' : 'message error'; // Ensure correct class

        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
    
    // Function to add item to UI
    function addWishlistItemToUI(item) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', item.id);
        listItem.textContent = item.item + ' '; // Add space for the button

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-wishlist-item';
        deleteButton.setAttribute('data-id', item.id);
        
        deleteButton.addEventListener('click', function() {
            handleDeleteWishlistItem(item.id);
        });

        listItem.appendChild(deleteButton);
        wishlistItemsList.appendChild(listItem);

        // Remove "No items" message if present
        const noItemsMessage = document.getElementById('no-wishlist-items');
        if (noItemsMessage) {
            noItemsMessage.remove();
        }
    }

    // Handle Add Wishlist Item Form Submission
    if (addWishlistItemForm) {
        addWishlistItemForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const itemName = wishlistItemNameInput.value.trim();

            if (!itemName) {
                displayWishlistMessage('Item name cannot be empty.', false);
                return;
            }

            const formData = new FormData();
            formData.append('action', 'addWishlistItem');
            formData.append('item', itemName);

            fetch('api_supplies.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.item) {
                    addWishlistItemToUI(data.item);
                    wishlistItemNameInput.value = ''; // Clear input
                    displayWishlistMessage(data.message, true);
                } else {
                    displayWishlistMessage(data.message || 'Could not add item.', false);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                displayWishlistMessage('An error occurred while adding the item.', false);
            });
        });
    }

    // Function to handle delete wishlist item
    function handleDeleteWishlistItem(itemId) {

        const formData = new FormData();
        formData.append('action', 'deleteWishlistItem');
        formData.append('itemId', itemId);

        fetch('api_supplies.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const itemElement = wishlistItemsList.querySelector(`li[data-id="${itemId}"]`);
                if (itemElement) {
                    itemElement.remove();
                }
                displayWishlistMessage(data.message, true);

                // If list is empty, show "No items" message
                if (wishlistItemsList.children.length === 0) {
                    const noItemsMessage = document.createElement('li');
                    noItemsMessage.id = 'no-wishlist-items';
                    noItemsMessage.textContent = 'No items in the wishlist yet.';
                    wishlistItemsList.appendChild(noItemsMessage);
                }
            } else {
                displayWishlistMessage(data.message || 'Could not delete item.', false);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayWishlistMessage('An error occurred while deleting the item.', false);
        });
    }

    // Add event listeners to existing delete buttons on page load
    document.querySelectorAll('.delete-wishlist-item').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            handleDeleteWishlistItem(itemId);
        });
    });

    // ==========================================
    // Reset All Signatures Button Handling
    // ==========================================
    const resetSignaturesButton = document.getElementById('resetAllSignaturesButton');
    
    if (resetSignaturesButton) {
        resetSignaturesButton.addEventListener('click', function() {
            // Ask for confirmation before proceeding
            if (confirm('Are you sure you want to reset all signature assignments? This action cannot be undone.')) {
                resetAllSignatures();
            }
        });
    }
    
    // Function to reset all signatures
    function resetAllSignatures() {
        const formData = new FormData();
        formData.append('action', 'resetAllSignatures');
        
        // Log what we're sending
        console.log('Sending to server:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        fetch('api_reset.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                const successMessage = document.getElementById('resetSignaturesSuccessMessage');
                successMessage.style.display = 'block';
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
                
                // Reset all dropdown selections to default
                document.querySelectorAll('.person-select').forEach(select => {
                    select.value = ''; // Set to empty (default option)
                });
                
                // We don't need to reload the page now that we've manually reset the dropdowns
            } else {
                alert('Error: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while resetting signatures.');
        });
    }

    // ==========================================
    // Reset Supplies Button Handling
    // ==========================================
    const resetSuppliesButton = document.getElementById('resetSuppliesButton');
    
    if (resetSuppliesButton) {
        resetSuppliesButton.addEventListener('click', function() {
            // Ask for confirmation before proceeding
            if (confirm('Are you sure you want to reset all supplies? This action cannot be undone.')) {
                resetSupplies();
            }
        });
    }

    // Function to reset all signatures
    function resetSupplies() {
        const formData = new FormData();
        formData.append('action', 'resetSupplies');
        
        // Log what we're sending
        console.log('Sending to server:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        fetch('api_reset.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                const successMessage = document.getElementById('resetSuppliesSuccessMessage');
                successMessage.style.display = 'block';
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
                
                // Reset all checkboxes to default
                const suppliesForm = document.getElementById('suppliesForm');
                if (suppliesForm) {
                    const checkboxes = suppliesForm.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = false;
                    });
                    console.log("js unchecked boxes")
                }
                
                // We don't need to reload the page now that we've manually reset the dropdowns
            } else {
                alert('Error: ' + (data.message || 'An unknown error occurred'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while resetting signatures.');
        });
    }

});