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
- Instead of manual login, I can use a third-party Google account to sign up or log in, which speeds up the login process for people who prefer to use Google
- A "Show Password" feature lets me reflect the current password I typed so I don't have to remember it blindly

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

### Onboarding Page (added Sprint 2)
No wireframe. A 3-step preferences wizard (Interests / Food / Location + Privacy)
that is the second half of registration. The Supabase account is created only when
the user finishes this wizard, so abandoning it leaves no account behind.

### Login Page
![Login page wireframe](wireframes/login_page_wireframe.png?raw=true "Login Page")

### Reset Password Page (added Sprint 3)
No wireframe. Handles the Supabase password-recovery flow. Reached from the login
page's "Forgot password?" link; only unlocks the form on a genuine recovery event.

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

> **As built (August 2026):** the reference below matches the live Prisma schema
> (`backend/prisma/schema.prisma`). The model grew well past the original three
> tables. Notable evolutions from the original plan:
> - `Itinerary.likeCount` was **removed** (computed live from `Like` rows).
> - The **Pin/ItineraryStop split** completed (July 2026): `Pin` is now a
>   venue-only catalog and `ItineraryStop` holds each scheduled visit.
> - `Itinerary` now **persists the trip constraints** it was generated from
>   (date, time window, budget, travel radius, transport, and the computed
>   meeting point) so a saved itinerary is self-describing and editable (US #1, #7).
> - A new **`ItineraryMember`** table stores the group the itinerary was built
>   for (each member's name, start location, and preference tags), so group
>   interests/food/diets derive from members rather than being duplicated on the
>   itinerary (one source of truth).
> - A new **`Visited`** table backs the "mark as visited" feature and the
>   "Visited" dashboard carousel.
> - `User` gained **saved preferences** (interests, food, diets, default start
>   location) and an **`isPublic`** flag so a user can be found in the "add a
>   group member by username" search.
> - `ItineraryStop` gained a per-visit **`costPerPerson`** override so editing a
>   stop's cost never mutates the shared catalog venue.
> - `Pin` gained **`source`** and **`enrichedAt`** provenance columns for the
>   (designed) OpenStreetMap import + AI-enrichment pipeline.
> - Indexes were tuned: `Itinerary` uses a composite **`@@index([isPublic, createdAt])`**
>   (covers the Discover feed's filter+sort+paginate in one scan) plus
>   **`@@index([userId])`**; `Like`/`Visited` carry an `@@index([itineraryId])`.

### User
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| authUserId | String | @unique, the Supabase Auth user id (UUID) this profile belongs to. Credentials (password) are owned by Supabase Auth, not stored here |
| email | String | @unique, mirrored from Supabase Auth for display/lookup; the source of truth for login is Supabase |
| username | String | @unique |
| avatarUrl | String? | Profile photo URL (uploaded via POST /users/:id/avatar to Supabase Storage, or pulled from the Google account on OAuth sign-up); null until set |
| createdAt | DateTime | @default(now()) |
| isPublic | Boolean | @default(false), whether this profile is discoverable in the "add a group member by username" search. Only public profiles surface in GET /users/search |
| interestTags | String[] | @default([]), the user's saved interest tags, collected in onboarding and editable on the account page |
| foodPrefs | String[] | @default([]), saved cuisine/food preferences |
| diets | String[] | @default([]), saved dietary requirements |
| defaultStartLabel | String? | Saved default starting-location label (human-readable address) |
| defaultStartLat | Float? | Latitude of the saved default starting location |
| defaultStartLng | Float? | Longitude of the saved default starting location |
| createdItineraries | Itinerary[] | @relation("CreatedItineraries") |
| likes | Like[] | Join rows for the itineraries this user has liked (US #11) |
| bookmarks | Bookmark[] | Join rows for the itineraries this user has bookmarked (US #9, #11) |
| visited | Visited[] | Join rows for the itineraries this user has marked as visited |

> The saved preferences mirror `ItineraryMember`'s shape so a public user's saved
> prefs can be snapshotted into a new group member as an independent copy when a
> host adds them by username (the member is a copy, not a live link).

### Itinerary
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| userId | Int | Foreign key → User.id |
| sourceItineraryId | Int? | Foreign key → Itinerary.id. Null for original itineraries; set when this itinerary is a saved copy of another. |
| title | String | |
| location | String | Human-readable city/area label (e.g. "San Francisco, CA") shown on itinerary cards and used to search/filter itineraries by location on the Discover page (US #9) |
| description | String? | Short overview text shown in the itinerary header (<Description>). Generated by the AI sequencing step; editable later via PUT /itineraries/:id (US #7) |
| coverImageUrl | String? | Cover image shown in the itinerary header (<CoverImage>). Set in the wizard's Finish step, either an uploaded image or an AI-generated banner, and editable later via PUT /itineraries/:id (US #7) |
| isPublic | Boolean | @default(false) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| tripDate | DateTime? @db.Date | The calendar day the itinerary is for. Nullable: older rows and manually-created itineraries may have none |
| dayStart | String? | Requested window start, "HH:MM" |
| dayEnd | String? | Requested window end, "HH:MM" (a value < dayStart means the day runs overnight) |
| maxBudgetPerPerson | Float? | The per-person budget cap the organizer entered (US #1). Recomputed as the sum of the stops' effective per-person costs |
| travelRadius | Float? | Miles; the radius the day was optimized within (US #3) |
| transport | String? | walking / biking / transit / driving |
| meetingPointLat | Float? | Latitude of the computed geometric-median group anchor (US #3) |
| meetingPointLng | Float? | Longitude of the computed group anchor |
| creator | User | @relation("CreatedItineraries", fields: [userId], references: [id], onDelete: Cascade) |
| likes | Like[] | Join rows for the users who have liked this itinerary. The like count is computed live from these via Prisma `_count` (exposed as `likeCount` in API responses), there is no stored counter column |
| bookmarks | Bookmark[] | Join rows for the users who have bookmarked this itinerary |
| visited | Visited[] | Join rows for the users who have marked this itinerary as visited |
| members | ItineraryMember[] | The group the itinerary was built for (source of truth for group interests/food/diets, so they are not duplicated on the itinerary) |
| sourceItinerary | Itinerary? | @relation("ForkedItinerary", fields: [sourceItineraryId], references: [id], onDelete: SetNull) |
| savedCopies | Itinerary[] | @relation("ForkedItinerary"), copies other users made of this itinerary |
| stops | ItineraryStop[] | Ordered visits to venues |

> **As built:** the trip constraints (date, time window, budget, radius, transport,
> meeting point) that the original Sprint-1 decision kept off the model were added
> back so a saved itinerary is self-describing (US #1 budget display) and fully
> editable (US #7), see the Sprint 4 Decision Log entry. All are nullable because
> older and manually-created itineraries may lack them.

**Model Constraints**
- `@@index([isPublic, createdAt])`, the Discover default feed filters on `isPublic` and orders by `createdAt DESC` with pagination; one index-ordered scan covers filter, sort, and pagination (replaces the earlier bare `[isPublic]` index, which couldn't help the sort).
- `@@index([userId])`, backs `scope=mine`, the "Created" dashboard filter, and the cascade delete.

### Pin

> **As built (July 2026):** `Pin` is now the **venue catalog**, one row per real SF
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
| source | String? | Provenance: null/`'curated'` for hand-curated venues, `'osm'` for the bulk OpenStreetMap import. Lets the enrichment job target only un-enriched OSM rows |
| enrichedAt | DateTime? | Stamped when the AI enrichment job fills an OSM venue's rating/tags, so the job stays idempotent and resumable; null until enriched |
| stops | ItineraryStop[] | All itinerary visits to this venue |

**Model Constraints**
- None. Venues are seeded once and reused across itineraries. `category` defaults to `'activity'`.

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
| costPerPerson | Float? | Per-visit cost override. When set, this stop costs this value instead of the venue Pin's shared `pricePerPerson`, so editing a stop's cost never mutates the shared catalog venue. Null means fall back to the venue price. The itinerary's `maxBudgetPerPerson` is the sum of the effective per-stop costs |
| travelTimeToNextMinutes | Int? | Estimated travel time (in minutes) to the next stop (US #3). Null for the last stop |
| distanceToNextMeters | Float? | Estimated distance (in meters) to the next stop (US #3). Null for the last stop |
| mealType | String? | `'breakfast'`, `'lunch'`, or `'dinner'` when applicable |
| note | String? | User-editable free-text note for this stop |
| pin | Pin | @relation(fields: [pinId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@unique([itineraryId, orderInItinerary])`, Ensures that each stop has a unique position within an itinerary.
- `@@index([pinId])`, backs the Discover interest-filter join (stops → pin) and the delete-check on `Pin`.

### Like
| Attribute | Type | Additional Info |
| --- | --- | --- |
| userId | Int | Foreign key → User.id |
| itineraryId | Int | Foreign key → Itinerary.id |
| createdAt | DateTime | @default(now()), when the user liked the itinerary; enables recency ordering |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@id([userId, itineraryId])`, Composite primary key; a user can like a given itinerary at most once (dedupe). These rows are the single source of truth for the like count (computed live via `_count`; no cached counter).
- `@@index([itineraryId])`, the composite PK is ordered by `userId`, so an itineraryId-only lookup can't use it; this backs the per-itinerary like count and the "popular" sort.

### Bookmark
| Attribute | Type | Additional Info |
| --- | --- | --- |
| userId | Int | Foreign key → User.id |
| itineraryId | Int | Foreign key → Itinerary.id |
| createdAt | DateTime | @default(now()), when the user bookmarked the itinerary; enables recency ordering |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@id([userId, itineraryId])`, Composite primary key; a user can bookmark a given itinerary at most once (dedupe).

### Visited

> **Added July 2026.** Backs the "mark as visited" toggle and the "Visited"
> dashboard carousel. Unlike Like/Bookmark, the timestamp is updatable, re-marking
> an itinerary as visited refreshes it.

| Attribute | Type | Additional Info |
| --- | --- | --- |
| userId | Int | Foreign key → User.id |
| itineraryId | Int | Foreign key → Itinerary.id |
| visitedAt | DateTime | @default(now()) @updatedAt, refreshed on every (re-)mark |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@id([userId, itineraryId])`, Composite primary key; a user can have at most one visited row per itinerary.
- `@@index([itineraryId])`, mirrors Like's index; backs the cascade delete from Itinerary.

### ItineraryMember

> **Added July 2026.** One member of the group an itinerary was built for. Captures
> the per-person inputs the create wizard collects so a saved itinerary can show
> and edit who was in the group and what they wanted, not just the group-level
> aggregate. Cascade-deleted with the parent itinerary; intentionally NOT copied
> when an itinerary is forked via POST /itineraries/:id/copy.

| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| itineraryId | Int | Foreign key → Itinerary.id |
| name | String | The member's display name |
| startLabel | String? | Human-readable starting address the picker resolved; nullable |
| startLat | Float? | Latitude used by the meeting-point math; nullable |
| startLng | Float? | Longitude used by the meeting-point math; nullable |
| interestTags | String[] | This member's chosen interests |
| foodPrefs | String[] | This member's food/cuisine preferences |
| diets | String[] | This member's dietary requirements |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id], onDelete: Cascade) |

**Model Constraints**
- `@@index([itineraryId])`, backs loading a saved itinerary's members and the cascade delete.

## Endpoints

> **As built (August 2026):** the endpoints below match the live Express routes
> (`backend/routes/*.js`, mounted in `backend/index.js`). The biggest changes from
> the original plan: registration/login moved onto NavQuest's own
> `POST /users/register|login|oauth` (Supabase is called server-side, so the
> client never talks to Supabase Auth for password sign-in); the `Pin` CRUD
> endpoints became **`/stops`** (a stop is a scheduled visit; there is also a
> `GET /stops` venue-catalog search); a standalone **`POST /recommendations`**
> exposes the deterministic engine that feeds `POST /ai-agent`; and several new
> endpoints landed (visited, cover-image upload, PDF-email export, AI banner,
> user search, saved preferences, avatar). All endpoints require a signed-in user
> except `POST /users/register|login|oauth` and `GET /users/availability`.

### Users

POST /users/register - Create a Supabase Auth account and its app-side profile
- User story: 13
- Request: { email, password, username }
- Response (201): { user, session }, the password is handled entirely by Supabase Auth; NavQuest never stores it (US #13)
- Errors: 400 if a field is missing, 409 if the email or username is already taken

POST /users/login - Sign in with email + password
- User story: 13
- Request: { email, password }, verified against Supabase Auth server-side
- Response (200): { user, session }
- Errors: 400 if a field is missing, 401 if the credentials are invalid

POST /users/oauth - Provision the app profile after a browser OAuth (Google) sign-in
- User story: 13
- Description: After the browser completes the Google handshake with Supabase, this find-or-creates the matching app profile (deriving a username from the email and saving the Google avatar). Authenticated by the OAuth access token.
- Response (200 existing / 201 created): { user }

GET /users/availability - Public pre-check for taken email/username
- User story: 13
- Query: ?email= &?username=
- Response (200): { emailTaken, usernameTaken }

GET /users/search - Search public users to add as a group member
- User stories: 4, (create-wizard support)
- Description: Substring match over the username of PUBLIC profiles (and the caller's own), so a host can pre-fill a group member from another user's saved preferences. Capped at 10 results; requires at least one character.
- Query: ?username=
- Response (200): { users: [ preference snapshots ] }, never exposes private profiles

GET /users/:id - Get a user's dashboard information
- User story: 15
- Response (200): { id, username, email, createdAt, createdItineraries, bookmarkedItineraries, likedItineraries, visitedItineraries }
- Note: bookmarkedItineraries backs the dashboard's "Bookmarked" section (read-only references); saved copies are owned itineraries and appear within createdItineraries; visitedItineraries backs the "Visited" carousel
- Note: this is the owner's private dashboard (US #15); a user may only fetch their own record
- Errors: 401 if not signed in, 403 if the id is not the authenticated user, 404 if not found

PUT /users/:id - Update a user's information
- User story: 14
- Request: { username } (optional), email and password changes go through Supabase Auth (see the password endpoint below), not this route
- Response (200): the changed fields
- Errors: 400 if improperly structured, 401 if not signed in, 403 if the profile is not the caller's, 404 if not found

GET /users/:id/preferences - Get the owner's saved preferences
- User story: 14
- Response (200): { isPublic, interestTags, foodPrefs, diets, defaultStartLocation }
- Errors: 401/403/404 as above (owner-only)

PUT /users/:id/preferences - Update the owner's saved preferences
- User story: 14
- Request: any subset of { isPublic, interestTags, foodPrefs, diets, defaultStartLocation }
- Response (200): the updated preferences
- Errors: 401/403/404 as above (owner-only)

POST /users/:id/avatar - Upload a profile photo
- User story: 14
- Request: multipart file (≤5MB; PNG/JPEG/WebP, verified by magic bytes) → Supabase Storage
- Response (200): { avatarUrl }
- Errors: 400 if the file is missing or not an accepted image, 401/403 as above

POST /users/:id/password - Change the account password
- User story: 14
- Description: Re-verifies the current password via Supabase before setting the new one
- Request: { currentPassword, newPassword }
- Response (200): success
- Errors: 400 if the new password is invalid, 401 if the current password is wrong, 403 if not the caller's account

### Itineraries

POST /itineraries - Create a new itinerary
- User stories: 8, 11
- Note: In the built flow the create wizard does NOT call this directly, it calls POST /ai-agent, which persists the generated itinerary. This route persists a caller-supplied itinerary + stops.
- Request: { title, location, description, coverImageUrl, isPublic, pins }, each pin: { pinId, orderInItinerary, startTime, endTime, mealType?, note?, travelTimeToNextMinutes?, distanceToNextMeters? }
- Response (201): the created itinerary with its ordered stops
- Errors: 400 if fields are missing or wrongly structured, 401 if not signed in

GET /itineraries - List itineraries (Discover feed + dashboard lists)
- User stories: 9, 11
- Request (all query params optional): ?q= (free-text over title/location/author username), ?location= (filter by location label), ?interests= (comma-separated; matches itineraries whose stops' venues share any interest/cuisine/diet tag), ?scope= ("mine" | "public"; defaults to "public"), ?sort= ("recent" | "popular"; defaults to "recent"), ?limit= & ?offset= (pagination)
- Note: with no q/location/interests and scope=public, this returns recently made public itineraries, the default Discover feed (US #9)
- Response (200): [ { id, sourceItineraryId, createdAt, updatedAt, title, location, description, coverImageUrl, creator, isPublic, likeCount, stops } ]
- Errors: 400 if a query param is malformed, 401 if not signed in

GET /itineraries/:id - Get a single itinerary
- User stories: 9, 11
- Response (200): { id, sourceItineraryId, createdAt, updatedAt, title, location, description, coverImageUrl, maxBudgetPerPerson, tripDate, dayStart, dayEnd, travelRadius, transport, meetingPoint, creator, isPublic, likeCount, stops }, the owner additionally receives the members list
- Errors: 401 if not signed in, 403 if a private itinerary the caller does not own, 404 if not found

PUT /itineraries/:id - Update an itinerary
- User stories: 7, 8
- Request: { title, location, description, coverImageUrl, maxBudgetPerPerson, tripDate, dayStart, dayEnd, travelRadius, transport, isPublic } (all optional, owner-only)
- Response (200): the changed fields
- Note: stop-level edits go through the /stops endpoints and the reorder endpoint below; the like count is not editable here
- Errors: 401 if not signed in, 403 if not the owner, 404 if not found

PUT /itineraries/:id/stops/order - Reorder an itinerary's stops
- User story: 7
- Description: Owner-only. Recomputes each stop's start/end times and travel legs for the new order.
- Request: { stopIds: [...] }, must be exactly the itinerary's current set of stop ids
- Response (200): the reordered stops
- Errors: 400 if stopIds is not the exact current set, 401/403/404 as above

DELETE /itineraries/:id - Delete an itinerary
- User story: 12
- Response (204): none (cascades to stops, members, likes, bookmarks, visited)
- Errors: 401 if not signed in, 403 if not the owner, 404 if not found

POST /itineraries/:id/like, DELETE /itineraries/:id/like - Like / unlike
- User story: 11
- Description: Adds/removes the caller's Like row. Idempotent. Returns the current like count (computed live from the Like rows).
- Response (200): { likeCount }
- Errors: 401 if not signed in, 404 if not found

POST /itineraries/:id/bookmark, DELETE /itineraries/:id/bookmark - Bookmark / remove bookmark
- User stories: 9, 11
- Description: Adds/removes a read-only reference in the caller's "Bookmarked" list. Idempotent.
- Response (204): none
- Errors: 401 if not signed in, 403 if the itinerary is not public (on add), 404 if not found

POST /itineraries/:id/visited, DELETE /itineraries/:id/visited - Mark / unmark visited
- User story: 11
- Description: Adds/removes the caller's Visited row so the itinerary appears in their "Visited" carousel. Idempotent; re-marking refreshes the timestamp.
- Response (204): none
- Errors: 401 if not signed in, 404 if not found

POST /itineraries/:id/copy - Save an editable copy of an itinerary
- User stories: 9, 11
- Description: Deep-duplicates the itinerary and its stops into a new private itinerary owned by the caller, with sourceItineraryId set to the original. Members are intentionally NOT copied. Appears in the caller's "Created" list.
- Response (201): the created copy
- Errors: 401 if not signed in, 403 if the source is not public and not owned, 404 if not found

POST /itineraries/:id/cover, DELETE /itineraries/:id/cover - Set / remove the cover image
- User story: 7
- Description: Uploads a cover image (multipart, ≤15MB, raised to fit AI-generated banners) to Supabase Storage, or removes the stored object and nulls the URL.
- Response (200 on upload with { coverImageUrl }, 204 on delete)
- Errors: 400 if the file is missing/invalid, 401/403/404 as above (owner-only)

POST /itineraries/:id/export/email - Email a PDF of the itinerary
- User story: 5 (share)
- Description: Any viewer of a visible itinerary (public, or one they own) can email a branded PDF to an ad-hoc list of addresses. Builds one PDF (see the Export feature) and sends one personalized message per recipient.
- Request: { emails: [...] }, trimmed, lowercased, deduped, validated
- Response (200): { sent: [...], failed: [...] }
- Errors: 400 if no valid emails, 404 if the itinerary is not visible to the caller, 502 if every send fails

### Stops

> **As built:** these replace the planned `/pins` CRUD. A "stop" is a scheduled
> visit (an `ItineraryStop`); `GET /stops` searches the shared venue catalog
> (`Pin`) so a user can pick a place to add.

GET /stops - Search / browse the venue catalog
- User stories: 3, 7
- Description: Browse the shared catalog to pick a venue to add to an itinerary
- Query: ?q= (name search), ?category= (restaurant | activity), ?limit= (≤50), ?offset=, and optional ?lat= &?lng= &?radius= (miles; all-or-none) to filter to venues within the group's travel radius
- Response (200): [ catalog venues ], each carries distanceMi when geo-filtered
- Errors: 400 if the geo params are partial or invalid, 401 if not signed in

GET /stops/:id - Get a single stop (with its venue)
- User stories: 3, 5
- Response (200): the stop plus its venue details
- Errors: 401 if not signed in, 403 if the parent itinerary is private and not owned, 404 if not found

POST /stops - Add a stop to an itinerary
- User stories: 1, 2, 3, 4, 7, 10
- Description: Owner-only. References an existing catalog venue by pinId, or creates a new catalog venue inline. Recomputes the itinerary's budget.
- Request: { itineraryId, orderInItinerary, startTime, endTime, pinId? , mealType?, note?, travel/distance?, and venue fields when creating inline }
- Response (201): the created stop
- Errors: 400 if required fields are missing, 401 if not signed in, 403 if the caller does not own the itinerary, 404 if the itinerary is not found

PUT /stops/:id - Update a stop
- User story: 7
- Description: Owner-only edits to the visit: timing, per-person cost, travel fields, meal type, note. Rejects times that overlap another stop.
- Request: { orderInItinerary, startTime, endTime, costPerPerson, travelTimeToNextMinutes, distanceToNextMeters, mealType, note } (all optional)
- Response (200): the changed fields
- Errors: 400 if wrongly structured, 401 if not signed in, 403 if not the owner, 404 if not found, 409 if the times overlap another stop

DELETE /stops/:id - Delete a stop from an itinerary
- User story: 7
- Response (204): none (recomputes the itinerary's budget)
- Errors: 401 if not signed in, 403 if not the owner, 404 if not found

### Recommendations

POST /recommendations - Build a ranked shortlist of real places from group constraints  **(BUILT)**
- User stories: 1, 2, 3, 4, 10
- Description: The deterministic recommendation engine (see "Recommendation Engine" below). Runs hard filters (relevance, diet, budget, hours, meeting point + travel radius) then soft scoring, and returns the shortlist plus the resolved constraints that POST /ai-agent consumes. No AI is involved here.
- Request: { trip, members }, trip carries startTime/endTime (HH:MM), maxBudgetPerPerson, and optional travelRadius, transport, includeMeals; members is a non-empty list, each { name, startLocation: { lat, lng }, interestTags?, foodPrefs?, diet? }
- Response (200): { shortlist, constraints }, or, when nothing matches, 200 with an empty shortlist and a `reason` hint the frontend surfaces (not an error)
- Errors: 400 if trip/members fail validation, 401 if not signed in

### AI Agent

POST /ai-agent - Sequence and persist a one-day itinerary from a shortlist  **(BUILT)**
- User stories: 1, 2, 3, 5, 6, 10
- Description: Takes the recommendation engine's output and has the AI sequence it into an ordered one-day itinerary (see "Itinerary Sequencing" below), then persists it for the caller.
- Request: { shortlist, constraints, tripDate?, isPublic?, title?, description?, members? }
- Response (200): { itinerary (saved, with id + ordered stops), source: "ai" | "fallback", budget: { totalPerPerson, maxBudgetPerPerson, overBudget, overBudgetBy } }. Stops are identified by pinId; place details and cost are re-hydrated from the shortlist by pinId when persisting, so the AI can neither invent nor misprice a place
- Errors: 200 with { feasible: false, reason } if no feasible day fits, 400 if the shortlist/constraints are missing or malformed, 401 if not signed in

POST /ai-agent/banner - Generate an AI cover-image banner  **(BUILT)**
- User story: 6 (visual itinerary), 7 (cover editing)
- Description: Generates a wide travel-banner cover image from the itinerary's title/location/description plus an optional free-text style request (see "Banner Generation" below). The image is returned to the browser and only uploaded (via POST /itineraries/:id/cover) if the user keeps it, nothing is persisted server-side here.
- Request: { title?, location?, description?, promptText? }
- Response (200): { image (base64), mediaType: "image/png" }
- Errors: 400 if the input fails content moderation (fails closed), 401 if not signed in, 429 if the per-user rate limit (10/hour) is exceeded

> **Not built:** `POST /ai-agent/edit` (natural-language itinerary editing) was
> designed but never implemented, manual editing is done through the /stops
> endpoints and the reorder endpoint instead. See the AI Feature Specification.

## State Architecture

> **As built:** server data (itineraries, dashboard lists, catalog) is managed by
> **TanStack React Query**, a shared cache keyed by query, with optimistic updates
> for like/bookmark/visited/privacy, rather than the hand-rolled `useState` lists
> sketched below. Auth/session lives in a context off the Supabase client. The
> sketch below is kept as the original design intent; the wizard state in
> particular changed the most (it now collects a list of group **members**, each
> with their own preferences, instead of one flat preference object).

```jsx
// Global (auth/session context, from the Supabase client)
const { currentUser, session } = useAuth();

// Server data via React Query (cached, not local useState):
//   useItineraries({ scope, q, location, interests, sort })  // Discover + dashboard
//   useItinerary(id)                                         // single itinerary
//   useDashboard(userId)  // created / bookmarked / liked / visited lists
//   useCatalogSearch({ q, category, lat, lng, radius })      // GET /stops

// Local to Itinerary wizard component (CreateItineraryPage)
const [form, setForm] = useState({
      // Step 1, Trip Basics
      tripDate: null,
      dayStart: null,             // "HH:MM" window start
      dayEnd: null,               // "HH:MM" window end
      transport: "",              // walking | biking | transit | driving
      includeMeals: { breakfast, lunch, dinner },
      travelRadius: null,         // miles
      maxBudgetPerPerson: 25,     // per person (slider default)
      // Step 2, Members (list; member 1 is pre-seeded with the signed-in user)
      members: [ { name, startLocation: {label, lat, lng},
                   interestTags: [], foodPrefs: [] } ],
      // Step 3, Finish
      title: "", description: "", coverImageUrl: null, isPublic: false,
    });
const [currentWizardStep, setCurrentWizardStep] = useState(1);

// Local to Itinerary page
const [currentStop, setCurrentStop]                       = useState(null);
const [isEditing, setIsEditing]                           = useState(false);
```

## Component Hierarchy

> **As built:** the tree below is the original design and is still broadly
> accurate, with these Sprint-2→4 additions:
> - **Two new pages.** `OnboardingPage` (a 3-step preferences wizard, Interests /
>   Food / Location+Privacy, that forms the second half of registration; the
>   account is only created on Finish) and `ResetPasswordPage` (Supabase
>   password-recovery flow, reached via the login page's "Forgot password?" link).
> - **Create wizard is 3 steps:** Trip Basics / Members / Finish. Step 2 collects a
>   list of group members (each a `MemberCard` with name, one start location,
>   interests, and food prefs) and includes a `UserSearch` to add a public user by
>   username. Step 3 has a `BannerGeneratorModal` for AI cover images.
> - **Itinerary page** adds owner edit mode (add/edit/delete/drag-reorder stops),
>   a `VisitedButton`, and an `ExportModal` (email a PDF + copy to clipboard). The
>   map is Leaflet/react-leaflet.
> - **Account page** adds a `PreferencesSection` (edit saved interests/food/diets/
>   default location), a public/private profile toggle, and avatar upload.
> - **Home dashboard** has five carousels: Explore, Created, Liked, Bookmarked,
>   Visited.

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
│   │       │   │   └── <ShowPasswordToggle>   "Show Password"
│   │       │   ├── <SubmitButton> "Log in"
│   │       │   └── <GoogleLoginButton>        "Continue with Google"
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
│   │       │   │   └── <ShowPasswordToggle>   "Show Password"
│   │       │   ├── <ErrorMessage>            (only if a submit error occurs)
│   │       │   ├── <ConfirmationMessage>     (only on successful register, e.g. "check your email")
│   │       │   ├── <SubmitButton> "Register"
│   │       │   └── <GoogleLoginButton>        "Continue with Google"
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
│   │   │   │   ├── <SaveButton> (owner only, save edits)
│   │   │   │   ├── <BookmarkButton> (non-owner, bookmark to "Saved Itineraries", read-only)
│   │   │   │   ├── <SaveCopyButton> (non-owner, save an editable copy to "Created Itineraries")
│   │   │   │   ├── <LikeButton> (any signed-in user, toggle like)
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
│   │   └── <RecentItinerariesSection>    (shown when no query, US #9)
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

NavQuest ships **two AI features**: itinerary sequencing (`POST /ai-agent`) and
cover-image banner generation (`POST /ai-agent/banner`). The place selection
underneath stays **deterministic**, a rule-based recommendation engine
(`POST /recommendations`) picks and ranks real places from our database, so the
AI never chooses, invents, or misprices a place. The AI is a language/vision layer
on top of that engine.

**Provider.** Text model calls go through the OpenAI SDK against one of two
backends, chosen by which key is set: the **Salesforce internal model gateway**
(model `claude-sonnet-4-5-20250929`) when `AI_KEY` is set, or **OpenAI directly**
(model `gpt-5-mini` by default) when `OPEN_AI_API_KEY` is set. Both speak the same
chat-completions wire format. The direct-OpenAI defaults (`gpt-5-mini`, low
reasoning effort, a 30s per-attempt timeout, one retry) were tuned in Sprint 4 so
the worst case stays under the deployed proxy's ~100s request cap and the
deterministic fallback can still return. Banner/moderation calls always use OpenAI
directly (`gpt-image-1` and `omni-moderation-latest`). Every text response is
asked to return JSON, validated, and backed by a deterministic non-AI fallback so
the app never hard-fails.

### Recommendation Engine (POST /recommendations): BUILT, deterministic (no AI)

Selects and ranks the real places the AI will later sequence. Pure and rule-based.

- User stories: 1, 2, 3, 4, 10
- Description: Given the trip constraints and the group's members, filters the
  venue catalog down to a ranked shortlist plus the resolved constraints.
- Input: { trip, members }
- Output: { shortlist, constraints } (an empty shortlist returns a `reason` hint)
- Behavior:
    - Stage 0: computes the group **meeting point** as the geometric median of the
      members' start coordinates, snapped to the nearest catalog place.
    - Hard filters: interest/cuisine relevance, dietary needs, budget sanity,
      opening hours, and a travel-radius cut around the meeting point. Missing data
      (unknown price/hours) is flagged, never silently dropped.
    - Soft scoring: weighted blend of group-coverage (0.45), interest intensity
      (0.28), quality/rating (0.19), and budget value (0.08).
    - Fairness passes ensure every member, diet, and food preference is represented,
      and a food-quota floor keeps enough restaurants for the meal slots.
    - An `enrichMissing` seam exists for a future Google Places pass but is a
      documented **no-op** today, the engine ranks on the seeded/imported data alone.

### Banner Generation (POST /ai-agent/banner): BUILT

Generates a wide travel-banner cover image for an itinerary from its details plus
an optional free-text style request. Supports US #6 (a visual, shareable itinerary)
and the cover-editing part of US #7.

- User stories: 6, 7
- Description: In the create wizard's Finish step (or when editing a cover), the
  user can generate an AI cover image instead of uploading one. The image is
  returned to the browser and only uploaded (via `POST /itineraries/:id/cover`) if
  the user keeps it, nothing is persisted server-side by this route.
- Input: { title?, location?, description?, promptText? }
- Output: { image (base64 PNG), mediaType }
- Model: `gpt-image-1`, 1536x1024 landscape
- Behavior:
    - The prompt is a fixed scaffold ("wide landscape travel banner, no text/logos")
      with the user's style text in the middle and an anti-injection guard clause
      appended last, so user input can never be the final instruction the model reads.
    - **Content moderation runs first and fails closed:** any flag, or any error
      from the moderation call, blocks the image call and returns a 400.
    - Rate limited to 10 generations per hour per user.

### Itinerary Sequencing (POST /ai-agent): BUILT

Organizes a shortlist of real, pre-ranked places into a sensible one-day
itinerary. The AI sequences only, it does not choose or invent places.

- User stories: 1, 2, 3, 5, 6, 10
- Description: Receives the recommendation engine's shortlist plus the group's
  constraints and returns an ordered day to be stored and rendered.
- Input: { shortlist (places with id, category, tags, coordinates, pricePerPerson, openingHours), constraints (timeWindow, maxBudgetPerPerson, groupSize, meetingPoint, travelRadius, transport) }
- Output (200): a structured JSON itinerary, a generated title, location label, and short description for the overall day, plus ordered stops identified by pinId with arrive/depart times and travel time + distance to the next stop. A stop carries no cost or place details; name, coords, image, and pricePerPerson are re-hydrated from the shortlist by pinId when persisting
- Behavior:
    - Anchors the day near the meetingPoint, orders stops by geography, inserts meal stops at meal times, and respects each place's opening hours and the itinerary's time window
    - Uses only pinId values from the provided shortlist, no hallucinated places
    - Keeps total per-person cost within maxBudgetPerPerson (the shortlist is pre-trimmed to fit); if no feasible day fits, returns a "constraints too tight" message instead of an itinerary
    - Validates every response against the rules above. A well-formed but rule-breaking day (over budget, gaps, bad meal placement) is re-asked up to two rounds with the exact errors fed back before giving up
    - If the AI call fails or its output fails validation after retries, the system falls back to a deterministic sequencer (nearest-neighbor ordering, meal reservation, clock walk) so an itinerary is always produced. The response reports `source: "ai" | "fallback"`
    - Output text is post-processed to 12-hour times and stripped of em/en dashes

### Offline OSM Tag Enrichment: DESIGNED, run out-of-band (not in the live app)

> A batch enrichment script (`backend/scripts/enrich/aiEnrichVenues.mjs`) exists
> and uses the same AI gateway to classify the bulk OpenStreetMap venues' rating,
> tags, and description against a fixed vocabulary. It runs offline against the
> database (idempotent/resumable, dry-run by default), never at request time. The
> ~405 hand-curated places are tagged by hand and need no enrichment. This was the
> planned path to make the ~4,000 OSM venues usable; the shipped app runs on the
> hand-curated catalog (see the Milestone 2 note and the data-sourcing summary).

### Natural-Language Itinerary Editing: NOT BUILT (future)

> Designed, not implemented, there is no `/ai-agent/edit` route today. Clear next
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
    - The AI only translates the request into constraint changes (budget, radius, add/remove interests), it never edits the list of places directly
    - Because the revised constraints are re-run through the deterministic engine, every place in the result remains real and validated
    - Ambiguous requests leave the itinerary unchanged and prompt the user to clarify

## AI Feature Decisions Log

| Decision | Sprint | What Changed | Why|
| --- | --- | --- | --- |
| LLM provider | 2 | OpenRouter → **Salesforce internal model gateway** (OpenAI SDK, `claude-sonnet-4-5`) | The gateway we had reliable, keyed access to; same OpenAI-SDK shape |
| AI scope trimmed | 2 | Stops carry **only** pinId + times + travel; no place details or cost | Cost/details are re-hydrated from the shortlist by pinId, so the AI can't invent or misprice a place |
| Fallback | 2 | Added a **deterministic sequencer** fallback (`services/ai/fallback/`) | An itinerary is always produced even if the AI call/validation fails |
| Validation retry loop | 2 | Re-ask the model up to 2 rounds with its own rule violations fed back | Cheaply fixes a well-formed but over-budget/gappy day before falling back |
| Tag enrichment path | 2 | Live enrichment dropped; kept an **offline batch script** (`scripts/enrich/aiEnrichVenues.mjs`) instead | Hand-curated catalog needs none; the script is only for the bulk OSM import, run out-of-band |
| NL editing deferred | n/a | `POST /ai-agent/edit` **not built** | Out of MVP scope; designed for later, reuses the deterministic engine |
| Dual provider + tuned defaults | 4 | Client picks **Salesforce gateway (`claude-sonnet-4-5`)** or **OpenAI direct (`gpt-5-mini`, low reasoning, 30s timeout, 1 retry)** by which key is set | The deployed backend sits behind a ~100s proxy cap; the tuned defaults keep worst-case latency under it so the fallback can still return |
| AI banner generation shipped | 4 | Added `POST /ai-agent/banner` (`gpt-image-1`, 1536x1024) with input moderation (fail-closed), an anti-injection prompt guard, and a 10/hour per-user rate limit | Gives users a one-tap visual cover (US #6) without hunting for a stock image; moderation + guard keep a public cover image safe |
| AI text cleanup | 4 | Post-process generated itinerary text to 12-hour times and strip em/en dashes | Bug-bash feedback: military time and dashes read as robotic/AI-generated |

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

> **As built:** the shipped app runs on a **hand-curated static SF dataset** of
> ~405 real places (`backend/prisma/data/sfPlaces/`, loaded by
> `scripts/seedSfPlaces.js`), not a live OSM/Overpass pull. A bulk OpenStreetMap
> import (~3,993 NorCal venues, `osmVenues.generated.js`) was parsed and prepared
> with an AI-enrichment script for scale, but is **not wired into the active seed**
> it stays as prepared data for a future larger catalog. Maps use
> **Leaflet/react-leaflet** on the frontend, rendering CARTO Voyager raster tiles
> built on OpenStreetMap data (not MapLibre, not a raw OSM tile server).

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
- Implement the stop endpoints (POST /stops, PUT /stops/:id, DELETE /stops/:id, plus PUT /itineraries/:id/stops/order to reorder) so users can add, edit, remove, or reorder individual stops within an itinerary. **As built:** these replaced the planned `/pins` CRUD (a "stop" is a scheduled visit; `GET /stops` searches the venue catalog).
- Make sure all pages are responsive and usable on mobile devices
- Deploy the frontend, backend, and database so the app is publicly accessible

Checkpoint:
- A user can edit a saved itinerary and its stops
- A user can delete an itinerary and it no longer appears in their dashboard
- The app is fully usable on mobile screen sizes
- The app is deployed and accessible online

Stretch Goals:
- Google Places enrichment to fill in ratings, price level, and reliable hours for recommended places
  - **As built:** not pursued, the hand-curated static dataset already carries real ratings and prices, so enrichment was unnecessary. A no-op `enrichMissing` hook remains in the recommendation engine for a future offline+cached pass.
- Natural-language itinerary editing (`POST /ai-agent/edit`), designed, not built (see AI Feature Specification).
- **AI cover-image banners**, **SHIPPED (Sprint 4)** as `POST /ai-agent/banner`. Was not in the original plan; added so users get a one-tap visual cover for their itinerary. See the AI Feature Specification.
- Split the overloaded `Pin` table into venue-only `Pin` + per-visit `ItineraryStop`, **SHIPPED (July 2026, Phases 1–5).** `Pin` now carries explicit `interests`/`cuisines`/`diets` fields and a per-day `hoursOpen` JSON column; `ItineraryStop` holds the scheduled visits. Reflected in the Data Model above.
- **Saved user preferences**, **SHIPPED (Sprint 4).** A logged-in user stores their own interests, food preferences, diets, and default start location (plain columns/arrays on `User`, no join), editable on the account page. A host can search public users (`GET /users/search`) and prefill a member card from their saved values as a snapshot copy (member info stays a copy, not a live link, per the Sprint-1 decision). Reflected in the User model and endpoints above.
- **Friend requests**, a `Friendship` join table so the user search could be gated to friends only rather than anyone opted-in. **NOT built**, the shipped version instead gates search on a per-user `isPublic` opt-in flag, which was simpler and enough for the MVP.

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

Decision 1:

Decision: Reversed the Sprint-1 call to keep trip constraints off the Itinerary model. We now persist the constraints an itinerary was generated from (date, time window, budget, travel radius, transport, and the computed meeting point) directly on the Itinerary row.

Context: Once we started building the edit feature (US #7), a saved itinerary that did not store its own budget or time window could not show the user what it was built for, and could not be re-edited without re-entering everything. The Sprint-1 decision itself flagged this as the likely trigger for adding the fields back.

Tradeoffs: Slightly more to store and keep in sync, but the itinerary is now self-describing and editable. Group interests/food/diets are deliberately NOT duplicated here: they live on the new ItineraryMember rows, so there is a single source of truth and no drift.

Decision 2:

Decision: Pivoted place data from a live OSM/Overpass pull to a hand-curated static SF dataset, and the map from MapLibre to Leaflet/react-leaflet.

Context: The Milestone 2 plan assumed a live OSM pull, but Overpass was unreliable for our request pattern and MapLibre was heavier than we needed. Recommendation quality depends far more on clean, well-tagged data than on data volume.

Tradeoffs: The catalog is SF-only and grows by hand, but every place is real, priced, and tagged, which made the recommendation engine's output trustworthy. We also prepared a bulk OSM import (~4,000 venues) plus an AI-enrichment script as a path to scale later, without wiring it into the shipped seed.

Decision 3:

Decision: Split the overloaded Pin table into a venue-only Pin catalog plus a per-visit ItineraryStop table.

Context: The original Pin held both the venue (name, coords, price) and the visit (order, times, travel), which meant editing one itinerary's stop could mutate a shared place, and the same venue could not be reused across itineraries cleanly.

Tradeoffs: A larger migration (done in phases), but venues are now reusable and a per-stop cost override means editing a stop never mutates the shared catalog.

# Sprint 3
## Spec Reconciliation: Bug Bash (Sprint 3)

### Spec audit owner(s)
Semir, Emmanuel, Dylan

### Sections reviewed
- Data model: ✅ spec matches running app 
- API contracts: ✅ spec matches running app
- State architecture: ✅ spec matches running app
- AI feature spec: ✅ spec matches running app
- Component behavior (from wireframes): ✅ spec matches running app

### Spec gaps found (behavior in the app not documented in the spec)
- For the login feature, users did not have access to seeing their password
- In the login feature, users were also forced to do manual login rather than a common third-party authentication service (i.e. Google)
- For the created itineraries, they are uneditable

### Implemented features that diverged from the spec
N/A, our specifications for the app matched what was expected during our Bug Bash. Our biggest problem during the Bug Bash was our intended behavior did not always align with our end user's desires (i.e. users struggled with remembering their password and did not like the AI-generated itinerary).

### Sections updated to reflect intentional changes
- Added a Google Authentication feature to add Third-Party login integration (which will speed up the login process for people who prefer to use Google)
- Added a "Show Password" feature to reflect the current password of the user
- Added the ability to edit itineraries

### Going into Sprint 4: is the spec an accurate description of the system?
Yes

# Sprint 4

Sprint 4 was the polish, deploy-hardening, and final-demo sprint. No new user
stories were started; the work was making the shipped MVP reliable and presentable.

Decision 1:

Decision: Support two AI providers behind one client and default the direct-OpenAI path to `gpt-5-mini` with low reasoning effort, a 30s per-attempt timeout, and one retry.

Context: The deployed backend sits behind a proxy with a ~100s request cap. Full `gpt-5`'s variable reasoning latency occasionally exceeded that cap, and the request was killed before the deterministic fallback could return anything at all.

Tradeoffs: `gpt-5-mini` is slightly less capable than full `gpt-5`, but sequencing a pre-ranked shortlist is a shallow structured task where the quality gap is small, and the tuned timings guarantee the fallback can always run in time. The stronger model is still one env var away (`OPENAI_MODEL=gpt-5`).

Decision 2:

Decision: Shipped AI cover-image banner generation (`POST /ai-agent/banner`), which was not in the original plan.

Context: Users wanted a visual, shareable cover but did not want to hunt for a stock image. This was a natural extension of the "visual itinerary" story (US #6).

Tradeoffs: A second, cost-bearing AI dependency (image generation), so we put it behind input moderation that fails closed, an anti-injection prompt guard, and a 10/hour per-user rate limit. Nothing is persisted server-side unless the user keeps the image.

Decision 3:

Decision: Export an itinerary as a branded PDF emailed to an ad-hoc list of addresses, plus a copy-to-clipboard plain-text summary, not a share limited to group members.

Context: The most common ask in the bug bash was simply "how do I send this to my friends?" Recipients rarely all have accounts, so tying export to registered members would have blocked the common case.

Tradeoffs: Sending email in production surfaced deploy-only bugs (SMTP port/secure settings, forcing IPv4 for the Gmail transport) that we had to fix against the live environment rather than locally.

Decision 4:

Decision: Clean up AI-generated itinerary text to 12-hour times and remove em/en dashes, and fix the create-wizard preview that still showed 24-hour military time.

Context: Bug-bash users read military time and dash-heavy phrasing as robotic and "obviously AI." Small wording and formatting changes made the output feel human.

Decision 5:

Decision: Stop tracking the AI-assistant scratch files (`.claude/`, `CLAUDE.md`, and the `ANIMATIONS.md` / `RECOMMENDATION_ENGINE.md` / superpowers design notes) in the repo; git-ignore them instead.

Context: These were development aids, not part of the shipped product, and they cluttered a repo meant to be read by reviewers.

Tradeoffs: This project plan previously linked to some of those files (e.g. `.claude/docs/*`); those links were removed here and the relevant "as built" details were folded directly into this document so the planning folder stays self-contained.

## Spec Reconciliation: Final (Sprint 4)

### Spec audit owner(s)
Emmanuel, Dylan, Semir

### Sections reviewed against the running app
- Data model: reconciled, added ItineraryMember, Visited, persisted trip constraints on Itinerary, saved preferences + isPublic on User, per-stop cost override, and Pin provenance columns.
- API contracts: reconciled, auth endpoints (register/login/oauth/availability), the `/pins` → `/stops` rename plus the catalog search and reorder endpoints, the standalone `/recommendations` endpoint, and the new visited / cover / export / banner / user-search / preferences / avatar endpoints.
- AI feature spec: reconciled, documented the shipped banner feature, the dual provider setup and its deploy-cap tuning, the validation retry loop, and the offline OSM enrichment script; confirmed `/ai-agent/edit` is still not built.
- State architecture: reconciled, noted React Query as the real server-state layer and the member-list wizard state.
- Component hierarchy / pages: reconciled, added the Onboarding and Reset Password pages and the Sprint-2→4 component additions.

### Last-minute changes and known gaps carried into the demo
- The register form ships with hardcoded default values (email/username/password) on purpose, to speed up the live demo. This is demo scaffolding, not intended for a real launch, and should be removed before any public sign-up.
- The bulk OSM catalog (~3,993 venues) and its AI-enrichment script are prepared but intentionally not wired into the active seed; the demo runs on the ~405 hand-curated places. Turning on the larger catalog is future work, not a regression.
- Natural-language itinerary editing (`POST /ai-agent/edit`) remains designed but unbuilt; manual editing via the `/stops` endpoints covers US #7 for the MVP.

### Is the spec an accurate description of the system?
Yes. After this reconciliation, project_plan.md matches the deployed app. A reader
can understand the system, its data model, endpoints, AI features, and screens , 
from the planning folder alone, without reading the source.
