let equipmentList = [];
let isEdit = false;

function openModal(edit = false, equipment = null) {
    const modal = document.getElementById('equipmentModal');
    modal.style.display = 'block';
    isEdit = edit;
    document.getElementById('modalTitle').innerText = edit ? 'Edit Equipment' : 'Add New Equipment';
    document.getElementById('submitBtn').innerText = edit ? 'Update' : 'Add';

    if (edit && equipment) {
        document.getElementById('equipmentID').value = equipment.id;
        document.getElementById('equipmentName').value = equipment.name;
        document.getElementById('equipmentClass').value = equipment.class;
        document.getElementById('equipmentQuantity').value = equipment.quantity;
    } else {
        document.getElementById('equipmentForm').reset();
        document.getElementById('equipmentID').value = '';
    }
}

function closeModal() {
    document.getElementById('equipmentModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('http://localhost:3001/equipments')
        .then(response => response.json())
        .then(data => {
            equipmentList = data;
            renderTable();
        })
        .catch(error => {
            console.error('Error fetching equipment:', error);
            alert('Failed to load equipment data.');
        });

    document.getElementById('addNewBtn').addEventListener('click', () => {
        openModal(false);
    });

    document.getElementById('closeModal').addEventListener('click', closeModal);

    window.onclick = function(event) {
        const modal = document.getElementById('equipmentModal');
        if (event.target === modal) {
            closeModal();
        }
    };

    const equipmentClassSelect = document.getElementById('equipmentClass');
    const newClassLabel = document.getElementById('newClassLabel');
    const newClassInput = document.getElementById('newClassInput');
    equipmentClassSelect.addEventListener('change', function() {
        if (this.value === 'new') {
            newClassLabel.style.display = 'inline';
            newClassInput.required = true;
        } else {
            newClassLabel.style.display = 'none';
            newClassInput.required = false;
            newClassInput.value = '';
        }
    });

    document.getElementById('equipmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('equipmentID').value;
        const name = document.getElementById('equipmentName').value;
        let eqClass = equipmentClassSelect.value;
        const quantity = parseInt(document.getElementById('equipmentQuantity').value, 10);
        if (eqClass === 'new') {
            eqClass = newClassInput.value.trim();
        }

        if (isEdit && id) {
            fetch(`http://localhost:3001/equipments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, class: eqClass, quantity })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to update equipment');
                return res.json();
            })
            .then(() => {
                reloadEquipmentList();
                closeModal();
            })
            .catch(err => {
                alert('Error updating equipment.');
                console.error(err);
            });
        } else {
            fetch('http://localhost:3001/equipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, class: eqClass, quantity })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to add equipment');
                return res.json();
            })
            .then(() => {
                reloadEquipmentList();
                closeModal();
            })
            .catch(err => {
                alert('Error adding equipment.');
                console.error(err);
            });
        }
    });
});

function renderTable() {
    const tableBody = document.querySelector('#equipmentTable tbody');
    tableBody.innerHTML = '';
    equipmentList.forEach(eq => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${eq.id}</td>
            <td>${eq.name}</td>
            <td>${eq.class}</td>
            <td>${eq.quantity}</td>
            <td>${eq.available_quantity}</td>
            <td>
                <button class="edit-btn" data-id="${eq.id}">Edit</button>
                <button class="remove-btn" data-id="${eq.id}">Remove</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const eqId = this.getAttribute('data-id');
            const equipment = equipmentList.find(eq => eq.id == eqId);
            openModal(true, equipment);
        });
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const eqId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to remove this equipment?')) {
                fetch(`http://localhost:3001/equipments/${eqId}`, {
                    method: 'DELETE'
                })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to remove equipment');
                    return res.json();
                })
                .then(() => {
                    reloadEquipmentList();
                })
                .catch(err => {
                    alert('Error removing equipment.');
                    console.error(err);
                });
            }
        });
    });
}

function reloadEquipmentList() {
    fetch('http://localhost:3001/equipments')
        .then(response => response.json())
        .then(data => {
            equipmentList = data;
            renderTable();
        })
        .catch(error => {
            console.error('Error fetching equipment:', error);
            alert('Failed to load equipment data.');
        });
}