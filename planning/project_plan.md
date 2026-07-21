# Project Plan

Pod Members: **Emmanuel, Dylan, Semir**
Pod Name: Team 404 not found

## Kanban Board

https://trello.com/invite/b/6a4be0e996e36198ef8b85ba/ATTI1326f85c29b362903c595c4b316e58dbD4986BF4/sed-capstone-planning 

## Problem Statement and Description

Young people in unfamiliar cities struggle to plan group outings, since aligning schedules, picking locations, and matching interests means tedious back-and-forth decision-making.

NavQuest is an AI-powered travel platform that creates personalized group itineraries with optimized schedules, budget estimates, and travel times, and enables users to discover and explore itineraries shared by other travelers.

## User Roles and Personas

User Role: 
Itinerary Organizer

User Personas:
Maya is a college student originally from Texas who is interning in San Francisco for the summer. She has made plans to hang out with her fellow interns next weekend, but she and her friends are living in different parts of the Bay Area and cannot figure out a good place to meet or a list of activities that suits everyone's interests, since they are all new to California.

James is a full-time employee who wants to plan a social gathering with his coworkers. He needs to plan social gatherings like this every month, and he uses NavQuest for this monthly social gathering planning. Everyone in the group has a busy schedule, so James is having trouble finding a good time and place to meet.

Mark is a high school senior who is planning a senior trip with friends to a local beach. All of his friends are considering different places to visit, but they have a budget that needs to be met. Due to these budget constraints, Mark rarely goes on trips and only uses NavQuest a few times each year.

## User Stories

List the current user stories you will implement.

#1 As an itinerary organizer, I want to create itineraries that fit the budgetary restrictions of my group, so that each member of my group can afford to attend.

Acceptance Criteria:
- Organizer can input an average maximum budget when creating an itinerary
- Generated itinerary's total estimated cost per person is displayed on the itinerary and does not exceed the inputted budget per person
- Cost breakdown is visible per activity
- Program sends back a message to the user if it is not feasible to create an itinerary with a given budget and does not create an itinerary

#2 As an itinerary organizer, I want to create itineraries to fit within a specific time window so that the itinerary fits my group’s available schedule.
Acceptance Criteria:
- The organizer can input a specific start and end time
- A group's itinerary is restricted to one day
- System rejects impossible time windows (i.e. visiting 3 places within the same hour)
- Program sends back a message to the user if it is not feasible to create an itinerary with the given time constraints and does not create an itinerary

#3 As an itinerary organizer, I want to create itineraries to be optimized around a central meeting location or destination so that the group can figure out where to meet before they travel together.
Acceptance Criteria:
- Organizer can input the starting location for each group member which is used to find a central meeting location for the first itinerary activity
- Generated itinerary prioritizes finding activities within a user-configurable radius the first meeting location
- Itinerary displays the distance/travel time from one activity to another

#4 As an itinerary organizer, I want itineraries to reflect group interests so that the itinerary matches what most people would enjoy.
Acceptance Criteria:
- Organizer can input interest tags for each group member (i.e. food, outdoors, museums)
- Each member of the group has one or more interest tags associated with it
- AI-generated itinerary activities only include activities with at least one tag matching the group's combined interest list
- If too few matching activities exist to fill the time window, system fills remaining slots with unmatched activities and flags this to the user (rather than failing outright)

#5 As an itinerary organizer, I want to be able to generate a written itinerary using AI so that I do not have to spend too much time writing one myself and so that I can share it easily.
Acceptance Criteria:
- After inputting group information (time constraints, budget constraints, and interests), the organizer can trigger an AI-generated itinerary using a button
- Output can also be transformed into a written description of each activity for the itinerary, including its location, cost estimate per person, and travel time
- The written description is reformatted to be easily readable in the mobile view with adjusted font sizes
- The written itinerary should match the contents of the visual itinerary

#6 As an itinerary organizer, I want to be able to generate a visual itinerary using AI so that the group can follow the itinerary throughout the day.
Acceptance Criteria:
- After inputting group information (time constraints, budget constraints, and interests), the organizer can trigger an AI generation using a button
- Output is structured as a visual itinerary with points representing each activity that the group members should visit
- The visual itinerary should be reformatted so it is easily readable in the mobile view with larger fonts and information shown through a sidebar

#7 As an itinerary organizer, I want to update my itineraries so that I can change parts of my itinerary if my group’s constraints change.
Acceptance Criteria:
- The organizer can edit any constraint (budget, time, location, interests, food preferences, travel radius, transport) on an existing itinerary they own
- Edits an organizer makes to an itinerary's activities are reflected when another user views it

#8 As an itinerary organizer, I want to mark my itinerary as public and share it, so that other people can view and use the itinerary I created.
Acceptance Criteria:
- The organizer can mark an itinerary as either public or private
- Public itineraries are visible to other users in a browsable list or search
- Viewing another user's itinerary does not allow editing it (read-only access)

#9 As an itinerary organizer, I want to browse and view itineraries that other users have made public, so that I can get ideas or find a ready-made plan for my own itinerary.
Acceptance Criteria:
- If the user has not typed a search query, the Discover page shows a list of recently made public itineraries by default.
- The organizer can access a "Discover" page to see public itineraries.
- The organizer can search or filter itineraries by criteria such as location or interests.
- Each itinerary only displays its details in a read-only view.
- An itinerary organizer can bookmark a public itinerary to their "Bookmarked Itineraries" list as a read-only reference (the original stays owned by its creator).
- An itinerary organizer can also save a copy of a public itinerary, creating a new editable itinerary owned by them (with its pins duplicated) that appears in their "Created Itineraries" list.

#10 As an itinerary organizer, I want meal times to be automatically included in my itinerary based on my group's food preferences, so that the group doesn't have to manually plan around when and where to eat.
Acceptance Criteria:
- The AI generated itinerary includes designated meal slots based on the itinerary's duration.
- The system selects food venues that align with the group's interest tags (e.g., "food," "cuisine type").
- Meal stops are clearly labeled within the generated itinerary timeline.
- The system automatically adjusts the itinerary schedule to accommodate these meal times.

#11 As an itinerary organizer, I want to have access to a dashboard that shows the itineraries I've created, a list of itineraries I can explore, a list of itineraries I've saved, and a list of itineraries I've liked.
Acceptance Criteria:
- Once an organizer creates an itinerary, it can be found in the "Created Itineraries" part of the dashboard
- The organizer can view a list of itineraries to discover in the "Explore Itineraries" part of the dashboard
- Itineraries the organizer bookmarked (read-only references to other users' public itineraries) appear in the "Bookmarked Itineraries" part of the dashboard
- Users can see all itineraries they have liked in the "Liked Itineraries" part of the dashboard

#12 As an itinerary organizer, I want to delete my itinerary in case my plans fall through or I dislike my current itinerary.
Acceptance Criteria:
- An organizer can delete an itinerary from their "Created Itineraries" list
- Deleted itineraries no longer appear in their "Created Itineraries" list

#13 As an itinerary organizer, I want to create my own designed account so I can access all the itineraries that I have saved.
Acceptance Criteria:
- When I submit a valid username, email, and password, Supabase Auth creates my account, then a POST /users request creates my linked profile and I receive a 201 response with {username, email, createdAt}, then I'm logged in and redirected to my dashboard
- If any field is missing or improperly formatted, the UI shows a field-specific error without clearing my other inputs
- The password is handled entirely by Supabase Auth; NavQuest never receives or stores it, and it is never included in any response, logs, or client storage

#14 As an itinerary organizer, I want to update my account’s information in case - I want to change my username, email, or password
- When I change my username and save, a PUT /users/:id request is sent containing only the changed field, and I receive a 200 response reflecting the change
- When I change my email or password, the change is made through Supabase Auth; a changed email is then mirrored back into my profile so the dashboard stays in sync
- If a field is improperly formatted, the API returns 400 and the UI shows which field failed without discarding my other valid inputs
- If my account ID no longer exists, the API returns 404 and the UI redirects me to log in again

#15 As an itinerary organizer, I want to see information about my account displayed on my dashboard, including information about my username and the itineraries that I have saved.
- When I navigate to my dashboard while logged in, a GET /users/:id request is sent and the response is used to display my username, created itineraries, saved itineraries, and liked itineraries
- If I'm not signed in, the API returns 401 and I'm redirected to the login page instead of seeing a broken dashboard
- If I have no created, saved, or liked itineraries, the lists render as empty and the UI shows an empty-state message instead of an error

## Pages/Screens

List all the pages and screens in the app. Include wireframes for at least 3 of them.

### Landing Page
![Landing page wireframe](wireframes/landing_page_wireframe.png?raw=true "Landing Page")

### Register Page
![Register page wireframe](wireframes/register_page_wireframe.png?raw=true "Register Page")

### Login Page
![Login page wireframe](wireframes/login_page_wireframe.png?raw=true "Login Page")

### Home Page
![Home page wireframe](wireframes/home_page_wireframe.png?raw=true "Home Page")

### Create Itinerary Page
![Create itinerary wizard wireframe](wireframes/create_itinerary_wizard_wireframe.png?raw=true "Create Itinerary Page")

### Loading Page
![Loading page wireframe](wireframes/loading_page_wireframe.png?raw=true "Loading Page")

### Itinerary Page (Author View)
![Author itinerary page wireframe](wireframes/author_itinerary_page_wireframe.png?raw=true "Itinerary Page (Author View)")

### Discover Page
![Discover page wireframe](wireframes/discover_page_wireframe.png?raw=true "Discover Page")

### Itinerary Page (Viewer View)
![Viewer itinerary page wireframe](wireframes/viewer_itinerary_page_wireframe.png?raw=true "Itinerary Page (Viewer View)")

### Account Page
![Account page wireframe](wireframes/account_page_wireframe.png?raw=true "Account Page")

## Data Model

> **As built (July 2026):** the reference below matches the live Prisma schema
> (`backend/prisma/schema.prisma`). Notable evolutions from the original plan:
> `Itinerary.likeCount` was **removed** (computed live from `Like` rows),
> `Pin.locationImageUrl` made **nullable**, `Pin.rating` **added**, `Itinerary`
> gained an **`@@index([isPublic])`**, and the **Pin/ItineraryStop split**
> completed (Phases 1–5, July 2026) — `Pin` is now venue-only, `ItineraryStop`
> holds scheduled visits.

### User
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| authUserId | String | @unique — the Supabase Auth user id (UUID) this profile belongs to. Credentials (password) are owned by Supabase Auth, not stored here |
| email | String | @unique — mirrored from Supabase Auth for display/lookup; the source of truth for login is Supabase |
| username | String | @unique |
| createdAt | DateTime | @default(now()) |
| itineraries | Itinerary[] | @relation("CreatedItineraries") |
| likes | Like[] | Join rows for the itineraries this user has liked (US #6) |
| bookmarks | Bookmark[] | Join rows for the itineraries this user has bookmarked (US #5) |


### Itinerary
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| userId | Int | Foreign key → User.id |
| sourceItineraryId | Int? | Foreign key → Itinerary.id. Null for original itineraries; set when this itinerary is a saved copy of another. |
| title | String | |
| location | String | Human-readable city/area label (e.g. "San Francisco, CA") shown on itinerary cards and used to search/filter itineraries by location on the Discover page (US #9) |
| description | String? | Short overview text shown in the itinerary header (<Description>) |
| coverImageUrl | String? | Cover image shown in the itinerary header (<CoverImage>). Not user-entered in the wizard; defaults to the first pin's locationImageUrl when the itinerary is created, and is editable later via PUT /itineraries/:id (US #7) |
| isPublic | Boolean | @default(false) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| creator | User | @relation("CreatedItineraries", fields: [userId],
references: [id], onDelete: Cascade) |
| likes | Like[] | Join rows for the users who have liked this itinerary. The like count is computed live from these via Prisma `_count` (exposed as `likeCount` in API responses) — there is no stored counter column |
| bookmarks | Bookmark[] | Join rows for the users who have bookmarked this itinerary |
| sourceItinerary |	Itinerary? |	@relation("ForkedItinerary", fields: [sourceItineraryId], references: [id], onDelete: SetNull) |
| forkedFrom |	Itinerary[] |	@relation("ForkedItinerary") |
| stops | ItineraryStop[] | Ordered visits to venues |

**Model Constraints**
- `@@index([isPublic])` — the Discover feed and recommendation engine both filter on `isPublic`; the index keeps those queries fast as the table grows.

### Pin

> **As built (July 2026):** `Pin` is now the **venue catalog** — one row per real SF
> place (restaurant, museum, park, etc.). Itineraries reference these venues via
> `ItineraryStop` rows. The split from the original dual-purpose Pin table was
> completed in Phases 1–5 (July 2026).

| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| name | String | |
| description | String? | |
| category | String | Either `'restaurant'` or `'activity'` |
| interests | String[] | Interest tags (e.g. `hiking`, `art`, `scenic_views`) |
| cuisines | String[] | Cuisine tags (e.g. `mexican`, `italian`); empty for activities |
| diets | String[] | Diet tags (e.g. `vegetarian`, `vegan`); empty unless explicitly supported |
| rating | Float? | Star rating (0–5) when known; null otherwise |
| pricePerPerson | Float | Estimated per-person cost |
| latitude | Float | |
| longitude | Float | |
| address | String? | |
| hoursOpen | Json? | Per-day hours (e.g. `{"mon":"08:00-22:00", "tue":"08:00-22:00", ...}`); null when unknown |
| locationImageUrl | String? | Photo URL; null if unavailable |
| stops | ItineraryStop[] | All itinerary visits to this venue |

**Model Constraints**
- None currently. Venues are seeded once and reused across itineraries.

### ItineraryStop

> **Added July 2026 (Phases 1–5).** Represents one scheduled visit to a venue
> within an itinerary. Holds timing, travel, and user notes.

| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| pinId | Int | Foreign key → Pin.id. The venue being visited |
| itineraryId | Int | Foreign key → Itinerary.id |
| orderInItinerary | Int | Position within the itinerary (1-based) |
| startTime | DateTime | Scheduled arrival time (Pacific wall-clock) |
| endTime | DateTime | Scheduled departure time (Pacific wall-clock) |
| travelTimeToNextMinutes | Int? | Estimated travel time (in minutes) to the next stop (US #3). Null for the last stop |
| distanceToNextMeters | Float? | Estimated distance (in meters) to the next stop (US #3). Null for the last stop |
| mealType | String? | `'breakfast'`, `'lunch'`, or `'dinner'` when applicable |
| note | String? | User-editable free-text note for this stop |
| pin | Pin | @relation(fields: [pinId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@unique([itineraryId, orderInItinerary])` — Ensures that each stop has a unique position within an itinerary.

### Like
| Attribute | Type | Additional Info |
| --- | --- | --- |
| userId | Int | Foreign key → User.id |
| itineraryId | Int | Foreign key → Itinerary.id |
| createdAt | DateTime | @default(now()) — when the user liked the itinerary; enables recency ordering |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@id([userId, itineraryId])` — Composite primary key; a user can like a given itinerary at most once (dedupe). These rows are the single source of truth for the like count (computed live via `_count`; no cached counter).

### Bookmark
| Attribute | Type | Additional Info |
| --- | --- | --- |
| userId | Int | Foreign key → User.id |
| itineraryId | Int | Foreign key → Itinerary.id |
| createdAt | DateTime | @default(now()) — when the user bookmarked the itinerary; enables recency ordering |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@id([userId, itineraryId])` — Composite primary key; a user can bookmark a given itinerary at most once (dedupe).
## Endpoints

### Users

POST /users - Create the profile row for a newly registered Supabase Auth user
- User story: 13
- Request: { username } — the caller is identified by their Supabase Auth session (access token); email is read from the verified Supabase user, not the request body
- Response (201): { id, authUserId, username, email, createdAt }
- Note: the password is handled entirely by Supabase Auth during sign-up; NavQuest never receives, hashes, or stores it (US #13). This endpoint only creates the app-side profile linked via authUserId
- Errors: 400 if username is missing or improperly structured, 401 if there is no valid Supabase session, 409 if a profile already exists for this authUserId

PUT /users/:id - Update a user's information
- User story: 14
- Request: { username } (optional) — email and password changes go through Supabase Auth directly, not this endpoint; a changed email is mirrored back into the profile via a Supabase webhook/sync
- Response (200): the changed fields
- Errors: 400 if fields are improperly structured, 401 if the user is not signed in, 403 if the profile does not belong to the authenticated user, 404 if the user cannot be found

GET /users/:id - Get a user's dashboard information
- User story: 15
- Query: id
- Response (200): { id, authUserId, username, email, createdAt, createdItineraries, bookmarkedItineraries, likedItineraries }
- Note: bookmarkedItineraries backs the dashboard's "Saved Itineraries" section (read-only references); saved copies are owned itineraries and appear within createdItineraries
- Note: this is the owner's private dashboard (US #15); a user may only fetch their own record. Email and the saved/liked lists are never exposed for another user's id
- Errors: 401 if the user is not signed in, 403 if the requested id is not the authenticated user, 404 if the user cannot be found

### Itineraries

POST /itineraries - Create a new itinerary
- User stories: 8, 11
- Request: { title, location, description, coverImageUrl, maxBudgetPerPerson, dayStart, dayEnd, interests, foodPreferences, travelRadius, transport, startingLocations, isPublic, pins }
- Note: title, location, and description are generated by the AI sequencing step (POST /ai-agent), not entered in the wizard; the client passes the AI-generated values through when persisting. They may be edited later via PUT /itineraries/:id (US #7)
- Response (201): { id, sourceItineraryId, title, location, description, coverImageUrl, maxBudgetPerPerson, dayStart, dayEnd, interests, foodPreferences, travelRadius, transport, startingLocations, creator, isPublic, likeCount, pins, createdAt, updatedAt }
- Errors: 400 if fields are missing or wrongly structured, 401 if the user is not signed in

GET /itineraries - List itineraries accessible to the user
- User stories: 9, 11
- Request (all query params optional): ?q= (free-text search over title/location), ?location= (filter by location label), ?interests= (comma-separated interest tags; matches itineraries sharing any tag), ?scope= ("mine" for the user's own itineraries, "public" for the Discover feed of public itineraries; defaults to "public"), ?sort= ("recent" | "popular"; defaults to "recent"), ?limit= & ?offset= (pagination; back the Discover page's <LoadMoreButton>)
- Note: with no q/location/interests params and scope=public, this returns recently made public itineraries — the default Discover feed (US #9)
- Response (200): [ { id, sourceItineraryId, createdAt, updatedAt, title, location, description, coverImageUrl, creator, isPublic, likeCount, pins } ]
- Errors: 400 if a query param is malformed, 401 if the user is not signed in

GET /itineraries/:id - Get a single itinerary
- User stories: 9, 11
- Request: none
- Response (200): { id, sourceItineraryId, createdAt, updatedAt, title, location, description, coverImageUrl, maxBudgetPerPerson, dayStart, dayEnd, interests, foodPreferences, travelRadius, transport, startingLocations, creator, isPublic, likeCount, pins }
- Errors: 401 if the user is not signed in, 403 if the user is not authorized to access the resource, 404 if the itinerary cannot be found

PUT /itineraries/:id - Update an itinerary
- User stories: 7, 8
- Request: { title, location, description, coverImageUrl, maxBudgetPerPerson, dayStart, dayEnd, interests, foodPreferences, travelRadius, transport, startingLocations, isPublic, pins } (all fields optional)
- Response (200): the changed fields
- Note: the like count is not editable here; it is derived from Like rows via the like/unlike endpoints below
- Errors: 401 if the user is not signed in, 403 if the user does not have access to the itinerary, 404 if the itinerary cannot be found

DELETE /itineraries/:id - Delete an itinerary
- User story: 12
- Request: none
- Response (204): none
- Errors: 401 if the user is not signed in, 403 if the authenticated user does not have access to the itinerary, 404 if the itinerary cannot be found

POST /itineraries/:id/like - Like an itinerary
- User story: 11
- Description: Adds a Like row for the authenticated user. Idempotent — liking an already-liked itinerary is a no-op. Returns the current like count (computed live from the Like rows).
- Request: none
- Response (200): { likeCount }
- Errors: 401 if the user is not signed in, 404 if the itinerary cannot be found

DELETE /itineraries/:id/like - Unlike an itinerary
- User story: 11
- Description: Removes the authenticated user's Like row. Idempotent — unliking a not-liked itinerary is a no-op. Returns the current like count (computed live from the Like rows).
- Request: none
- Response (200): { likeCount }
- Errors: 401 if the user is not signed in, 404 if the itinerary cannot be found

POST /itineraries/:id/bookmark - Bookmark an itinerary
- User stories: 9, 11
- Description: Adds the authenticated user to the itinerary's bookmarkedBy relation so it appears in their "Saved Itineraries" list as a read-only reference. Idempotent — bookmarking an already-bookmarked itinerary is a no-op.
- Request: none
- Response (204): none
- Errors: 401 if the user is not signed in, 403 if the itinerary is not public, 404 if the itinerary cannot be found

DELETE /itineraries/:id/bookmark - Remove a bookmark
- User stories: 9, 11
- Description: Removes the authenticated user from the itinerary's bookmarkedBy relation. Idempotent — removing a bookmark that does not exist is a no-op.
- Request: none
- Response (204): none
- Errors: 401 if the user is not signed in, 404 if the itinerary cannot be found

POST /itineraries/:id/copy - Save an editable copy of an itinerary
- User stories: 9, 11
- Description: Deep-duplicates the itinerary and its pins into a new itinerary owned by the authenticated user, with sourceItineraryId set to the original's id. The copy defaults to isPublic=false (and starts with no likes), and appears in the user's "Created Itineraries" list.
- Request: none
- Response (201): the created copy (same shape as POST /itineraries response)
- Errors: 401 if the user is not signed in, 403 if the source itinerary is not public and not owned by the user, 404 if the source itinerary cannot be found

### Pins

GET /pins/:id - Get a single pin
- User stories: 3, 5
- Request: none
- Response (200): { id, itineraryId, orderInItinerary, name, description, pricePerPerson, latitude, longitude, address, startTime, endTime, travelTimeToNextMinutes, distanceToNextMeters, locationImageUrl }
- Errors: 401 if the user is not signed in, 403 if the authenticated user does not have access to the pin, 404 if the pin cannot be found

POST /pins - Create a pin for an itinerary
- User stories: 1, 2, 3, 4, 10
- Request: { itineraryId, orderInItinerary, name, pricePerPerson, latitude, longitude, startTime, endTime, description?, address?, tags?, rating?, locationImageUrl?, travelTimeToNextMinutes?, distanceToNextMeters? }
- Response (201): the created pin (including id)
- Errors: 400 if required fields are missing or wrongly structured (description, address, tags, rating, and locationImageUrl are optional), 401 if the user is not signed in, 403 if the user does not own the target itinerary, 404 if the itinerary cannot be found

PUT /pins/:id - Update a pin
- User story: 7
- Request: { orderInItinerary, name, description, pricePerPerson, latitude, longitude, address, startTime, endTime, travelTimeToNextMinutes, distanceToNextMeters, locationImageUrl } (all fields optional)
- Response (200): the changed fields
- Errors: 400 if fields are missing or wrongly structured, 401 if the user is not signed in, 403 if the authenticated user does not have access to the pin, 404 if the pin cannot be found

DELETE /pins/:id - Delete a pin from an itinerary
- User story: 7
- Request: none
- Response (204): none
- Errors: 401 if the user is not signed in, 403 if the authenticated user does not have access to the pin, 404 if the pin cannot be found

### AI Agent

POST /ai-agent - Generate a structured itinerary from AI  **(BUILT)**
- User stories: 1, 2, 3, 5, 6, 10
- Description: The deterministic recommendation engine builds a shortlist of real, pre-ranked places from the group's constraints, then the AI sequences them into an ordered one-day itinerary (see "Itinerary Sequencing" in the AI Feature Specification). Returns a structured itinerary to be stored and rendered.
- Request: { shortlist, constraints } — constraints carry timeWindow, maxBudgetPerPerson, groupSize, meetingPoint, travelRadius, transport
- Response (200): { itinerary } — ordered stops identified by pinId with arrive/depart times and travel time + distance to the next stop. Stops carry no place details or cost; those are re-hydrated from the shortlist by pinId when persisting (so the AI can neither invent nor misprice a place)
- Errors: 200 with a "constraints too tight" (feasible: false) message if no feasible day fits, 401 if the user is not signed in

POST /ai-agent/edit - Revise an itinerary from a natural-language request  **(NOT BUILT — future, US #7)**
- User story: 7
- Description: Interprets a plain-language request (e.g. "make it cheaper," "less walking") into constraint changes, then re-runs the recommendation engine and sequencing step to produce a revised itinerary (see "Natural-Language Itinerary Editing" in the AI Feature Specification). The AI only adjusts constraints — it never edits the list of places directly. This route is designed but not yet implemented.
- Request: { currentItinerary, userRequest, currentConstraints }
- Response (200): { itinerary } — the revised itinerary, or the unchanged itinerary with a clarification prompt if the request is ambiguous
- Errors: 401 if the user is not signed in

## State Architecture

```jsx
// Global (used by auth or App component)
const [currentUser, setCurrentUser]                       = useState(null);

// Database (come from API)
const [exploreItinerariesList, setExploreItinerariesList]         = useState([]);
const [createdItinerariesList, setCreatedItinerariesList]         = useState([]);
const [bookmarkedItinerariesList, setBookmarkedItinerariesList]   = useState([]);  // dashboard "Saved Itineraries" section
const [likedItinerariesList, setLikedItinerariesList]             = useState([]);

// Local to Discover page
const [userSearchQuery, setUserSearchQuery]               = useState("");
const [recentItinerariesList, setRecentItinerariesList]   = useState([]);

// Local to Itinerary wizard component
const [draftPreferences, setDraftPreferences] = useState({
      // title, location, and description are NOT collected here — the AI
      // sequencing step generates them from the constraints below.
      dayStart: null,             // start of the one-day time window
      dayEnd: null,               // end of the one-day time window
      startingLocations: [],      // list (tag input)
      travelRadius: null,         // single value
      transport: "",              // single value
      interests: [],              // list (tag input)
      foodPreferences: [],        // list (tag input)
      maxBudgetPerPerson: null,   // single value (per person)
      isPublic: false,            // single boolean
    });
const [currentWizardStep, setCurrentWizardStep]           = useState(1);

// Local to Itinerary page
const [currentPin, setCurrentPin]                         = useState(null);
const [currentViewedItinerary, setCurrentViewedItinerary] = useState(null);
```

## Component Hierarchy

```

<App>
│
├── <Navbar>
│   ├── <Logo>
│   ├── <NavLinks>              (only if authenticated)
│   │   ├── <NavLink> "Home"
│   │   └── <NavLink> "Discover"
│   ├── <AuthButtons>          (only if unauthenticated)
│   │   ├── <LoginButton>
│   │   └── <RegisterButton>
│   └── <AccountIcon>          (only if authenticated)
│
├── <Pages>
│   │
│   ├── <LandingPage>
│   │   ├── <HeroSection>
│   │   │   ├── <Heading>
│   │   │   ├── <Subheading>
│   │   │   └── <StartPlanningButton>
│   │   └── <DemoVideoSection>
│   │       └── <VideoPlayer>
│   │
│   ├── <LoginPage>
│   │   └── <AuthCard>
│   │       ├── <Heading>
│   │       ├── <LoginForm>
│   │       │   ├── <TextInput> email
│   │       │   ├── <PasswordInput> password
│   │       │   └── <SubmitButton> "Log in"
│   │       └── <SignUpSection>
|   |           ├── <SignUpText>
|   |           ├── <RegisterLink>
│   │
│   ├── <RegisterPage>
│   │   └── <AuthCard>
│   │       ├── <Heading>
│   │       ├── <RegisterForm>
│   │       │   ├── <TextInput> username
│   │       │   ├── <TextInput> email
│   │       │   ├── <PasswordInput> password
│   │       │   ├── <ErrorMessage>            (only if a submit error occurs)
│   │       │   ├── <ConfirmationMessage>     (only on successful register, e.g. "check your email")
│   │       │   └── <SubmitButton> "Register"
|   |       └── <LoginSection>
|   |           ├── <loginText>
|   |           ├── <loginLink>
│   │
│   ├── <HomePage>
│   │   ├── <ExploreSection>
│   │   │   ├── <SectionHeader>
│   │   │   └── <CardCarousel>
│   │   │       ├── <ItineraryCard> ×N
│   │   │       └── <CarouselArrow>
│   │   ├── <CreatedItinerariesSection>
│   │   │   ├── <SectionHeader>
│   │   │   │   └── <NewItineraryButton>
│   │   │   └── <CardCarousel>
│   │   │       ├── <ItineraryCard> ×N
│   │   │       └── <CarouselArrow>
│   │   ├── <BookmarkedItinerariesSection>
│   │   │   ├── <SectionHeader>
│   │   │   └── <CardCarousel>
│   │   │       ├── <ItineraryCard> ×N
│   │   │       └── <CarouselArrow>
│   │   └── <LikedItinerariesSection>
│   │       ├── <SectionHeader>
│   │       └── <CardCarousel>
│   │           ├── <ItineraryCard> ×N
│   │           └── <CarouselArrow>
│   │
│   ├── <CreateItineraryPage>
│   │   ├── <PageHeading>
│   │   ├── <WizardStepper>
│   │   │   └── <Step> ×4        "Time Range" / "Travel/Transport" / "Preferences" / "Finish"
│   │   └── <ItineraryWizard>
│   │       ├── <Step1_TimeRange>
│   │       │   ├── <TimeRangeField>
│   │       │   │   ├── <TimeInput> "Start Time"
│   │       │   │   └── <TimeInput> "End Time"
│   │       │   └── <NextButton>
│   │       ├── <Step2_TravelTransport>
│   │       │   ├── <TagInput> Starting locations
│   │       │   │   ├── <dropdownInput>
│   │       │   │   └── <TagList>
│   │       │   │       └── <Tag> ×N
│   │       │   ├── <TravelRadiusField>
│   │       │   ├── <TransportField>
│   │       │   └── <NextButton>
│   │       ├── <Step3_Preferences>
│   │       │   ├── <TagInput> Interests
│   │       │   │   ├── <dropdownInput>
│   │       │   │   └── <TagList>
│   │       │   │       └── <Tag> ×N
│   │       │   ├── <TagInput> Food preferences
│   │       │   │   ├── <dropdownInput>
│   │       │   │   └── <TagList>
│   │       │   │       └── <Tag> ×N
│   │       │   ├── <BudgetField>
│   │       │   └── <NextButton>
│   │       └── <Step4_Finish>
│   │           ├── <ItineraryDetailsPreview>
│   │           ├── <PrivacyField>        "Private/Public"
│   │           └── <FinishButton>
│   │
│   ├── <LoadingPage>
│   │   └── <LoadingSection>
│   │       ├── <LoadingText>
│   │       └── <LoadingSpinner>
│   │
│   ├── <ItineraryPage>
│   │   ├── <ItineraryHeader>
│   │   │   ├── <Title>
│   │   │   ├── <Description>
│   │   │   ├── <Author>
│   │   │   └── <CoverImage>
│   │   ├── <ItineraryPanel>
│   │   │   ├── <ActionBar>
│   │   │   │   ├── <EditButton> (owner only)
│   │   │   │   ├── <SaveButton> (owner only — save edits)
│   │   │   │   ├── <BookmarkButton> (non-owner — bookmark to "Saved Itineraries", read-only)
│   │   │   │   ├── <SaveCopyButton> (non-owner — save an editable copy to "Created Itineraries")
│   │   │   │   ├── <LikeButton> (any signed-in user — toggle like)
│   │   │   │   └── <DeleteButton> (owner only)
│   │   │   └── <WrittenItinerary>
│   │   ├── <MapView>
│   │   │   ├── <MapPin> ×N
│   │   │   └── <CloseButton>
│   │   └── <PinDetailModal>
│   │       ├── <PinName>
│   │       ├── <PinImage>
│   │       ├── <PinTiming>
│   │       ├── <PinCost>
│   │       └── <PinAddress>
│   │
│   ├── <DiscoverPage>
│   │   ├── <SearchBar>
│   │   ├── <SearchResultsSection>        (shown when a query is typed)
│   │   │   ├── <SectionHeader>
│   │   │   ├── <ItinerariesGrid>
│   │   │   │   └── <ItineraryCard> ×N
│   │   │   └── <LoadMoreButton>
│   │   └── <RecentItinerariesSection>    (shown when no query — US #9)
│   │       ├── <SectionHeader>
│   │       ├── <ItinerariesGrid>
│   │       │   └── <ItineraryCard> ×N
│   │       └── <LoadMoreButton>
│   │
│   └── <AccountPage>                    
│       ├── <AccountAvatar>
│       │   └── <AvatarUploadButton>       "+"
│       ├── <AccountNav>
│       │   ├── <ProfileButton>
│       │   └── <LogOutButton>
│       ├── <ProfileSection>
│       │   ├── <SectionHeader>
│       │   ├── <UsernameField>            (editable)
│       │   └── <EmailField>
│       └── <ChangePasswordSection>
│           ├── <SectionHeader>
│           ├── <PasswordInput> ×3         "Old" / "New" / "Confirm new password"
│           └── <UpdatePasswordButton>
│
└── <Footer>
```

## AI Feature Specification

The AI's one **built** job is itinerary sequencing. The recommendation engine
stays deterministic (it selects and ranks real places from our database); the AI
is a language layer that turns the resulting shortlist + constraints into a usable
day. Model calls go through the **Salesforce internal model gateway** (called via
the OpenAI SDK, model `claude-sonnet-4-5`), are asked to return structured JSON,
and have a deterministic non-AI fallback so the app never hard-fails on a bad
response. The two other AI uses below (**tag enrichment** and **natural-language
editing**) are **designed but not yet built** — kept here as intended future work.

### Tag Enrichment (offline seed step) — NOT BUILT (future)

> The current catalog is a hand-curated static dataset whose tags are authored by
> hand, so there is no live enrichment pass. Kept as a future option if the catalog
> grows too large to hand-tag.


Enriches sparsely-tagged places with additional interest tags from the fixed
vocabulary so the recommendation engine has richer signal to match on.

- User stories: 4, 10
- Description: Roughly 80% of seeded places carry only one interest tag. Before
  launch, an AI pass suggests additional tags (e.g. a waterfront park also gets
  "scenic_views") to improve recommendation quality.
- When it runs: offline, during database seeding — not part of the live request flow
- Input: a seeded place { name, category, existing tags }
- Output: zero or more additional interest tags
- Behavior:
    - Only tags in the canonical interest vocabulary are accepted; any suggested tag outside the vocabulary is discarded
    - Suggested tags are reviewed by a person before being committed
    - Results are written to the place's tags column and cached, so there is zero cost at request time

### Itinerary Sequencing (POST /ai-agent) — BUILT

Organizes a shortlist of real, pre-ranked places into a sensible one-day
itinerary. The AI sequences only — it does not choose or invent places.

- User stories: 1, 2, 3, 5, 6, 10
- Description: Receives the recommendation engine's shortlist plus the group's
  constraints and returns an ordered day to be stored and rendered.
- Input: { shortlist (places with id, category, tags, coordinates, pricePerPerson, openingHours), constraints (timeWindow, maxBudgetPerPerson, groupSize, meetingPoint, travelRadius, transport) }
- Output (200): a structured JSON itinerary — a generated title, location label, and short description for the overall day, plus ordered stops identified by pinId with arrive/depart times and travel time + distance to the next stop. A stop carries no cost or place details; name, coords, image, and pricePerPerson are re-hydrated from the shortlist by pinId when persisting
- Behavior:
    - Anchors the day near the meetingPoint, orders stops by geography, inserts meal stops at meal times, and respects each place's opening hours and the itinerary's time window
    - Uses only pinId values from the provided shortlist — no hallucinated places
    - Keeps total per-person cost within maxBudgetPerPerson (the shortlist is pre-trimmed to fit); if no feasible day fits, returns a "constraints too tight" message instead of an itinerary
    - If the AI call fails or its output fails validation, the system falls back to a deterministic sequencer so an itinerary is always produced

### Natural-Language Itinerary Editing — NOT BUILT (future)

> Designed, not implemented — there is no `/ai-agent/edit` route today. Clear next
> AI feature: reuses the existing engine + sequencer, adding only a "free text →
> constraint delta" step in front.


Lets the organizer adjust a generated itinerary in plain language instead of
manually editing each stop.

- User stories: 7
- Description: After an itinerary exists, the organizer types a request such as
  "make it cheaper," "less walking," or "swap the museum for something outdoors."
  The AI interprets it into constraint changes and the itinerary is regenerated.
- Input: { currentItinerary, userRequest (free text), currentConstraints }
- Output: an updated set of constraints (a delta) that is re-run through the recommendation engine and sequencing step to produce a revised itinerary
- Behavior:
    - The AI only translates the request into constraint changes (budget, radius, add/remove interests) — it never edits the list of places directly
    - Because the revised constraints are re-run through the deterministic engine, every place in the result remains real and validated
    - Ambiguous requests leave the itinerary unchanged and prompt the user to clarify

## AI Feature Decisions Log

| Decision | Sprint | What Changed | Why|
| --- | --- | --- | --- |
| LLM provider | 2 | OpenRouter → **Salesforce internal model gateway** (OpenAI SDK, `claude-sonnet-4-5`) | The gateway we had reliable, keyed access to; same OpenAI-SDK shape |
| AI scope trimmed | 2 | Stops carry **only** pinId + times + travel; no place details or cost | Cost/details are re-hydrated from the shortlist by pinId, so the AI can't invent or misprice a place |
| Fallback | 2 | Added a **deterministic sequencer** fallback (`services/ai/fallback/`) | An itinerary is always produced even if the AI call/validation fails |
| Tag enrichment dropped | 2 | Offline AI tag-enrichment **not built** | Catalog is hand-curated with tags authored by hand — nothing to enrich |
| NL editing deferred | — | `POST /ai-agent/edit` **not built** | Out of MVP scope; designed for later, reuses the deterministic engine |

## Milestones

Milestone 1: Creating the Website’s Skeleton
Goal: Begin creating the skeleton for what the project will look like

Requirements:
- Set up the frontend and backend libraries and frameworks
- Translate the User, Itinerary, and Pin models from project_plan.md into prisma/schema.prisma, including the named relations and the implicit many-to-many relations for likes and bookmarks.
    - Run an initial migration
- Add user functionality
    - On the backend, the endpoints POST /users, PUT /users/:id, GET /users/:id should work with proposed request/response structures
    - Set up Supabase Auth authentication to streamline the user authentication process
- Set up the React app with pages: login/register, landing, dashboard, itinerary view, and a "create itinerary" page.
- Wire register/login to Supabase authentication
    - Users should have the ability to edit their username/email/password, which is reflected through Supabase

Checkpoint:
- Prisma Models for the User, Itinerary, and Pin Models are all properly displayed
- Users are able to login into NavQuest and change their username/email/password accordingly
- Users can see an empty page corresponding to the landing, login, register, dashboard, itinerary view, and “create itinerary” pages.

Milestone 2: Generating Itineraries
Goal: Create the itinerary generation algorithm using real place data to generate itinerary information

> **As built:** place data ended up being a **hand-curated static SF dataset**
> (not a live OSM/Overpass pull), and maps use **Leaflet/react-leaflet over OSM
> tiles** on the frontend (not MapLibre). See `.claude/docs/data-strategy.md`.

Requirements:
- Set up OSM and MapLibre on the backend to handle fetching/displaying place data
- Create the endpoint POST /itineraries with a Prisma transaction to ensure all pins are created within one transaction
- Test using Postman whether user-provided inputs (i.e. food restrictions, time restrictions) provide reasonable itineraries
- Include proper error handling (i.e. recognizing when there are no times for the group to meet)
- Design the form for group members to fill out their information (i.e. food preferences, interests)
    - Create the functionality to prepopulate this information through adding user’s information
    - Connect form to backend and see if, when logging the result, a properly structured itinerary is created to be displayed

Checkpoint:
- An itinerary can be properly created given group member constraints
- A form is created where an event organizer can input their group’s preferences to make this itinerary

Milestone 3: Displaying and Saving Itineraries
Goal: Once the itinerary has been created, the user should be able to see their own itinerary in their dashboard and see other people’s itineraries

Requirements:
- After the user creates the itinerary, display information about the itinerary through a sidebar and a map filled with numbered pins describing where the group should go for each location
    - The map view should be clearly visible for all views
- Reopening a saved itinerary should restore all of its information exactly as it was saved
- Users should have the ability to mark their itineraries as public
    - If public, the user should be able to access it in a “Discover” page
    - On this “Discover” page, users should be able to filter to find certain itineraries
    - All public itineraries should be displayed on the “Discover” page.
    - For these public itineraries, the user should be able to like these itineraries, which changes their like count for all users
- Users should be able to view the itineraries they have liked from their dashboard
- Users should be able to bookmark another user’s public itinerary to their "Saved Itineraries" list on their dashboard (a read-only reference to the original)
- Users should be able to save an editable copy of another user’s public itinerary (the copy and its pins are duplicated under the current user, appearing in "Created Itineraries")

Checkpoint:
- The user can see a visual itinerary with pins and information surrounding the itinerary
- The user should be able to set their itinerary as public so other users can use it
- The user can find other user’s public itineraries
- The user can like a public itinerary and view their liked itineraries from their dashboard
- The user can bookmark a public itinerary (read-only) and save an editable copy of it to their own dashboard

Milestone 4: Editing, Deleting, and Polishing
Goal: Allow users to modify and remove their itineraries, and make sure the app is polished and deployable

Requirements:
- Implement PUT /itineraries/:id so users can edit a saved itinerary’s details
- Implement DELETE /itineraries/:id so users can delete an itinerary from their dashboard
- Implement the pin endpoints (POST /pins, PUT /pins/:id, DELETE /pins/:id) so users can add, edit, or remove individual stops within an itinerary
- Make sure all pages are responsive and usable on mobile devices
- Deploy the frontend, backend, and database so the app is publicly accessible

Checkpoint:
- A user can edit a saved itinerary and its pins
- A user can delete an itinerary and it no longer appears in their dashboard
- The app is fully usable on mobile screen sizes
- The app is deployed and accessible online

Stretch Goals:
- Google Places enrichment to fill in ratings, price level, and reliable hours for recommended places
  - **As built:** not pursued — the hand-curated static dataset already carries real ratings and prices, so enrichment was unnecessary. A no-op enrichment hook remains in the engine for a future offline+cached pass. See `.claude/docs/data-strategy.md`.
- Natural-language itinerary editing (`POST /ai-agent/edit`) — designed, not built (see AI Feature Specification)
- Split the overloaded `Pin` table: keep `Pin` as venue-only (adding a per-day `hoursOpen` JSON column and explicit `interests`/`cuisines`/`diets` fields instead of one derived `tags` array) and move per-visit data to a new `ItineraryStop` table. The modular data shape once the catalog grows or places become user-editable. See `.claude/pin-split-tasks.md` and `.claude/docs/database-schema.md`.
- **Saved user preferences** — let a logged-in user store their own interests, food preferences, diets, home location, and typical budget (plain columns/arrays on `User`, no join). A host can then search users and prefill a member card from their saved values (a snapshot copy — member info stays transient per the Sprint-1 decision, not a live link). Simple and additive; see `.claude/docs/user-preferences-and-friends-stretch.md`.
- **Friend requests** — a `Friendship` join table (`requesterId`, `addresseeId`, `status: pending|accepted`; decline = delete the row) so the user search above can be gated to friends only rather than anyone opted-in. Backend is small; the frontend (request button, incoming-requests inbox, friends list) is the bulk of the work. Depends on / gates the saved-preferences search. See `.claude/docs/user-preferences-and-friends-stretch.md`.

## Decision Log

# Sprint 1
Decision 1:

Decision: Decided to make the Itinerary Organizer be the only person inputting information about their group’s budgets, interests, and time constraints.
Context: We were creating the wireframe for the itinerary and were unsure whether or not to let the group members individually fill out the form to prevent user fatigue from the event organizer

Alternative Considered:  Each member of the group fills out information about their own interests, budgets, and time constraints by themselves and all this information is used to draft an itinerary. This would require each group member to become users for NavQuest and fill out the form before the itinerary is created.

Tradeoffs: By requiring the organizer to fill out the form themselves, they will need to fill in more fields as their group gets larger. Therefore, the website needs to minimize the amount of information that the organizer is placing on the form. However, by doing this approach, our website now prevents the issue of trying to maintain/store information about incomplete itineraries (since the alternative of requiring all group members to fill out preferences would mean having to store that information) which may waste website storage.

Decision 1:

Decision: Decided that the Itinerary data model should not keep track of information like maxBudgetPerPerson, dayStart/dayEnd, interests, foodPreferences, travelRadius, transport, startingLocations. This information would be extracted from the client side instead. 

Context: Deciding whether or not including the attributes in the data model was too much/would be a privacy issue.

Tradeoffs: This makes it easier to handle data operations now since they will be simplified, but when implementing the edit stretch feature, we might have to add these values back if we want users to see what information about the itinerary was previously saved.

Decision 3:

Decision: The explore card carousel will just display all itineraries randomly. The recents card carousel on the discover page will show all recently created itineraries (so the itineraries will be sorted by date). 

Context: Deciding functionality for how cards should be populated on the home page. Explore could end up using a recommendation system to display itineraries that the user would most likely want to choose from, but we will likely save this implementation as a stretch feature.

Tradeoffs: Just having a randomly chosen set of cards for the Explore carousel differentiates it enough from simply listing all itineraries, as will be displayed in the Recents carousel. It is also an easier implementation than trying to tie a recommendation system to showing the itineraries that are most likely to be favored.

# Sprint 2

# Sprint 3

# Sprint 4
