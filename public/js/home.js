document.addEventListener("DOMContentLoaded", () => {
    checkAdmin();
    loadEvents();
});

let isAdmin = false;

async function checkAdmin() {
    const res = await fetch("/auth/status");
    const data = await res.json();

    if (data.loggedIn && data.isAdmin) {
        isAdmin = true;
        addAdminButton();
    }
}

function addAdminButton() {
    const userInfo = document.querySelector(".user-info");

    const adminBtn = document.createElement("a");
    adminBtn.textContent = "Add Event";
    adminBtn.href = "/admin/new_event";   // page you will create later
    adminBtn.className = "btn";

    userInfo.setAttribute("style", "width: 25%");
    userInfo.prepend(adminBtn);
}

async function loadEvents() {
    try {
        // Step 1: Fetch list of JSON files from backend
        const response = await fetch("/events/list");
        const eventFiles = await response.json();

        let events = [];

        // Step 2: Load all event JSON files
        for (const file of eventFiles) {
            const eventRes = await fetch(`/events/data/${file}`);
            const eventJson = await eventRes.json();
            events.push(eventJson);
        }

        // Step 3: Group events by date
        const grouped = groupByDate(events);

        // Step 4: Render galleries
        renderGalleries(grouped);

    } catch (err) {
        console.error("Error loading events:", err);
    }
}

function groupByDate(events) {
    const groups = {};

    events.forEach(ev => {
        if (!groups[ev.date]) {
            groups[ev.date] = [];
        }
        groups[ev.date].push(ev);
    });

    return groups;
}

function renderGalleries(groupedEvents) {
    const body = document.body;

    // Remove placeholder galleries
    const placeholders = document.querySelectorAll(".gallery-block");
    placeholders.forEach(p => p.remove());

    const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
        const events = groupedEvents[date];

        // Create gallery block
        const block = document.createElement("div");
        block.className = "gallery-block";

        // create a decent looking date
        const title = document.createElement("div");
        title.className = "gallery-title";

        // Parse the date string
        const dateObj = new Date(date);

        // Options for formatting
        const options = { year: 'numeric', month: 'long', day: 'numeric' };

        // Format date like "December 12, 2025"
        let formattedDate = dateObj.toLocaleDateString('en-US', options);

        // Add ordinal suffix to day (e.g., "12th")
        const day = dateObj.getDate() + 1;
        const suffix = day % 10 === 1 && day !== 11 ? "st" :
                    day % 10 === 2 && day !== 12 ? "nd" :
                    day % 10 === 3 && day !== 13 ? "rd" : "th";

        formattedDate = formattedDate.replace(/\d+/, day + suffix);

        title.textContent = formattedDate;
        block.appendChild(title);

        const gallery = document.createElement("div");
        gallery.className = "gallery";

        // Create cards for each event
        events.forEach(ev => {
            const card = document.createElement("div");
            card.className = "event-card";

            let avgRating = 0;

            if (ev.reviews && ev.reviews.length > 0) {
                const total = ev.reviews.reduce((sum, r) => sum + Number(r[1]), 0);
                avgRating = (total / ev.reviews.length).toFixed(1);
            } else {
                avgRating = "No reviews";
            }

            card.innerHTML = `
                <img src="${ev.image}" onerror="this.src='/images/placeholder.png'"/>
                <div class="event-name">${ev.name}</div>
                <div class="event-description">${ev.description}</div>
                <div class="rating">Rating: ${avgRating}⭐</div>
                <div class="btn-row">
                  <button 
                    class="btn book-btn"
                    data-name="${ev.name}"
                    data-description="${ev.description}"
                    data-image="${ev.image}">Book</button>
                  <button class="btn">Review</button>
                  <button class="delete-event-btn admin-only">Delete Event</button>
                </div>
            `;

            if (isAdmin) {
                const deleteBtns = card.querySelectorAll(".admin-only");
                deleteBtns.forEach(btn => btn.style.display = "inline-block");
            }

            if (isAdmin) {
                const deleteBtn = card.querySelector(".delete-event-btn");
                deleteBtn.addEventListener("click", async () => {
                    if (!confirm(`Are you sure you want to delete "${ev.name}"?`)) return;

                    try {
                        const res = await fetch(`/events/${ev.eventId}`, { method: "DELETE" });
                        if (res.ok) {
                            alert(`"${ev.name}" has been deleted.`);
                            card.remove(); // remove card from DOM

                            const gallery = block.querySelector(".gallery");
                            if (gallery.children.length === 0) {
                                // Remove the entire gallery block
                                block.remove();
                            }
                        } else {
                            const msg = await res.text();
                            alert("Failed to delete event: " + msg);
                        }
                    } catch (err) {
                        console.error(err);
                        alert("Error deleting event.");
                    }
                });
            }

            gallery.appendChild(card);
        });

        block.appendChild(gallery);
        body.appendChild(block);
    });
    // Book button click listeners
    const bookButtons = document.querySelectorAll(".book-btn");
    bookButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            const name = this.dataset.name;
            const desc = this.dataset.description;
            const image = this.dataset.image;
    
            const params = new URLSearchParams({
                name: name,
                description: desc,
                image: image
            });
    
            window.location.href = "/bookings?" + params.toString();
        });
    });
}
