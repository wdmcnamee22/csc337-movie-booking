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
    
        // Admins can cancel ANY booking
        const isAdmin = req.session.isAdmin === true;
    
        let updated;
    
        if (isAdmin) {
            // Remove the booking regardless of who created it
            updated = bookings.filter(function (b) {
                return b.id !== bookingId;
            });
        } else {
            // Normal users: ONLY remove if the booking belongs to them
            updated = bookings.filter(function (b) {
                return !(b.id === bookingId && b.userId === req.session.userId);
            });
        }
    
        saveBookings(updated);
        res.redirect("/my-bookings");
    });    

    // ----------------------
    // Admin: get ALL bookings
    // ----------------------
    app.get("/api/all-bookings", requireLogin, function (req, res) {
        if (!req.session.isAdmin) {
            // Only admins can see all bookings
            return res.status(403).json({ error: "Not authorized" });
        }

        const bookings = loadBookings();
        res.json(bookings);
    });

    // ----------------------
    // Admin: update a booking
    // ----------------------
    app.post("/update-booking", requireLogin, function (req, res) {
        // Only admins can edit bookings
        if (!req.session.isAdmin) {
            return res.status(403).send("Not authorized.");
        }

        const bookingId = req.body.bookingId;
        const name = req.body.name;
        const phone = req.body.phone;
        const theater = req.body.theater;
        const time = req.body.time;

        let bookings = loadBookings();
        let found = false;

        bookings = bookings.map(function (b) {
            if (b.id === bookingId) {
                found = true;
                // Only update fields that were sent
                if (name !== undefined) b.name = name;
                if (phone !== undefined) b.phone = phone;
                if (theater !== undefined) b.theater = theater;
                if (time !== undefined) b.time = time;
            }
            return b;
        });

        if (!found) {
            return res.status(404).send("Booking not found.");
        }

        saveBookings(bookings);
        res.redirect("/my-bookings");
    });
};
