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

/* Review Module Routes */

const PORT = 3000;
app.listen(PORT, function () {
    console.log("Server running on port", PORT);
});
