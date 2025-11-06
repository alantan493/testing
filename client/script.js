document.addEventListener("DOMContentLoaded", () => {
    fetch("http://localhost:3001/users")
    .then(response => response.json())
    .then(data => {
        const dropdown = document.getElementById("userDropdown");
        data.forEach(user => {
            const option = document.createElement("option");
            option.value = user.email;
            option.textContent = user.name;
            option.setAttribute("data-role", user.role)
            dropdown.appendChild(option);
        });

        dropdown.addEventListener("change", function () {
            const selectedEmail = this.value;
            const selectedUser = data.find(user => user.email === selectedEmail);
            if (selectedUser) {
                document.getElementById("Email").value = selectedUser.email;
            } else {
                document.getElementById("Email").value = "";
            }
        });
    })
    .catch(error => {
        console.error("Error loading user list:", error);
    });
});

function enter() {
    const dropdown = document.getElementById("userDropdown");
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const selectedName = dropdown.options[dropdown.selectedIndex].text;
    const selectedEmail = document.getElementById("Email").value;
    const selectedRole = selectedOption.getAttribute("data-role");

    if (selectedName && selectedEmail && selectedRole) {
        localStorage.setItem("userName", selectedName);
        localStorage.setItem("userEmail", selectedEmail);
        localStorage.setItem("userRole", selectedRole);

        if (selectedRole === "admin") {
            document.getElementById("adminPopup").classList.remove("hidden");
        } else {
            window.location.href = "query.html";
        }
    } else {
        alert("Please fill in both fields before proceeding.")
    }
}

document.getElementById("goDashboard").addEventListener("click", () => {
    window.location.href = "view.html";
});

document.getElementById("goLoan").addEventListener("click", () => {
    window.location.href = "query.html";
});