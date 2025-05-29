document.addEventListener('DOMContentLoaded', function () {
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
              'Member assignments saved successfully!';
            taskAssignmentSuccessMessage.style.display = 'block';
          }
          if (taskAssignmentErrorMessage)
            taskAssignmentErrorMessage.style.display = 'none';

          setTimeout(() => {
            if (taskAssignmentSuccessMessage)
              taskAssignmentSuccessMessage.style.display = 'none';
          }, 3000);

          setTimeout(() => {
            window.location.reload();
          }, 1000);
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
      const taskId = this.getAttribute('data-task-id');
      const signatures = {};
      const selects = this.querySelectorAll('.person-select');
      selects.forEach((select) => {
        const subtaskIdMatch = select.name.match(/\d+/);
        if (subtaskIdMatch) {
            const subtaskId = subtaskIdMatch[0];
            signatures[subtaskId] = select.value;
        }
      });
      updateSubtaskSignatures(taskId, signatures);
    });
  });

  function updateSubtaskSignatures(taskId, signatures) {
    const formData = new FormData();
    formData.append('action', 'updateSignatures');
    formData.append('taskId', taskId);
    formData.append('signatures', JSON.stringify(signatures));

    fetch('api_tasks.php', {
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
            `.subtask-success-message-${taskId}`
          );
          if (successMessage) {
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
  // Supplies Form Handling
  // ==========================================
  const suppliesForm = document.getElementById('suppliesForm');
  const suppliesSuccessMessage = document.getElementById('suppliesSuccessMessage');


  if (suppliesForm) {
    suppliesForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const supplies = [];
      const selects = document.querySelectorAll(
        '#suppliesForm select[name^="supplies["]' // More specific selector
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

    fetch('api_supplies.php', {
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
          if (suppliesSuccessMessage) { // Check if element exists
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

  function addLateTaskToUI(lateTask) {
    if (!lateTasksList) return; // Guard clause
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', lateTask.id);
    listItem.innerHTML = `<strong>${escapeHTML(
      lateTask.name
    )}</strong> (${escapeHTML(lateTask.day)}): ${escapeHTML(lateTask.task)} `;
    lateTasksList.appendChild(listItem);
    const noItemsMessage = document.getElementById('no-late-tasks');
    if (noItemsMessage) {
      noItemsMessage.remove();
    }
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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

      fetch('api_latetask.php', {
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
        : 'message error';
      setTimeout(() => {
        messageElement.style.display = 'none';
      }, 3000);
    }
  }

  function resetAllLateTasks() {
    const formData = new FormData();
    formData.append('action', 'resetAllLateTasks');

    fetch('api_reset.php', {
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
          if (lateTasksList) { // Check if lateTasksList exists
            while (lateTasksList.firstChild) {
              lateTasksList.removeChild(lateTasksList.firstChild);
            }
            const noItemsMessage = document.createElement('li');
            noItemsMessage.id = 'no-late-tasks';
            noItemsMessage.textContent = 'No late tasks recorded.';
            lateTasksList.appendChild(noItemsMessage);
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
    if (messageElement) { // Check if element exists
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
    if (!wishlistItemsList) return; // Guard clause
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', item.id);
    listItem.textContent = escapeHTML(item.item) + ' ';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-wishlist-item';
    deleteButton.setAttribute('data-id', item.id);

    deleteButton.addEventListener('click', function () {
      handleDeleteWishlistItem(item.id);
    });

    listItem.appendChild(deleteButton);
    wishlistItemsList.appendChild(listItem);

    const noItemsMessage = document.getElementById('no-wishlist-items');
    if (noItemsMessage) {
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

      fetch('api_supplies.php', {
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
            if(wishlistItemNameInput) wishlistItemNameInput.value = '';
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

    fetch('api_supplies.php', {
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
          if (wishlistItemsList) { // Check if element exists
            const itemElement = wishlistItemsList.querySelector(
              `li[data-id="${itemId}"]`
            );
            if (itemElement) {
              itemElement.remove();
            }
            if (wishlistItemsList.children.length === 0) {
              const noItemsMessage = document.createElement('li');
              noItemsMessage.id = 'no-wishlist-items';
              noItemsMessage.textContent = 'No items in the wishlist yet.';
              wishlistItemsList.appendChild(noItemsMessage);
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

  document.querySelectorAll('.delete-wishlist-item').forEach((button) => {
    button.addEventListener('click', function () {
      const itemId = this.getAttribute('data-id');
      handleDeleteWishlistItem(itemId);
    });
  });

  // ==========================================
  // Reset All Signatures Button Handling
  // ==========================================
  const resetSignaturesButton = document.getElementById(
    'resetAllSignaturesButton'
  );
  const resetSignaturesSuccessMessage = document.getElementById( // Added for consistency
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

    fetch('api_reset.php', {
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
          if (resetSignaturesSuccessMessage) { // Check if element exists
            resetSignaturesSuccessMessage.style.display = 'block';
            setTimeout(() => {
              resetSignaturesSuccessMessage.style.display = 'none';
            }, 3000);
          }
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
  const resetSuppliesSuccessMessage = document.getElementById( // Added for consistency
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

    fetch('api_reset.php', {
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
          if (resetSuppliesSuccessMessage) { // Check if element exists
            resetSuppliesSuccessMessage.style.display = 'block';
            setTimeout(() => {
              resetSuppliesSuccessMessage.style.display = 'none';
            }, 3000);
          }
          const suppliesSelects = document.querySelectorAll(
            '#suppliesForm select[name^="supplies["]'
          );
          suppliesSelects.forEach((select) => {
            select.value = ' ';
          });
        } else {
          alert('Error: ' + (data.message || 'An unknown error occurred'));
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred while resetting supplies.'); // Changed message for clarity
      });
  }
});