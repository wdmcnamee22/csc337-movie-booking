document.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById("bookingsContainer");

    // Helper to map theater codes to readable names
    function formatTheater(theaterCode) {
        if (theaterCode === "downtown") {
            return "Tannehill Theater";
        } else if (theaterCode === "uptown") {
            return "Fitzpatrick Cinema";
        } else if (theaterCode === "campus") {
            return "Cutler Theaters";
        }
        return theaterCode || "N/A";
    }

    // First, check if this user is an admin
    fetch("/auth/status")
        .then(function (res) {
            return res.json();
        })
        .then(function (status) {
            if (!status.loggedIn) {
                container.textContent = "You must be logged in to view bookings.";
                return;
            }

            var isAdmin = status.isAdmin === true;

            // Admins see ALL bookings, normal users see only their own
            var url = isAdmin ? "/api/all-bookings" : "/api/my-bookings";

            return fetch(url).then(function (res) {
                return res.json();
            }).then(function (bookings) {
                if (!bookings || bookings.length === 0) {
                    container.textContent = "There are no bookings yet.";
                    return;
                }

                bookings.forEach(function (b) {
                    var div = document.createElement("div");
                    div.className = "booking";

                    var title = b.movieTitle || ("Event: " + b.eventId);
                    var theaterLabel = formatTheater(b.theater);

                    // Base info visible for everyone
                    var infoHtml =
                        "<h3>" + title + "</h3>" +
                        "<p><strong>Name:</strong> " + (b.name || "N/A") + "</p>" +
                        "<p><strong>Theater:</strong> " + theaterLabel + "</p>" +
                        "<p><strong>Time:</strong> " + (b.time || "N/A") + "</p>" +
                        "<p><strong>Phone:</strong> " + (b.phone || "N/A") + "</p>";

                    // Cancel form
                    var cancelForm =
                        "<form method='POST' action='/cancel-booking'>" +
                        "  <input type='hidden' name='bookingId' value='" + b.id + "'>" +
                        "  <button type='submit'>Cancel</button>" +
                        "</form>";

                    // If admin, show an edit form as well
                    if (isAdmin) {
                        var editForm =
                            "<form method='POST' action='/update-booking' style='margin-top:8px;'>" +
                            "  <input type='hidden' name='bookingId' value='" + b.id + "'>" +
                            "  <label>Name: <input type='text' name='name' value='" + (b.name || "") + "'></label><br>" +
                            "  <label>Phone: <input type='text' name='phone' value='" + (b.phone || "") + "'></label><br>" +
                            "  <label>Theater: " +
                            "    <select name='theater'>" +
                            "      <option value='downtown'" + (b.theater === "downtown" ? " selected" : "") + ">Tannehill Theater</option>" +
                            "      <option value='uptown'" + (b.theater === "uptown" ? " selected" : "") + ">Fitzpatrick Cinema</option>" +
                            "      <option value='campus'" + (b.theater === "campus" ? " selected" : "") + ">Cutler Theaters</option>" +
                            "    </select>" +
                            "  </label><br>" +
                            "  <label>Time: " +
                            "    <select name='time'>" +
                            "      <option value='12:00 PM'" + (b.time === "12:00 PM" ? " selected" : "") + ">12:00 PM</option>" +
                            "      <option value='3:00 PM'" + (b.time === "3:00 PM" ? " selected" : "") + ">3:00 PM</option>" +
                            "      <option value='6:00 PM'" + (b.time === "6:00 PM" ? " selected" : "") + ">6:00 PM</option>" +
                            "      <option value='9:00 PM'" + (b.time === "9:00 PM" ? " selected" : "") + ">9:00 PM</option>" +
                            "    </select>" +
                            "  </label><br>" +
                            "  <button type='submit'>Save Changes (Admin)</button>" +
                            "</form>";

                        div.innerHTML = infoHtml + cancelForm + editForm;
                    } else {
                        // Normal user: just show info + cancel
                        div.innerHTML = infoHtml + cancelForm;
                    }

                    container.appendChild(div);
                });
            });
        })
        .catch(function (err) {
            console.log(err);
            container.textContent = "Error loading bookings.";
        });
});
