let selectedRating = 0;
let isAdmin = false;

document.addEventListener("DOMContentLoaded", async () => {
	checkAdmin();
	
    const params = new URLSearchParams(window.location.search);
    const eventName = params.get("name");

    const eventData = await loadEventByName(eventName);

    document.getElementById("event-title").textContent = eventData.name;
    renderEventReviews(eventData);
    setupStarRating();

    document.getElementById("submit-review").addEventListener("click", async () => {
        const text = document.getElementById("review-text").value.trim();

        if (!text || selectedRating === 0) {
            alert("Please select a rating and enter a review.");
            return;
        }

        const res = await fetch("/reviews/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                eventId: eventData.eventId,
                rating: selectedRating,
                text: text
            })
        });

        if (res.ok) {
            const updatedEvent = await loadEventByName(eventName);
            renderEventReviews(updatedEvent);
            document.getElementById("review-text").value = "";
            selectedRating = 0;
            updateStars(0);
        } else {
            alert("Error - failed to submit review.");
        }
    });
});

async function checkAdmin() {
    const res = await fetch("/auth/status");
    const data = await res.json();
	
    if (data.loggedIn && data.isAdmin) {
        isAdmin = true;
    }
}


// loads the event from the event JSON files, given the name of the event from the URL
async function loadEventByName(eventName) {
    try {
        const response = await fetch("/events/list");
        const eventFiles = await response.json();
        for (const file of eventFiles) {
            const eventRes = await fetch(`/events/data/${file}`);
            const eventJson = await eventRes.json();
            if (eventJson.name === eventName) return eventJson;
        }
        return null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// renders reviews
function renderEventReviews(eventData) {
    const container = document.getElementById("review-list");
    container.innerHTML = "";

    if (!eventData.reviews || eventData.reviews.length === 0) {
        container.innerHTML = "<p>No reviews yet.</p>";
        document.getElementById("average-rating").textContent = "No ratings yet.";
        return;
    }

    // Display preexisting reviews
    eventData.reviews.forEach(([text, rating, username]) => {
        const div = document.createElement("div");
        div.classList.add("review");
        div.innerHTML = `
            <strong>${username}</strong> - ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
            <p>${text}</p>
        `;
        
		
		// add remove button if admin
        if (isAdmin) {
            const btn = document.createElement("button");
            btn.textContent = "Remove Review";
            btn.classList.add("remove-review-btn");
            btn.addEventListener("click", () => {
                deleteReview(eventData.eventId, index);
            });
            div.appendChild(btn);
        }
		
		container.appendChild(div);
    });

    // Display average rating
    displayAverageRating(eventData.reviews);
}

// star ui logic
function setupStarRating() {
    const stars = document.querySelectorAll("#star-rating .star");

    stars.forEach(star => {
        star.addEventListener("click", () => {
            selectedRating = parseInt(star.dataset.value);
            updateStars(selectedRating);
        });
        star.addEventListener("mouseover", () => {
            updateStars(parseInt(star.dataset.value));
        });
        star.addEventListener("mouseout", () => {
            updateStars(selectedRating);
        });
    });
}

// updates the stars, so their appearance reflects the user's selection
function updateStars(rating) {
    const stars = document.querySelectorAll("#star-rating .star");
    stars.forEach(star => {
        if (parseInt(star.dataset.value) <= rating) {
            star.classList.add("selected");
        } else {
            star.classList.remove("selected");
        }
    });
}

// Calculate and display average rating
function displayAverageRating(reviews) {
    const avgContainer = document.getElementById("average-rating");
    if (!reviews || reviews.length === 0) {
        avgContainer.textContent = "No ratings yet.";
        return;
    }

    const total = reviews.reduce((sum, [, rating]) => sum + rating, 0);
    const avg = total / reviews.length;
    const fullStars = Math.floor(avg);
    const halfStar = avg - fullStars >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;

    const stars = "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);
    avgContainer.textContent = `Average Rating: ${stars} (${avg.toFixed(1)}/5)`;
}

async function deleteReview(eventId, reviewIndex) {

    const res = await fetch("/reviews/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, reviewIndex })
    });

    if (res.ok) {
        const params = new URLSearchParams(window.location.search);
        const eventName = params.get("name");
        const updatedEvent = await loadEventByName(eventName);
        renderEventReviews(updatedEvent);
    } else {
        alert("Failed to delete review.");
    }
}
