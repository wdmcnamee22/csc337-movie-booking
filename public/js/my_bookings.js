document.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById("bookingsContainer");
    fetch("/api/my-bookings")
        .then(function (response) {
            return response.json();
        })
        .then(function (bookings) {
            if (!bookings || bookings.length === 0) {
                container.textContent = "You don't have any bookings yet.";
                return;
            }
            bookings.forEach(function (b) {
                var div = document.createElement("div");
                div.className = "booking";
                var title = b.movieTitle || ("Event: " + b.eventId);
                div.innerHTML =
                    "<h3>" + title + "</h3>" +
                    "<p>Theater: " + b.theater + "</p>" +
                    "<p>Time: " + b.time + "</p>" +
                    "<p>Phone: " + b.phone + "</p>" +
                    "<form method='POST' action='/cancel-booking'>" +
                    "  <input type='hidden' name='bookingId' value='" + b.id + "'>" +
                    "  <button type='submit'>Cancel</button>" +
                    "</form>";

                container.appendChild(div);
            });
        })
        .catch(function (err) {
            console.log(err);
            container.textContent = "Error loading bookings.";
        });
});