const fs = require("fs");
const path = require("path");

module.exports = function (app, requireLogin) {
    // ------------------------------------
    // Ensure bookingData directory + bookings.json exist
    // ------------------------------------
    const BOOKING_DIR = path.join(__dirname, "bookingData");
    if (!fs.existsSync(BOOKING_DIR)) {
        fs.mkdirSync(BOOKING_DIR);
    }
    
    const BOOKINGS_FILE = path.join(BOOKING_DIR, "bookings.json");
    if (!fs.existsSync(BOOKINGS_FILE)) {
        fs.writeFileSync(BOOKINGS_FILE, "[]");
    }

    function loadBookings() {
        try {
            return JSON.parse(fs.readFileSync(BOOKINGS_FILE));
        } catch (err) {
            console.error("Error reading bookings.json:", err);
            return [];
        }
    }

    function saveBookings(bookings) {
        try {
            fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
        } catch (err) {
            console.error("Error writing bookings.json:", err);
        }
    }

    // ----------------------
    // Bookings pages
    // ----------------------
    app.get("/bookings", requireLogin, function (req, res) {
        // booking form page
        res.sendFile(path.join(__dirname, "view", "bookings.html"));
    });

    app.get("/my-bookings", requireLogin, function (req, res) {
        // list of this user's bookings
        res.sendFile(path.join(__dirname, "view", "my_bookings.html"));
    });

    // ----------------------
    // Create a booking
    // ----------------------
    app.post("/bookings", requireLogin, function (req, res) {
        const eventId = req.body.eventId;
        const name = req.body.name;
        const phone = req.body.phone;
        const theater = req.body.theater;
        const time = req.body.time;
        const movieTitle = req.body.movieTitle || "";

        if (!eventId || !name || !phone || !theater || !time) {
            return res.status(400).send("Missing booking data.");
        }

        const bookings = loadBookings();

        const newBooking = {
            id: Date.now().toString(),
            userId: req.session.userId,
            eventId: eventId,
            movieTitle: movieTitle,
            name: name,
            phone: phone,
            theater: theater,
            time: time
        };

        bookings.push(newBooking);
        saveBookings(bookings);

        res.redirect("/my-bookings");
    });

    // ----------------------
    // JSON list of current user's bookings
    // ----------------------
    app.get("/api/my-bookings", requireLogin, function (req, res) {
        const bookings = loadBookings();
        const userBookings = bookings.filter(function (b) {
            return b.userId === req.session.userId;
        });
        res.json(userBookings);
    });

    // ----------------------
    // Cancel booking
    // ----------------------
    app.post("/cancel-booking", requireLogin, function (req, res) {
        const bookingId = req.body.bookingId;
        const bookings = loadBookings();

        const updated = bookings.filter(function (b) {
            // only allow deleting your own booking
            return !(b.id === bookingId && b.userId === req.session.userId);
        });

        saveBookings(updated);
        res.redirect("/my-bookings");
    });
};