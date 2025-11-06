document.addEventListener('DOMContentLoaded', async () => {
    fetch('http://localhost:3001/bookings')
    .then(response => response.json())
    .then(data => {
        const tableBody = document.querySelector('#bookingTable tbody');
        data.forEach(entry => {
            const row = document.createElement('tr');
            const statusButton = entry.isReturned
                ? 'Returned'
                : `<button class="verifyBtn" data-id="${entry.id}">Verify Return</button>`;
            row.innerHTML = `
                <td>${entry.name}</td>
                <td>${entry.email}</td>
                <td>${entry.item}</td>
                <td>${entry.quantity}</td>
                <td>${entry.startDate}</td>
                <td>${entry.endDate}</td>
                <td>${entry.remark || ''}</td>
                <td>${statusButton}</td>
                `;
            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error fetching bookings:', error);
        alert("Failed to load booking data.");
    });
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm("Do you want to delete all bookings records?")) {
        fetch('http://localhost:3001/bookings', {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || "All bookings cleared.");
            location.reload();
        })
        .catch(error => {
            console.error('Error deleting bookings: ', error);
            alert("Failed to delete bookings.");
        });
    }
});

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('verifyBtn')) {
        const bookingId = e.target.dataset.id;

        fetch(`http://localhost:3001/bookings/${bookingId}/return`, {
            method: 'PUT'
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message || "Marked as returned.");
            location.reload();
        })
        .catch(err => {
            alert("Falied to verify return.");
            console.error(err);
        });
    }
});

document.getElementById('calendarBtn').addEventListener('click', () => {
    window.open('calendar.html', '_blank');
});

document.getElementById('inventoryList').addEventListener('click', () => {
    window.open('inventory.html', '_blank');
});

function openModal(type) {
    const modal = document.getElementById('equipmentModal');
    document.getElementById('equipmentForm').reset();
    document.getElementById('equipmentID').value = '';
    isUpdate = (type === 'update');

    document.getElementById('modalTitle').innerText = isUpdate ? "Update Equipment" : "Add Equipment";
    document.getElementById('submitBtn').innerText = isUpdate ? "Update" : "Add";
    
    document.getElementById('addFields').style.display = isUpdate ? 'none' : 'block';
    document.getElementById('updateFields').style.display = isUpdate ? 'block' : 'none';
    
    modal.style.display = 'block';

    if (isUpdate) {
        populateUpdateDropdown();
    }
}