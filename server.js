var express = require("express");
var fs = require("fs");
var session = require("express-session");
var path = require("path");
var app = express();
const setupBookings = require("./bookings");

// ------------------------------------
// Ensure userData directory + users.json exist
// ------------------------------------
const USER_DIR = path.join(__dirname, "userData");
if (!fs.existsSync(USER_DIR)) fs.mkdirSync(USER_DIR);

const USERS_FILE = path.join(USER_DIR, "users.json");

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]");
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "view", "index.html"));
});

// express reads the data from req.body
app.use(
  express.urlencoded({
    extended: true
  })
);


// since we are using json, we need to be able to recieve it
// this is done here
app.use(
  express.json()
);

// **************************************
// since we will have html pages and javascript files we can use public here
// if needed 
app.use(
  express.static("public")
);
app.use("/public", express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: "super-secret-key", // used for the cookies for login
        resave: false,  // only save session if something was changed
        saveUninitialized: false, // done save an amepty login session
    })
);

// get and read the users from the json file
function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch {
        return []; // if empty return emtpy list
    }
}

//save the users in json
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// make sure the user is logged in before they can view certain pages
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/"); // send them back to login page
    }
    next();
}

setupBookings(app, requireLogin);

// here is where we register a user
app.post("/register", (req, res) => {
    var { username, password } = req.body;
    var users = loadUsers();

    // check if the username already exists
    if (users.find((u) => u.username === username)) {
        return res.send("Username already exists.");
    }

    // this line makes a user id
    var newUser = { id: Date.now(), username, password, isAdmin: false };

    users.push(newUser);
    saveUsers(users);

    // log the user in right after making an account
    req.session.userId = newUser.id;
    req.session.isAdmin = newUser.isAdmin;
    return res.send("OK");
});

// login work here for existing users
app.post("/login", (req, res) => {
    var { username, password } = req.body;
    var users = loadUsers();

    // find our user with the matching username and password
    // obviously both need to match
    var user = users.find(
        (u) => u.username === username && u.password === password
    );

    if (!user) return res.send("Invalid username or password.");

    // save their id in the session so that they stay logged in
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin;
    return res.send("OK");
});

app.get("/auth/status", (req, res) => {
    if (!req.session.userId) {
        return res.json({ loggedIn: false });
    }

    const users = loadUsers();
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
        req.session.destroy();
        return res.json({ loggedIn: false });
    }

    res.json({
        loggedIn: true,
        username: user.username,
        isAdmin: user.isAdmin === true
    });
});

// IMPORTANT!!!!!!!!!!!!!!!!!!!!!!!!!!!
// AFTER YOU LOGIN YOU GET DIRECTED TO HOME

// home page, only logged in users can access this
app.get("/home", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "view", "home.html"));
});

// logs the user aout and ends the sessions
// do the logout stuff here
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// Events Module
const EVENTS_FILE = path.join(__dirname, "eventData", "events.json");

function loadEvents() {
    return JSON.parse(fs.readFileSync(EVENTS_FILE));
}

function saveEvents(events) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

app.get("/events/all", (req, res) => {
    const events = loadEvents();
    res.json(events);
})

app.get("/admin/new_event", (req, res) => {

    if (!req.session.userId || req.session.isAdmin !== true) {
        return res.status(403).send("Access denied");
    }

    res.sendFile(path.join(__dirname, "view", "create_event.html"));
});

app.post("/create-event", (req, res) => {
    const events = loadEvents();

    const newEvent = req.body;
    newEvent.eventId = "event" + Date.now();

    events.push(newEvent);
    saveEvents(events);

    res.json({ message: "Event created", eventId: newEvent.eventId });
});

app.delete("/events/:eventId", (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).send("Access denied");
    }

    const events = loadEvents();

    const updated = events.filter(e => e.eventId !== req.params.eventId);

    if (updated.length === events.length) {
        return res.status(404).send("Event not found");
    }

    saveEvents(updated);

    res.send("Event deleted successfully");
});

app.get("/reviews", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "view", "reviews.html"));
});

app.post("/reviews/add", requireLogin, (req, res) => {
    const { eventId, rating, text } = req.body;
    if (!eventId || !rating || !text) return res.status(400).send("Invalid request");

    // Load all events from events.json
    const events = loadEvents();
    const event = events.find(e => e.eventId === eventId);
    if (!event) return res.status(404).send("Event not found");

    // Get username from session
    const users = loadUsers();
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.status(401).send("User not found");

    // Append new review
    if (!event.reviews) event.reviews = [];
    event.reviews.push([text, Number(rating), user.username]);

    // Save updated events array
    saveEvents(events);

    res.sendStatus(200);
});

app.post("/reviews/delete", (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).send("Access denied");
    }

    const { eventId, reviewIndex } = req.body;

    let events = loadEvents();
    const event = events.find(e => e.eventId === eventId);

    if (!event) return res.status(404).send("Event not found");

    if (!event.reviews || !event.reviews[reviewIndex]) {
        return res.status(400).send("Invalid review index");
    }

    event.reviews.splice(reviewIndex, 1);

    saveEvents(events);

    res.send("Review deleted");
});

app.get("/my_bookings", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "view", "my_bookings.html"));
});

// start the server up here
app.listen(3000, () =>
    console.log("Server running on http://localhost:3000")
);
