const tableBody = document.querySelector('#query tbody');
let equipments = [];

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function createNewRow() {
    const tr = document.createElement('tr');

    let optionsHTML = `<option value="">Select Item</option>`;
    equipments.forEach(eq => {
        optionsHTML += `<option value="${eq.name}" data-max="${eq.available_quantity}">
            ${eq.name} (Available: ${eq.available_quantity})
        </option>`;
    });

    tr.innerHTML = `
    <td>
        <select name="item[]">
            ${optionsHTML}
        </select>
    </td>
    <td><input type="number" name="quantity[]" min="1" value="1"></td>
    <td><input type="date" name="startDate[]"></td>
    <td><input type="date" name="endDate[]"></td>
    <td><input type="text" name="remark[]" placeholder="Remark"></td>
    <td>
      <button class="addItem">Add Item</button>
      <button class="removeItem">Remove Item</button>
    </td>
    `;

    const select = tr.querySelector('select[name="item[]"]');
    const quantityInput = tr.querySelector('input[name="quantity[]"]');

    select.addEventListener('change', function () {
        const max = this.selectedOptions[0]?.dataset.max;
        if (max) {
            quantityInput.max = max;
            if (quantityInput.value > max) {
                quantityInput.value = max;
            }
        }
    });

    quantityInput.addEventListener('input', function () {
        const max = quantityInput.max;
        if (this.value > max) {
            this.value = max;
        }
    });

    const startDateInput = tr.querySelector('input[name="startDate[]"]');
    const endDateInput = tr.querySelector('input[name="endDate[]"]');
    const today = getToday();

    startDateInput.min = today;
    endDateInput.min = today;

    startDateInput.addEventListener('change', function() {
        endDateInput.min = this.value;
        if (!endDateInput.value || new Date(endDateInput.value) < this.value) {
            endDateInput.value = this.value;
        }
    });

    return tr;
}

function clearValidationStyles(row) {
    row.querySelectorAll('input, select').forEach(input => {
        input.classList.remove('input-error');
    });
}

function markError(input) {
    input.classList.add('input-error');
}

document.addEventListener('DOMContentLoaded', () => {
    fetch("http://localhost:3001/equipments")
    .then(res => res.json())
    .then(data => {
        equipments = data;
        tableBody.appendChild(createNewRow());
    })
    .catch(err => {
        alert("Failed to load equipment list.");
        console.error(err);
    });

    tableBody.addEventListener('click', function (e) {
        if (e.target.classList.contains('addItem')) {
            e.preventDefault();
            tableBody.appendChild(createNewRow());
        }

        if (e.target.classList.contains('removeItem')) {
            e.preventDefault();
            const rows = tableBody.querySelectorAll('tr');
            if (rows.length > 1) {
                e.target.closest('tr').remove();
            } else {
                alert("Cannot be empty!");
            }
        }
    });
});

document.getElementById('submitBtn').addEventListener('click', function() {
    const rows = tableBody.querySelectorAll('tr');
    let isValid = true;
    let errorMessages = [];
    const today = getToday();

    rows.forEach((row, index) => {
        clearValidationStyles(row);
        const rowNumber = index + 1;
        
        const itemSelect = row.querySelector('select[name="item[]"]');
        if (!itemSelect.value) {
            isValid = false;
            errorMessages.push(`Row ${rowNumber}: Please select an item`);
            markError(itemSelect);
        }

        const quantityInput = row.querySelector('input[name="quantity[]"]');
        if (!quantityInput.value || quantityInput.value < 1) {
            isValid = false;
            errorMessages.push(`Row ${rowNumber}: Please enter a valid quantity`);
            markError(quantityInput);
        }

        const startDateInput = row.querySelector('input[name="startDate[]"]');
        if (!startDateInput.value) {
            isValid = false;
            errorMessages.push(`Row ${rowNumber}: Please select a start date`);
            markError(startDateInput);
        } else if (new Date(startDateInput.value) < new Date(today)) {
            isValid = false;
            errorMessages.push(`Row ${rowNumber}: Invalid start date`);
            markError(startDateInput);
        }

        const endDateInput = row.querySelector('input[name="endDate[]"]');
        if (!endDateInput.value) {
            isValid = false;
            errorMessages.push(`Row ${rowNumber}: Please select an end date`);
            markError(endDateInput);
        } else if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
            isValid = false;
            errorMessages.push(`Row ${rowNumber}: End date must be the same or after the start date`);
            markError(endDateInput);
        }

        //const remarkInput = row.querySelector('input[name="remark[]"]');
        //if (!remarkInput.value.trim()) {
        //    isValid = false;
        //    errorMessages.push(`Row ${rowNumber}: Please enter a remark`);
        //}
    });

    if (isValid) {
        const userName = localStorage.getItem("userName");
        const userEmail = localStorage.getItem("userEmail");

        const bookings = Array.from(rows).map(row => ({
            item: row.querySelector('select[name="item[]"]').value,
            quantity: row.querySelector('input[name="quantity[]"]').value,
            startDate: row.querySelector('input[name="startDate[]"]').value,
            endDate: row.querySelector('input[name="endDate[]"]').value,
            remark: row.querySelector('input[name="remark[]"]').value
        }));

        fetch("http://localhost:3001/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: userName,
                email: userEmail,
                bookings
            })
        })
        .then(response => response.json())
        .then(data => {
            window.location.href = "confirmation.html";
        })
        .catch(error => {
            alert("Submission failed!");
            console.error("Error:", error);
        });
    } else {
        alert("Invalid input: \n\n" + errorMessages.join('\n'));
    }
});

document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm("Are you sure you want to reset all entries?")) {
        tableBody.innerHTML = '';
        fetch("http://localhost:3001/equipments")
        .then(res => res.json())
        .then(data => {
            equipments = data;
            tableBody.append(createNewRow());
            alert("All entries have been reset.");
        });
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
    }
});

function submitFormDate() {
    console.log("Form data would be submitted here");
}