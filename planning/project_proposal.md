# Project Proposal

Pod Name: NavQuest
Pod Members: **Dylan D’Rozario, Emmanuel Ekpenyong, Semir Ali**

## Problem Statement

People often struggle to coordinate social activities in unfamiliar cities. Planning a group outing requires aligning schedules, choosing convenient meeting locations, and finding activities that match diverse interests, often leading to time consuming back-and-forth communication and/or cancelled plans. The audience is “people in unfamiliar cities.”

## Target Audience

Our target audience is people in unfamiliar cities because they struggle with finding places they can visit with other people and planning the logistics behind transportation between these places.

## Description

NavQuest is an AI-powered itinerary planning platform designed to help people in unfamiliar cities coordinate group outings without the usual back-and-forth of aligning schedules, picking meeting spots and matching diverse interests.

The site generates tailored itineraries based on user inputs like budget, starting locations, transportation preferences, interests, availability and displays them both as textual plans and on an interactive map which shows each group member's information. Such as starts, visits, ends, travel methods, activity duration.

Our target audience will use NavQuest to create, save and share itineraries through their personal accounts. Users can browse community shared itineraries, favorite, edit or delete their own plans at any time. These changes will be reflected live for anyone viewing a shared itinerary. Users will also use NavQuest to document their own experiences to generate a more detailed profile of their interests, so each outing becomes more personalized.


## Expected Features List

- AI-powered itinerary recommendations
- Users can create textual and visual itineraries for a group
- Display itineraries on an interactive map:
    * Show each group members individual route from their starting location to the group’s meeting point
    * After the meeting point, display a single shared route connecting each destination in chronological order( and displaying information such as travel time, activity duration, when places close, and the transportation method for each segment)
    * Show the final group’s final destination or endpoint
-Users can create accounts and log in to create, save, edit, or delete itineraries
-Users can save itineraries to a searchable shared database or keep them private depending on whether they choose to allow public sharing.
-Users can search for public itineraries by keywords (e.g., itinerary names, locations, cities, or attractions)
-Users can favorite public itineraries they find
-Users can view their created or favorited itineraries from their account profile
-Responsible design for mobile devices


## AI Feature API Endpoint Sketch

### Endpoint

**GET** `/itinerary/ai-prompt`

### Who calls it
The frontend calls this when the user requests to generate an itinerary for their group.

### Request body

The request body contains a JSON object with the following fields:
- `starting_location` (array of latitude and longitude coordinates)
- `interests` (array of strings)
- `budget` (integer)

### What the backend does

Users within a group input their individualized `starting_location`, `interests`, and `budget`. This information is processed and used to construct a prompt for the AI model.

The AI model generates an itinerary based on the provided inputs and returns a structured response containing a list of places the group can visit.

### Success response

- **Status:** 200

{
  "summary": "A day mixing hiking and food spots near downtown LA, within everyone's budget.",
  "confidence": 0.87,
  "places": [
    {
      "name": "Griffith Observatory",
      "address": "2800 E Observatory Rd, Los Angeles, CA 90027",
      "coordinates": [34.1184, -118.3004],
      "category": "landmark",
      "hours": {
        "monday": "12:00–22:00",
        "tuesday": "12:00–22:00"
      },
      "price_level": 0,
      "rating": 4.7,
      "review_count": 45213,
      "description": "Iconic hilltop observatory with free telescopes and sweeping views of LA.",
      "photo_url": "https://...",
      "estimated_visit_minutes": 90,
      "why_recommended": "Matches the group's interest in views/outdoors and fits within everyone's budget since admission is free."
    }
  ]
}

**Failure response:**
- Status: 500
- Body: { "error": "AI recommendation unavailable" }
- Fallback behavior: Frontend displays a generic message when this endpoint fails

**Why this runs on the backend (not in the browser):**
This runs on the backend because the API key should only be held by the server rather than the user having the information on the browser. This helps secure the AI prompt calls the website makes to find itineraries and ultimately makes users feel more comfortable using AI to create itineraries.

## Related Work

What similar apps and websites? How will your project stand out from these other websites?

### Google Maps: 
Google Maps Ask Maps AI allows users to generate travel plans, but they lack a standardized way to input structured group constraints such as budgets, individual starting locations, and mixed interests. They also struggle to support multiple users starting from different locations, clearly visualize each participant’s route to a shared meeting point, and seamlessly transition from those individual routes into a unified group itinerary. In addition, they do not effectively present a single, time-ordered shared journey with consistent map-based visualization across all stops, nor do they reduce the need for repeated prompting to refine and correct itinerary outputs. There is also no way to have a database of mapped itineraries of other uses that is searchable.

### ChatGPT/Gemini/Claude: 
With the right prompt, AI text generation tools like ChatGPT can generate written itineraries and static maps that detail a list of activities for people to follow, along with suggested routes. There is no standardized format for what is generated, and they cannot create dynamic mapping for people to follow directions. There is no way to share itineraries with a public set of people, so planning activities may involve prompting multiple times to get the right output.

### Wanderlog:
Wanderlog allows users to manually create itineraries and view marked places on a map. However, users must spend time building the itinerary themselves rather than having it automatically generated. It does offer map visualization and some collaborative features, but there is no reliable or quick way to plan transportation between friends starting from different locations and having each friend have a dynamic map to help them travel with.

### Wonderplan:
Wonderplan lets users input basic preferences and generate a structured itinerary. However, it lacks the ability to coordinate between multiple travelers with different starting locations, making it less effective for groups that need to optimize where and how they meet up.

## Open Questions

What questions do you still have? What topics do you need to research more for your project?

* Which APIs should we use?
* How do we build a recommendation system?
* How do we build maps that update dynamically and visually represent complex data in a simple way?
* What is the absolute minimum version we can ship within our timeline (e.g., one city only, solo itineraries first, group features later)?
* How do we handle cases where the AI returns places that don’t exist or contains incorrect information? How do we validate results?
* Should we build our own authentication system (JWT/sessions) or use a service (e.g., Auth0, Clerk, Supabase Auth)?
* How should multiple users collaborate on one itinerary—does one person create it and others view it, or can everyone edit it?
* How do we collect each group member’s starting location and preferences?
* How should we split work across three people—by feature, by layer (frontend/backend), or by user story?
* What should our Git workflow be (branches, pull requests, code review)?
* Which map API should we use (Google Maps, Mapbox, Leaflet/OpenStreetMap), and what are the cost and free-tier limits?
* How do we get accurate travel times between points (driving, walking, transit)?
* How do we reliably geocode addresses into latitude and longitude?
