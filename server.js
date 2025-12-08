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
app.use(express.urlencoded({ extended: true }));

// since we are using json, we need to be able to recieve it
// this is done here
app.use(express.json());

// **************************************
// since we will have html pages and javascript files we can use public here
// if needed 
app.use(express.static("public"));
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
app.get("/events/list", (req, res) => {
    const eventDir = path.join(__dirname, "eventData");

    fs.readdir(eventDir, (err, files) => {
        if (err) return res.status(500).json([]);
        const jsonFiles = files.filter(f => f.endsWith(".json"));
        res.json(jsonFiles);
    });
});

app.get("/events/data/:file", (req, res) => {
    const filePath = path.join(__dirname, "eventData", req.params.file);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Event not found" });
    }

    const eventData = JSON.parse(fs.readFileSync(filePath));
    res.json(eventData);
});

app.get("/admin/new_event", (req, res) => {

    if (!req.session.userId || req.session.isAdmin !== true) {
        return res.status(403).send("Access denied");
    }

    res.sendFile(path.join(__dirname, "view", "create_event.html"));
});

app.post("/create-event", (req, res) => {
    const eventData = req.body;

    // Auto-generate eventId
    const eventId = "event" + Date.now();
    eventData.eventId = eventId;

    const filePath = path.join(__dirname, "eventData", `${eventId}.json`);

    fs.writeFile(filePath, JSON.stringify(eventData, null, 2), (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to save event." });
        }
        res.status(200).json({ message: "Event created", eventId });
    });
});

app.delete("/events/:eventId", (req, res) => {
    // Check admin
    if (!req.session.isAdmin) {
        return res.status(403).send("Access denied");
    }

    const eventId = req.params.eventId;
    const eventDir = path.join(__dirname, "eventData");

    // Look for the file with this eventId
    fs.readdir(eventDir, (err, files) => {
        if (err) return res.status(500).send("Server error");

        const fileToDelete = files.find(f => {
            if (!f.endsWith(".json")) return false;
            const data = JSON.parse(fs.readFileSync(path.join(eventDir, f)));
            return data.eventId === eventId;
        });

        if (!fileToDelete) {
            return res.status(404).send("Event not found");
        }

        // Delete the file
        fs.unlink(path.join(eventDir, fileToDelete), err => {
            if (err) return res.status(500).send("Failed to delete event");
            res.send("Event deleted successfully");
        });
    });
});

app.get("/my_bookings", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "view", "my_bookings.html"));
});

// start the server up here
app.listen(3000, () =>
    console.log("Server running on http://localhost:3000")
);
