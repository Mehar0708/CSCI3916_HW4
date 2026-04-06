# CSCI 3916 — Assignment Four
### Movies & Reviews API

---

## Quick Links

- **Render Deployment:** [https://csci3916-hw4-aqr1.onrender.com](https://csci3916-hw4-aqr1.onrender.com)
- **Postman Collection:** `__postman/__`

---

## Project

This project is a Node.js / Express REST API that builds on previous assignments to manage a `movies` collection and a separate `reviews` collection in MongoDB. Reviews are stored independently and can be optionally included in movie responses using the query parameter `?reviews=true`. The API supports listing movies, retrieving a single movie (optionally with reviews), creating reviews (JWT-protected), and basic analytics hooks (extra credit) to report which movies are requested.

---

## Features

- Movies stored in a MongoDB collection
- Reviews stored in a separate MongoDB collection and linked by `movieId`
- Optional aggregated responses using MongoDB `$lookup`
- JWT-protected POST for creating reviews (username from token recorded)
- Google Analytics event tracking on review creation (extra credit)
- Postman test collection included in the `__postman/__` folder

---

## Postman Tests

The Postman collection is located in the `__postman/__` folder. Import it into Postman and run requests in order:

1. **Sign Up** — creates a new test user
2. **Sign In** — authenticates and auto-saves the JWT token as a collection variable
3. **Get All Movies** — fetches movies and auto-saves a valid `movieId` and title
4. **Valid Save Review** — posts a review using the saved `movieId`
5. **Valid Movie With Reviews** — fetches the movie with embedded reviews
6. **Invalid Movie** — expects a `404` for a non-existent title
7. **Invalid Save Review** — expects a `404` for a bad `movieId`

---

## Deployment

The API is deployed on Render at:
**[https://csci3916-hw4-aqr1.onrender.com](https://csci3916-hw4-aqr1.onrender.com)**

