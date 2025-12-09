let selectedRating = 0;
let isAdmin = false;

document.addEventListener("DOMContentLoaded", async () => {
    await checkAdmin();

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");

    if (!eventId) {
        document.getElementById("review-list").innerHTML = "No event specified.";
        return;
    }

    const eventData = await loadEventById(eventId);

    if (!eventData) {
        document.getElementById("review-list").innerHTML = "Event not found.";
        return;
    }

    document.getElementById("event-title").textContent = eventData.name;

    renderEventReviews(eventData);
    setupStarRating();
	
	// submit review functionality
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
            const updatedEvent = await loadEventById(eventId);
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
    isAdmin = data.loggedIn && data.isAdmin;
}

// gets the proper event based on the ID in the URL
async function loadEventById(eventId) {
    try {
        const res = await fetch("/events/data/events.json");
        const events = await res.json();
        return events.find(e => e.eventId === eventId) || null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

function renderEventReviews(eventData) {
    const container = document.getElementById("review-list");
    container.innerHTML = "";
	// default
    if (!eventData.reviews || eventData.reviews.length === 0) {
        container.innerHTML = "<p>No reviews yet.</p>";
        document.getElementById("average-rating").textContent = "No ratings yet.";
        return;
    }
	
	// adding each review
    eventData.reviews.forEach(([text, rating, username], index) => {
        const div = document.createElement("div");
        div.classList.add("review");
		
		// "__deleted__" flags that a review was deleted, so this is displayed:
        const displayedText = text === "__deleted__" ? "<em>This review has been deleted.</em>" : text;
		
		// username and stars
        div.innerHTML = `
            <strong>${username}</strong> - ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
            <p>${displayedText}</p>
        `;
		
		// adding delete buttons if the user is an admin
        if (isAdmin && text !== "__deleted__") {
            const btn = document.createElement("button");
            btn.textContent = "Remove Review";
            btn.style.background = "#ff4444";
            btn.style.marginTop = "10px";

            btn.addEventListener("click", async () => {
                const res = await fetch("/reviews/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ eventId: eventData.eventId, reviewIndex: index })
                });

                if (res.ok) { // replace text with "__deleted__" and render reviews again
                    eventData.reviews[index][0] = "__deleted__";
                    renderEventReviews(eventData);
                } else {
                    alert("Error deleting review.");
                }
            });

            div.appendChild(btn);
        }

        container.appendChild(div);
    });
	// display the average score among reviews that weren't deleted
    displayAverageRating(eventData.reviews.filter(r => r[0] !== "__deleted__"));
}

// star ui logic. 
function setupStarRating() {
    const stars = document.querySelectorAll("#star-rating .star");

    stars.forEach(star => {
		//on the html page, each star has a value, 1-5, which is obtained here
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

function updateStars(rating) {
    const stars = document.querySelectorAll("#star-rating .star");
    stars.forEach(star => {
        const value = parseInt(star.dataset.value);
        star.classList.toggle("selected", value <= rating);
    });
}

function displayAverageRating(reviews) {
    const avgContainer = document.getElementById("average-rating");

    if (!reviews || reviews.length === 0) { // do nothing if no reviews
        avgContainer.textContent = "No ratings yet.";
        return;
    }
	
	// calculating average
    let total = 0;
	for (const review of reviews) {
		const rating = review[1];
		total += rating;
	}
    const avg = total / reviews.length;

	// calculate full/half stars
    const fullStars = Math.floor(avg);
    const halfStar = avg - fullStars >= 0.5 ? "½" : "";
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    const stars = "★".repeat(fullStars) + halfStar + "☆".repeat(emptyStars); // generating string of stars

    avgContainer.textContent = `Average Rating: ${stars} (${avg.toFixed(1)}/5)`;
}
