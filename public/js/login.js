document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const errorBox = document.getElementById("loginError");
    errorBox.textContent = "";
    errorBox.style.display = "none";

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("/login", {
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
