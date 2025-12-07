document.addEventListener("DOMContentLoaded", () => {
    loadEvents();
});

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

    for (const date in groupedEvents) {
        const events = groupedEvents[date];

        // Create gallery block
        const block = document.createElement("div");
        block.className = "gallery-block";

        const title = document.createElement("div");
        title.className = "gallery-title";
        title.textContent = date;
        block.appendChild(title);

        const gallery = document.createElement("div");
        gallery.className = "gallery";

        // Create cards for each event
        events.forEach(ev => {
            const card = document.createElement("div");
            card.className = "event-card";

            card.innerHTML = `
                <img src="${ev.image}" />
                <div class="event-name">${ev.name}</div>
                <div class="event-description">${ev.description}</div>
                <div class="rating">Rating: ${ev.rating}⭐</div>
                <div class="btn-row">
                  <button 
                    class="btn book-btn"
                    data-name="${ev.name}"
                    data-description="${ev.description}"
                    data-image="${ev.image}">Book</button>
                  <button class="btn">Review</button>
                </div>
            `;

            gallery.appendChild(card);
        });

        block.appendChild(gallery);
        body.appendChild(block);
    }
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
