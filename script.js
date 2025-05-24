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