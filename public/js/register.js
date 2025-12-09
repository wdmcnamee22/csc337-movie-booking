document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const errorBox = document.getElementById("registerError");
    errorBox.textContent = "";
    errorBox.style.display = "none";

    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    try {
        const res = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const message = await res.text();

        if (message === "OK") {
            window.location.href = "/home";
        } else {
            errorBox.textContent = message;
            errorBox.style.display = "block";
        }
    } catch (err) {
        console.error(err);
    }
});