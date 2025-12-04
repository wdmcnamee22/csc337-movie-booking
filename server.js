const express = require("express");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({extended: true}));

app.use(session({
    secret: "337-project-secret",
    resave: false,
    saveUninitialized: false
}));

/* Users Module Routes */

/* Events/Movies Module Routes */

/* Bookings Module Routes */

app.get("/bookings", function (req, res) {
    res.send("Bookings page placeholder");
});

app.post("/bookings", function (req, res) {
    console.log("POST /bookings received");
    console.log("userId:", req.session.userId);
    console.log("eventId:", req.body.eventId);

    res.redirect("/bookings");
});

/* Review Module Routes */

const PORT = 3000;
app.listen(PORT, function () {
    console.log("Server running on port", PORT);
});
