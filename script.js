document.addEventListener('DOMContentLoaded', function () {
  // Rules Handling
  const toggleButton = document.getElementById('toggleButton');
  const rulesDiv = document.getElementById('rules');
  toggleButton.addEventListener('click', function() {
    rulesDiv.classList.toggle('hidden');
  });
  
  // ==========================================
  // Blockout Logic
  // ==========================================
  const DAY_MON = 1; //TODO: clean this up doesn't do anything
  const DAY_WED = 3;
  const DAY_FRI = 5;

  function isSubmissionBlocked(triggerDay) {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const currentHour = now.getHours(); // 0-23
    const adjustedTrigger = triggerDay + 1;

    if (adjustedTrigger === 1) {
      if (currentDay === 1 && currentHour >= 6 && currentHour < 12) {
        return true; // Blocked
      }
    } else if (adjustedTrigger === 3) {
      if (currentDay === 3 && currentHour >= 6) {
        console.log('triggered!')
        return true;
      }
      if (currentDay === 4 || currentDay === 5 || currentDay === 6 || currentDay === 0) {
        return true;
      }
      if (currentDay === 1 && currentHour < 12) {
        return true;
      }
    } else if (adjustedTrigger === 5) {
      if (currentDay === 5 && currentHour >= 6) {
        return true;
      }
      if (currentDay === 6 || currentDay === 0) {
        return true;
      }
      if (currentDay === 1 && currentHour < 12) {
        return true;
      }
    }
    return false;
  }

  function initializeSubtaskBlockouts() {
    // Find all person-selects that have the data attribute
    const selects = document.querySelectorAll(
      '.person-select[data-blockout-day]'
    );

    selects.forEach((select) => {
      const triggerDay = parseInt(
        select.getAttribute('data-blockout-day'),
        10
      );
      console.log(select)
      
      // Check if the day is valid and if submission is blocked
      if (triggerDay && isSubmissionBlocked(triggerDay)) {
        // This is what grays it out and makes it un-selectable
        select.disabled = true;
        select.style.opacity = '0.5';
        select.style.cursor = 'not-allowed';
      }
    });
  }
  initializeSubtaskBlockouts();



  // ==========================================
  // Team Assignment Form Handling
  // ==========================================
  const taskAssignmentForm = document.getElementById('taskAssignmentForm');
  const taskAssignmentSuccessMessage = document.getElementById(
    'taskAssignmentSuccessMessage'
  );
  const taskAssignmentErrorMessage = document.getElementById(
    'taskAssignmentErrorMessage'
  );

  if (taskAssignmentForm) {
    taskAssignmentForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const taskAssignments = [];
      const taskRows = taskAssignmentForm.querySelectorAll('tbody tr');
      let formIsValid = true;
      let errorMessages = [];

      taskRows.forEach((row) => {
        const taskId = row.getAttribute('data-task-id');
        const member1Select = row.querySelector(
          'select[name*="[member1]"]'
        );
        const member2Select = row.querySelector(
          'select[name*="[member2]"]'
        );

        const member1Id = member1Select ? member1Select.value : null;
        const member2Id = member2Select ? member2Select.value : null;

        if (member1Id && member2Id && member1Id === member2Id) {
          formIsValid = false;
          if (member1Select) member1Select.style.border = '2px solid red';
          if (member2Select) member2Select.style.border = '2px solid red';
          const taskName = row.querySelector('td:first-child').textContent;
          errorMessages.push(
            `Task "${taskName}": Member 1 and Member 2 cannot be the same person.`
          );
        } else {
          if (member1Select) member1Select.style.border = '';
          if (member2Select) member2Select.style.border = '';
        }

        taskAssignments.push({
          taskId: taskId,
          member1Id: member1Id,
          member2Id: member2Id,
        });
      });

      if (!formIsValid) {
        if (taskAssignmentErrorMessage) {
          taskAssignmentErrorMessage.innerHTML = errorMessages.join('<br>');
          taskAssignmentErrorMessage.style.display = 'block';
          if (taskAssignmentSuccessMessage)
            taskAssignmentSuccessMessage.style.display = 'none';
        } else {
          alert('Validation Error:\n' + errorMessages.join('\n'));
        }
        setTimeout(() => {
          if (taskAssignmentErrorMessage)
            taskAssignmentErrorMessage.style.display = 'none';
        }, 5000);
        return;
      }

      if (taskAssignmentErrorMessage)
        taskAssignmentErrorMessage.style.display = 'none';
      updateTaskMemberAssignments(taskAssignments);
    });
  }

  function updateTaskMemberAssignments(taskAssignments) {
    const formData = new FormData();
    formData.append('action', 'updateTasks');
    formData.append('taskAssignments', JSON.stringify(taskAssignments));

    fetch('api_teams.php', {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          if (taskAssignmentSuccessMessage) {
            taskAssignmentSuccessMessage.textContent =
              data.message || 'Member assignments saved successfully!'; // Use server message
            taskAssignmentSuccessMessage.style.display = 'block';
          }
          if (taskAssignmentErrorMessage)
            taskAssignmentErrorMessage.style.display = 'none';

          setTimeout(() => {
            if (taskAssignmentSuccessMessage)
              taskAssignmentSuccessMessage.style.display = 'none';
          }, 3000);

          // Optionally reload to see changes reflected, especially team names in subtask section
           setTimeout(() => {
             window.location.reload();
           }, 1000); // Reload after 1 second to allow message to be seen
        } else {
          if (taskAssignmentErrorMessage) {
            taskAssignmentErrorMessage.textContent =
              'Error: ' + (data.message || 'An unknown error occurred');
            taskAssignmentErrorMessage.style.display = 'block';
          } else {
            alert('Error: ' + (data.message || 'An unknown error occurred'));
          }
          if (taskAssignmentSuccessMessage)
            taskAssignmentSuccessMessage.style.display = 'none';
          setTimeout(() => {
            if (taskAssignmentErrorMessage)
              taskAssignmentErrorMessage.style.display = 'none';
          }, 5000);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        if (taskAssignmentErrorMessage) {
          taskAssignmentErrorMessage.textContent =
            'An error occurred while updating task assignments.';
          taskAssignmentErrorMessage.style.display = 'block';
        } else {
          alert('An error occurred while updating task assignments.');
        }
        if (taskAssignmentSuccessMessage)
          taskAssignmentSuccessMessage.style.display = 'none';
      });
  }

  // ==========================================
  // Subtask Assignment Forms Handling 
  // ==========================================
  const subtaskForms = document.querySelectorAll('.subtask-form');

  subtaskForms.forEach((form) => {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const currentForm = event.target; 
      const taskId = currentForm.getAttribute('data-task-id'); // This is taskteams.id
      const taskVariantName = currentForm.getAttribute('data-task-variant-name'); // e.g., 'kitchen_thurs'

      const signatures = {};
      let selectsToProcess;

      if (taskVariantName) {
        const container = currentForm.closest('.task-group-container, .task-container');
        if (container) {
            selectsToProcess = container.querySelectorAll(
              `select.person-select[data-task-variant-name="${taskVariantName}"]`
            );
        } else {
            // Fallback if container not found, though less precise
            selectsToProcess = document.querySelectorAll(
              `select.person-select[data-task-variant-name="${taskVariantName}"]`
            );
            console.warn(`Subtask form for ${taskVariantName} (ID: ${taskId}) is not within expected container. Searching selects globally.`);
        }
      } else {
        // Fallback for forms where selects are direct children (original behavior)
        selectsToProcess = currentForm.querySelectorAll('select.person-select');
      }
      
      if (!selectsToProcess || selectsToProcess.length === 0) {
        console.warn(`No selects found for task ID: ${taskId}` + (taskVariantName ? ` (variant: ${taskVariantName})` : '') + `. Check data-task-variant-name attributes and DOM structure.`);
      }

      selectsToProcess.forEach((select) => {
        const subtaskIdMatch = select.name.match(/\d+/); 
        if (subtaskIdMatch) {
          const subtaskId = subtaskIdMatch[0];
          if (!select.disabled) { // Only collect from enabled selects
            signatures[subtaskId] = select.value;
          }
        }
      });

      if (Object.keys(signatures).length > 0) {
        updateSubtaskSignatures(taskId, signatures); // taskId is taskteams.id
      } else {
        console.log("No signatures with values collected to submit for task ID: " + taskId + (taskVariantName ? ` (variant: ${taskVariantName})` : ""));
        // Optionally show a "no changes" message or the success message briefly
         const successMessage = document.querySelector(`.subtask-success-message-${taskId}`);
          if (successMessage) {
            successMessage.textContent = 'No changes to submit or all signed off.';
            successMessage.style.display = 'block';
            setTimeout(() => {
              successMessage.style.display = 'none';
            }, 2000);
          }
      }
    });
  });

  function updateSubtaskSignatures(taskId, signatures) {
    const formData = new FormData();
    formData.append('action', 'updateSignatures');
    formData.append('taskId', taskId); // This is taskteams.id
    formData.append('signatures', JSON.stringify(signatures));

    fetch('api_tasks.php', { //
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          const successMessage = document.querySelector(
            `.subtask-success-message-${taskId}` // taskId is taskteams.id
          );
          if (successMessage) {
            successMessage.textContent = data.message || 'Assignments saved successfully!';
            successMessage.style.display = 'block';
            setTimeout(() => {
              successMessage.style.display = 'none';
            }, 3000);
          }
        } else {
          alert('Error: ' + (data.message || 'An unknown error occurred'));
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred while updating the subtask assignments.');
      });
  }

  // ==========================================
  // Button Blockout Logic
  // ==========================================
  function isBlockoutActive(blockoutDayIndex, blockoutHour, blockoutMinute) {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // The logic: Blockout is active if the current day is the blockout day,
    // AND the current time is 06:00 AM or later.
    if (currentDay === blockoutDayIndex) {
      if (currentHour > blockoutHour) {
        return true;
      }
      if (currentHour === blockoutHour && currentMinute >= blockoutMinute) {
        return true;
      }
    }
    return false;
  }


  // ==========================================
  // Supplies Form Handling
  // ==========================================
  const suppliesForm = document.getElementById('suppliesForm');
  const suppliesSuccessMessage = document.getElementById('suppliesSuccessMessage');


  if (suppliesForm) {
    suppliesForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const supplies = [];
      const selects = document.querySelectorAll(
        '#suppliesForm select[name^="supplies["]' 
      );
      selects.forEach((select) => {
         const supplyIdMatch = select.name.match(/\d+/);
         if (supplyIdMatch) {
            const supplyId = supplyIdMatch[0];
            supplies.push({
                id: supplyId,
                collected: select.value,
            });
        }
      });
      updateSupplies(supplies);
    });
  }

  function updateSupplies(supplies) {
    const formData = new FormData();
    formData.append('action', 'updateSupplies');
    formData.append('supplies', JSON.stringify(supplies));

    fetch('api_supplies.php', { //
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          if (suppliesSuccessMessage) { 
            suppliesSuccessMessage.textContent = data.message || 'Supplies updated successfully!';
            suppliesSuccessMessage.style.display = 'block';
            setTimeout(() => {
              suppliesSuccessMessage.style.display = 'none';
            }, 3000);
          }
        } else {
          alert('Error: ' + (data.message || 'An unknown error occurred'));
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred while updating the supplies.');
      });
  }

  // Status color Coding
  function updateSelectColors() {
    // Target both subtask and supply selects
    document.querySelectorAll('.person-select, .supply-status-select').forEach(select => {
      // A value is incomplete if it's empty or just a space
      if (select.value && select.value.trim() !== '') {
        select.classList.add('complete');
        select.classList.remove('incomplete');
      } else {
        select.classList.add('incomplete');
        select.classList.remove('complete');
      }
    });
  }

  // Add event listeners to all selects to update color on change
  document.querySelectorAll('.person-select, .supply-status-select').forEach(select => {
    select.addEventListener('change', updateSelectColors);
  });

  // Initial color update on page load
  updateSelectColors();


  // ==========================================
  // Late Tasks Handling
  // ==========================================
  const addLateTaskForm = document.getElementById('addLateTaskForm');
  const lateTaskNameSelect = document.getElementById('lateTaskName');
  const lateTaskDaySelect = document.getElementById('lateTaskDay');
  const lateTaskDescriptionInput = document.getElementById(
    'lateTaskDescription'
  );
  const lateTasksList = document.getElementById('lateTasksList');
  const lateTaskSuccessMessage = document.getElementById(
    'lateTaskSuccessMessage'
  );
  const lateTaskErrorMessage = document.getElementById('lateTaskErrorMessage');

  function displayLateTaskMessage(message, isSuccess) {
    const messageElement = isSuccess
      ? lateTaskSuccessMessage
      : lateTaskErrorMessage;
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.style.display = 'block';
      messageElement.className = isSuccess
        ? 'message success'
        : 'message error';
      setTimeout(() => {
        messageElement.style.display = 'none';
      }, 3000);
    }
  }
  
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function addLateTaskToUI(lateTask) {
    if (!lateTasksList) return; 
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', lateTask.id);
    listItem.innerHTML = `<strong>${escapeHTML(
      lateTask.name
    )}</strong> (${escapeHTML(lateTask.day)}): ${escapeHTML(lateTask.task)} `;
    
    // Add to the top of the list if you want newest first
    if (lateTasksList.firstChild && lateTasksList.firstChild.id === 'no-late-tasks') {
        lateTasksList.innerHTML = ''; // Clear "no late tasks" message
        lateTasksList.appendChild(listItem);
    } else if (lateTasksList.firstChild) {
        lateTasksList.insertBefore(listItem, lateTasksList.firstChild);
    } else {
        lateTasksList.appendChild(listItem);
    }
    
    const noItemsMessage = document.getElementById('no-late-tasks');
    if (noItemsMessage && lateTasksList.children.length > 1) { // If more than just the "no items" message
      noItemsMessage.remove();
    }
  }


  if (addLateTaskForm) {
    addLateTaskForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const name = lateTaskNameSelect.value;
      const day = lateTaskDaySelect.value;
      const task = lateTaskDescriptionInput.value.trim();

      if (!name || !day || !task) {
        displayLateTaskMessage(
          'All fields (Name, Day, Task) are required.',
          false
        );
        return;
      }

      const formData = new FormData();
      formData.append('action', 'addLateTask');
      formData.append('name', name);
      formData.append('day', day);
      formData.append('task', task);

      fetch('api_latetask.php', { //
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          const clonedResponse = response.clone();
          return response
            .json()
            .catch(() => ({
              success: false,
              message: 'Invalid JSON response from server.',
              action: clonedResponse.status === 401 ? 'logout' : undefined,
            }))
            .then((data) => ({ data, response: clonedResponse }));
        })
        .then(({ data, response }) => {
          if (data.action === 'logout' || response.status === 401) {
            window.location.href = 'index.php';
            return;
          }
          if (data.success && data.lateTask) {
            addLateTaskToUI(data.lateTask);
            if(lateTaskNameSelect) lateTaskNameSelect.value = '';
            if(lateTaskDaySelect) lateTaskDaySelect.value = '';
            if(lateTaskDescriptionInput) lateTaskDescriptionInput.value = '';
            displayLateTaskMessage(data.message, true);
          } else {
            displayLateTaskMessage(
              data.message || 'Could not add late task.',
              false
            );
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          displayLateTaskMessage(
            'An error occurred while adding the late task.',
            false
          );
        });
    });
  }

  // ==========================================
  // Reset All Late Tasks Button Handling
  // ==========================================
  const resetLateTasksButton = document.getElementById(
    'resetAllLateTasksButton'
  );
  const resetLateTasksSuccessMessage = document.getElementById(
    'resetLateTasksSuccessMessage'
  );
  const resetLateTasksErrorMessage = document.getElementById(
    'resetLateTasksErrorMessage'
  );

  if (resetLateTasksButton) {
    resetLateTasksButton.addEventListener('click', function () {
      if (
        confirm(
          'Are you sure you want to reset ALL late tasks? This action cannot be undone.'
        )
      ) {
        resetAllLateTasks();
      }
    });
  }

  function displayResetLateTasksMessage(message, isSuccess) {
    const messageElement = isSuccess
      ? resetLateTasksSuccessMessage
      : resetLateTasksErrorMessage;
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.style.display = 'block';
      messageElement.className = isSuccess
        ? 'message success'
        : 'message error'; // Ensure class is set for error messages too
      setTimeout(() => {
        messageElement.style.display = 'none';
      }, 3000);
    } else if (isSuccess) { // Fallback for success if element is missing
        alert(message);
    } else { // Fallback for error
        alert("Error: " + message);
    }
  }

  function resetAllLateTasks() {
    const formData = new FormData();
    formData.append('action', 'resetAllLateTasks');

    fetch('api_reset.php', { //
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          displayResetLateTasksMessage(data.message, true);
          if (lateTasksList) { 
            lateTasksList.innerHTML = '<li id="no-late-tasks">No late tasks recorded.</li>'; // Simpler way to reset
          }
        } else {
          displayResetLateTasksMessage(
            data.message || 'An unknown error occurred.',
            false
          );
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        displayResetLateTasksMessage(
          'An error occurred while resetting late tasks.',
          false
        );
      });
  }

  // ==========================================
  // Wishlist Handling
  // ==========================================
  const addWishlistItemForm = document.getElementById('addWishlistItemForm');
  const wishlistItemNameInput = document.getElementById('wishlistItemName');
  const wishlistItemsList = document.getElementById('wishlistItemsList');
  const wishlistSuccessMessage = document.getElementById(
    'wishlistSuccessMessage'
  );
  const wishlistErrorMessage = document.getElementById('wishlistErrorMessage');

  function displayWishlistMessage(message, isSuccess) {
    const messageElement = isSuccess
      ? wishlistSuccessMessage
      : wishlistErrorMessage;
    if (messageElement) { 
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        messageElement.className = isSuccess
        ? 'message success'
        : 'message error';
        setTimeout(() => {
        messageElement.style.display = 'none';
        }, 3000);
    }
  }
  
  function addWishlistItemToUI(item) {
    if (!wishlistItemsList) return; 
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', item.id);
    listItem.textContent = escapeHTML(item.item) + ' ';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-wishlist-item'; // Add class for potential styling/selection
    deleteButton.setAttribute('data-id', item.id);

    deleteButton.addEventListener('click', function () {
      // Confirm before deleting
      if (confirm(`Are you sure you want to delete "${escapeHTML(item.item)}" from the wishlist?`)) {
        handleDeleteWishlistItem(item.id);
      }
    });

    listItem.appendChild(deleteButton);
    
    // Add to the top of the list if you want newest first
    if (wishlistItemsList.firstChild && wishlistItemsList.firstChild.id === 'no-wishlist-items') {
        wishlistItemsList.innerHTML = ''; // Clear "no items" message
        wishlistItemsList.appendChild(listItem);
    } else if (wishlistItemsList.firstChild) {
        wishlistItemsList.insertBefore(listItem, wishlistItemsList.firstChild);
    } else {
        wishlistItemsList.appendChild(listItem);
    }

    const noItemsMessage = document.getElementById('no-wishlist-items');
    if (noItemsMessage && wishlistItemsList.children.length > 1) { // If more than just the "no items" message
        noItemsMessage.remove();
    }
  }


  if (addWishlistItemForm) {
    addWishlistItemForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const itemName = wishlistItemNameInput.value.trim();

      if (!itemName) {
        displayWishlistMessage('Item name cannot be empty.', false);
        return;
      }

      const formData = new FormData();
      formData.append('action', 'addWishlistItem');
      formData.append('item', itemName);

      fetch('api_supplies.php', { //
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          const clonedResponse = response.clone();
          return response
            .json()
            .catch(() => ({
              success: false,
              message: 'Invalid JSON response from server.',
              action: clonedResponse.status === 401 ? 'logout' : undefined,
            }))
            .then((data) => ({ data, response: clonedResponse }));
        })
        .then(({ data, response }) => {
          if (data.action === 'logout' || response.status === 401) {
            window.location.href = 'index.php';
            return;
          }
          if (data.success && data.item) {
            addWishlistItemToUI(data.item);
            if(wishlistItemNameInput) wishlistItemNameInput.value = ''; // Clear input
            displayWishlistMessage(data.message, true);
          } else {
            displayWishlistMessage(data.message || 'Could not add item.', false);
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          displayWishlistMessage(
            'An error occurred while adding the item.',
            false
          );
        });
    });
  }

  function handleDeleteWishlistItem(itemId) {
    const formData = new FormData();
    formData.append('action', 'deleteWishlistItem');
    formData.append('itemId', itemId);

    fetch('api_supplies.php', { //
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          if (wishlistItemsList) { 
            const itemElement = wishlistItemsList.querySelector(
              `li[data-id="${itemId}"]`
            );
            if (itemElement) {
              itemElement.remove();
            }
            if (wishlistItemsList.children.length === 0) {
              wishlistItemsList.innerHTML = '<li id="no-wishlist-items">No items in the wishlist yet.</li>';
            }
          }
          displayWishlistMessage(data.message, true);
        } else {
          displayWishlistMessage(
            data.message || 'Could not delete item.',
            false
          );
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        displayWishlistMessage(
          'An error occurred while deleting the item.',
          false
        );
      });
  }

  // Add event listeners to initially loaded delete buttons
  document.querySelectorAll('.delete-wishlist-item').forEach((button) => {
    button.addEventListener('click', function () {
      const itemId = this.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete this item from the wishlist?`)) {
          handleDeleteWishlistItem(itemId);
      }
    });
  });

  // ==========================================
  // Reset All Signatures Button Handling
  // ==========================================
  const resetSignaturesButton = document.getElementById(
    'resetAllSignaturesButton'
  );
  const resetSignaturesSuccessMessage = document.getElementById( 
    'resetSignaturesSuccessMessage' 
  );


  if (resetSignaturesButton) {
    resetSignaturesButton.addEventListener('click', function () {
      if (
        confirm(
          'Are you sure you want to reset all signature assignments? This action cannot be undone.'
        )
      ) {
        resetAllSignatures();
      }
    });
  }

  function resetAllSignatures() {
    const formData = new FormData();
    formData.append('action', 'resetAllSignatures');

    fetch('api_reset.php', { //
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          if (resetSignaturesSuccessMessage) { 
            resetSignaturesSuccessMessage.textContent = data.message || "All signatures reset!";
            resetSignaturesSuccessMessage.style.display = 'block';
            setTimeout(() => {
              resetSignaturesSuccessMessage.style.display = 'none';
            }, 3000);
          } else {
            alert(data.message || "All signatures reset!");
          }
          // Clear all select dropdowns for signatures
          document.querySelectorAll('.person-select').forEach((select) => {
            select.value = ''; 
          });
        } else {
          alert('Error: ' + (data.message || 'An unknown error occurred'));
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred while resetting signatures.');
      });
  }

  // ==========================================
  // Reset Supplies Button Handling
  // ==========================================
  const resetSuppliesButton = document.getElementById('resetSuppliesButton');
  const resetSuppliesSuccessMessage = document.getElementById( 
    'resetSuppliesSuccessMessage'
  );


  if (resetSuppliesButton) {
    resetSuppliesButton.addEventListener('click', function () {
      if (
        confirm(
          'Are you sure you want to reset all supplies? This action cannot be undone.'
        )
      ) {
        resetSupplies();
      }
    });
  }

  function resetSupplies() {
    const formData = new FormData();
    formData.append('action', 'resetSupplies');

    fetch('api_reset.php', { //
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        const clonedResponse = response.clone();
        return response
          .json()
          .catch(() => ({
            success: false,
            message: 'Invalid JSON response from server.',
            action: clonedResponse.status === 401 ? 'logout' : undefined,
          }))
          .then((data) => ({ data, response: clonedResponse }));
      })
      .then(({ data, response }) => {
        if (data.action === 'logout' || response.status === 401) {
          window.location.href = 'index.php';
          return;
        }
        if (data.success) {
          if (resetSuppliesSuccessMessage) { 
            resetSuppliesSuccessMessage.textContent = data.message || "Supplies reset!";
            resetSuppliesSuccessMessage.style.display = 'block';
            setTimeout(() => {
              resetSuppliesSuccessMessage.style.display = 'none';
            }, 3000);
          } else {
             alert(data.message || "Supplies reset!");
          }
          // Reset all supply dropdowns to the default empty/blank value
          const suppliesSelects = document.querySelectorAll(
            '#suppliesForm select[name^="supplies["]'
          );
          suppliesSelects.forEach((select) => {
            select.value = ' '; // Assuming ' ' is the default "not set" value
          });
        } else {
          alert('Error: ' + (data.message || 'An unknown error occurred'));
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred while resetting supplies.'); 
      });
  }

  // Summary Modal Functionality
  const summaryModal = document.getElementById('summaryModal');
  const showSummaryButton = document.getElementById('showSummaryButton');
  const summaryContent = document.getElementById('summaryContent');
  const closeModalSpan = document.querySelector('.modal .close-button');

  if (showSummaryButton) {
    showSummaryButton.addEventListener('click', generateAndShowSummary);
  }
  if (closeModalSpan) {
    closeModalSpan.addEventListener('click', () => {
      summaryModal.style.display = 'none';
    });
  }
  window.addEventListener('click', (event) => {
    if (event.target == summaryModal) {
      summaryModal.style.display = 'none';
    }
  });

  // Helper function to prevent HTML injection issues
  function escapeHTML(str) {
      const p = document.createElement('p');
      p.appendChild(document.createTextNode(str));
      return p.innerHTML;
  }

  function generateAndShowSummary() {
    summaryContent.innerHTML = '';
    let hasIncompleteItems = false;
    let finalHtml = '';

    // --- Generate Tasks Summary (Final Version with Names in Header) ---
    let tasksHtml = '';
    let incompleteTasksFound = false;

    // Handle complex multi-column tasks (Kitchen, Toilet)
    document.querySelectorAll('.task-group-container').forEach(group => {
        const selects = group.querySelectorAll('.person-select:not([disabled])');
        const isGroupIncomplete = Array.from(selects).some(s => s.value.trim() === '');

        if (isGroupIncomplete) {
            incompleteTasksFound = true;
            
            const taskTitle = group.querySelector('.task-title').textContent;
            // The title no longer needs the team info below it
            let tableHtml = `<p><strong>${escapeHTML(taskTitle)}</strong></p><table class="summary-table">`;
            
            // Recreate the table header, inserting roommate names
            tableHtml += '<thead><tr>';
            group.querySelectorAll('thead th').forEach(th => {
                // Get the main header text like "Thursday" or "Subtask"
                const headerTextNode = th.cloneNode(true);
                headerTextNode.querySelectorAll('small').forEach(sm => sm.remove()); // Remove existing small tags
                let finalHeaderText = headerTextNode.textContent.trim();

                // Find the team info within this specific header cell
                const teamInfoEl = th.querySelector('.team-info-header');
                if (teamInfoEl) {
                    const teamText = teamInfoEl.textContent.replace('Assigned:', '').trim();
                    if (teamText.toLowerCase() !== 'no team') {
                        // Append names in parentheses, e.g., "Thursday (Aisha & Helene)"
                        finalHeaderText += ` (${escapeHTML(teamText)})`;
                    }
                }
                tableHtml += `<th>${finalHeaderText}</th>`;
            });
            tableHtml += '</tr></thead>';

            // Recreate the table body (this logic remains the same)
            tableHtml += '<tbody>';
            group.querySelectorAll('tbody tr').forEach(row => {
                tableHtml += '<tr>';
                const subtaskNameCell = row.cells[0];
                tableHtml += `<td>${escapeHTML(subtaskNameCell.textContent)}</td>`;
                for (let i = 1; i < row.cells.length; i++) {
                    const cell = row.cells[i];
                    const select = cell.querySelector('.person-select');
                    if (select) {
                        const signatureValue = select.value.trim();
                        if (signatureValue === '') {
                            tableHtml += `<td class="summary-text-incomplete">Incomplete</td>`;
                        } else {
                            tableHtml += `<td class="summary-text-complete">${escapeHTML(select.options[select.selectedIndex].text)}</td>`;
                        }
                    } else {
                        tableHtml += `<td>${cell.innerHTML}</td>`;
                    }
                }
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            tasksHtml += tableHtml;
        }
    });

    // Handle simple single-column tasks (Bathroom, Hallway, etc.)
    document.querySelectorAll('.task-container').forEach(container => {
        const selects = container.querySelectorAll('.person-select:not([disabled])');
        const isTaskIncomplete = Array.from(selects).some(s => s.value.trim() === '');

        if (isTaskIncomplete) {
            incompleteTasksFound = true;
            const taskTitle = container.querySelector('.task-title').textContent;
            
            // Extract roommate names to build the header
            let signOffHeaderText = 'Sign-off';
            const teamInfoEl = container.querySelector('.team-info');
            if (teamInfoEl) {
                const teamText = teamInfoEl.textContent.replace('Assigned:', '').trim();
                if (!teamText.toLowerCase().includes('no members')) {
                     signOffHeaderText += ` (${escapeHTML(teamText)})`;
                }
            }
            
            let tableHtml = `<p><strong>${escapeHTML(taskTitle)}</strong></p><table class="summary-table"><thead><tr><th>Subtask</th><th>${signOffHeaderText}</th></tr></thead><tbody>`;
            
            container.querySelectorAll('tbody tr').forEach(row => {
                const subtaskNameCell = row.cells[0];
                const select = row.querySelector('.person-select');
                if (select && subtaskNameCell) {
                    const signatureValue = select.value.trim();
                    tableHtml += `<tr><td>${escapeHTML(subtaskNameCell.textContent)}</td>`;
                    if (signatureValue === '') {
                        tableHtml += `<td class="summary-text-incomplete">Incomplete</td></tr>`;
                    } else {
                        tableHtml += `<td class="summary-text-complete">${escapeHTML(select.options[select.selectedIndex].text)}</td>`;
                    }
                }
            });
            tableHtml += '</tbody></table>';
            tasksHtml += tableHtml;
        }
    });

    if (incompleteTasksFound) {
      finalHtml += tasksHtml;
      hasIncompleteItems = true;
    }

    // Logic for supplies remains the same
    const anySuppliesIncomplete = Array.from(document.querySelectorAll('#suppliesForm .supply-status-select:not([disabled])')).some(s => s.value.trim() === '');
    if (anySuppliesIncomplete) {
        hasIncompleteItems = true;
        let suppliesHtml = '<p><strong>Supplies</strong></p><table class="summary-table"><thead><tr><th>Item</th><th>Status</th></tr></thead><tbody>';
        document.querySelectorAll('#suppliesForm tbody tr').forEach(row => {
            const supplyName = row.cells[0].textContent;
            const select = row.querySelector('.supply-status-select');
            if (select) {
                const statusValue = select.value.trim();
                const statusText = select.options[select.selectedIndex].text;
                suppliesHtml += `<tr><td>${escapeHTML(supplyName)}</td>`;
                if (statusValue === '') {
                    suppliesHtml += `<td class="summary-text-incomplete">Incomplete</td></tr>`;
                } else {
                    suppliesHtml += `<td class="summary-text-complete">${escapeHTML(statusText)}</td></tr>`;
                }
            }
        });
        suppliesHtml += '</tbody></table>';
        finalHtml += suppliesHtml;
    }

    // --- Final Message & Display Modal ---
    if (!hasIncompleteItems) {
      summaryContent.innerHTML = '<p style="font-size: 1.2em; text-align: center;">🎉 Everything is complete! Great job, team!</p>';
    } else {
      summaryContent.innerHTML = finalHtml;
    }

    summaryModal.style.display = 'block';
  }
});