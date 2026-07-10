# Project Plan

Pod Members: **Emmanuel, Dylan, Semir**
Pod Name: Team 404 not found

## Kanban Board

https://trello.com/invite/b/6a4be0e996e36198ef8b85ba/ATTI1326f85c29b362903c595c4b316e58dbD4986BF4/sed-capstone-planning 

## Problem Statement and Description

Young people in unfamiliar cities struggle to plan group outings, since aligning schedules, picking locations, and matching interests means tedious back-and-forth decision-making.

NavQuest is an AI-powered travel platform that generates personalized group itineraries, complete with mapped routes, per-activity timing, and transportation for each step.


## User Roles and Personas

User Role: 
Event Organizer

User Personas:
Maya is a college student originally from Texas who is interning in San Francisco for the summer. She has made plans to hang out with her fellow interns next weekend, but she and her friends are living in different parts of the Bay Area and cannot figure out a good place to meet or a list of activities that suits everyone's interests, since they are all new to California.

James is a full-time employee who wants to plan a social gathering with his coworkers. He needs to plan social gatherings like this every month, and he uses NavQuest for this monthly social gathering planning. Everyone in the group has a busy schedule, so James is having trouble finding a good time and place to meet.

Mark is a high school senior who is planning a senior trip with friends to a local beach. All of his friends are considering different places to visit, but they have a budget that needs to be met. Due to these budget constraints, Mark rarely goes on trips and only uses NavQuest a few times each year.

## User Stories

List the current user stories you will implement.

#1 As a trip organizer, I want to create itineraries that fit the budgetary restrictions of my group, so that each member of my group can afford to go on the trip.

Acceptance Criteria:
- Organizer can input a per-person budget when creating an itinerary
- Generated itinerary's total estimated cost per person is displayed on the itinerary and does not exceed the inputted budget per person
- Cost breakdown is visible per activity
- Program sends back a message to the user if it is not feasible to create an itinerary with a given budget and does not create an itinerary

#2 As a trip organizer, I want to create itineraries to fit within a specific time window so that the trip fits my group’s available schedule.
Acceptance Criteria:
- The organizer can input a specific start and end time
- A group's itinerary is restricted to one day
- System rejects impossible time windows (i.e. visiting 3 places within the same hour)
- Program sends back a message to the user if it is not feasible to create an itinerary with the given time constraints and does not create an itinerary


#3 As a trip organizer, I want to create itineraries to be optimized around a central meeting location or destination so that the group can figure out where to meet before they travel together.
Acceptance Criteria:
- Organizer can input the starting location for each group member which is used to find a central meeting location for the first itinerary activity
- Generated itinerary prioritizes finding activities within a user-configurable radius of each group member's starting location
- Itinerary displays the distance/travel time from one activity to another

#4 As a trip organizer, I want itineraries to reflect group interests so that the trip matches what most people would enjoy.
Acceptance Criteria:
- Organizer can input interest tags for each group member (i.e. food, outdoors, museums)
- Each member of the group has one or more interest tags associated with it
- AI-generated itinerary activities only include activities with at least one tag matching the group's combined interest list
- If too few matching activities exist to fill the time window, system fills remaining slots with unmatched activities and flags this to the user (rather than failing outright)

#5 As a trip organizer, I want to be able to generate a written itinerary using AI so that I do not have to spend too much time writing one myself and so that I can share it easily.
Acceptance Criteria:
- After inputting group information (time constraints, budget constraints, and interests), the organizer can trigger an AI-generated itinerary using a button
- Output can also be transformed into a written description of each activity for the itinerary, including its location, cost estimate per person, and travel time
- The written description is reformatted to be easily readable in the mobile view with adjusted font sizes
- The written itinerary should match the contents of the visual itinerary

#6 As a trip organizer, I want to be able to generate a visual itinerary using AI so that the group can follow the itinerary throughout the day.
Acceptance Criteria:
- After inputting group information (time constraints, budget constraints, and interests), the organizer can trigger an AI generation using a button
- Output is structured as a visual itinerary with points representing each activity that the group members should visit
- The visual itinerary should be reformatted so it is easily readable in the mobile view with larger fonts and information shown through a sidebar

#7 As a trip organizer, I want to update my itineraries so that, if I want to change parts of my itinerary in case my group’s trip constraints change.
Acceptance Criteria:
- The organizer can edit any constraint (budget, time, location, interests) on an existing saved itinerary
- Editing the activities results in the activity updates the itinerary when another user views it

#8 As a trip organizer, I want to mark my itinerary as public and share it, so that other people can view and use the trip plan I created.
Acceptance Criteria:
- The organizer can mark an itinerary as either public or private
- Public itineraries are visible to other users in a browsable list or search
- Viewing another user's itinerary does not allow editing it (read-only access)

#9 As a trip organizer, I want to browse and view itineraries that other users have made public, so that I can get ideas or find a ready-made plan for my own trip.
Acceptance Criteria:
- The organizer can access a "Discover" or "Browse" page to see public itineraries.
- The organizer can search or filter itineraries by criteria such as location or interests.
- Each itinerary only displays its details in a read-only view.
- A trip organizer can save a copy of a public itinerary to their own dashboard.

#10 As a trip organizer, I want meal times to be automatically included in my itinerary based on my group's food preferences, so that the group doesn't have to manually plan around when and where to eat.
Acceptance Criteria:
- The AI generated itinerary includes designated meal slots based on the trip's duration.
- The system selects food venues that align with the group's interest tags (e.g., "food," "cuisine type").
- Meal stops are clearly labeled within the generated itinerary timeline.
- The system automatically adjusts the itinerary schedule to accommodate these meal times.

#11 As a trip organizer, I want to save my itinerary such that I can revisit the plan again in the future.
Acceptance Criteria:
- Once an organizer creates an itinerary, it is automatically saved
- Saved itineraries appear in a "My Trips" list which is found on the user's dashboard
- Reopening a saved itinerary restores all of the user's data exactly as it was saved

#12 As a trip organizer, I want to delete my itinerary in case my plans fall through or I dislike my current trip plan.
Acceptance Criteria:
- An organizer can delete an itinerary from their "My Trips" list
- Deleted itineraries no longer appear in their "My Trips" list

#13 As a trip organizer, I want to create my own designed account so I can access all the itineraries that I have saved.
Acceptance Criteria:
- When I submit a valid username, email, and password, a POST /users request is sent and I receive a 201 response with {username, email, createdAt}, then I'm logged in and redirected to my dashboard
- If any field is missing or improperly formatted, the UI shows a field-specific error without clearing my other inputs
- The password is hashed before storage and is never included in the response, logs, or client storage

#14 As a trip organizer, I want to update my account’s information in case - I want to change my username, email, or password
- When I change one or more fields and save, a PUT /users/:id request is sent containing only the changed fields, and I receive a 200 response reflecting those changes
- If a field is improperly formatted, the API returns 400 and the UI shows which field failed without discarding my other valid inputs
- If my account ID no longer exists, the API returns 404 and the UI redirects me to log in again

#15 As a trip organizer, I want to see information about my account displayed on my dashboard, including information about my username and the itineraries that I have saved.
- When I navigate to my dashboard while logged in, a GET /users/:id request is sent and the response is used to display my username, liked itineraries, and created itineraries
- If I'm not signed in, the API returns 401 and I'm redirected to the login page instead of seeing a broken dashboard
- If I have no liked or created itineraries, the lists render as empty and the UI shows an empty-state message instead of an error

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

### Guide Page
![Guide page wireframe](wireframes/guide_page_wireframe.png?raw=true "Guide Page")

### Itinerary Page (Viewer View)
![Viewer itinerary page wireframe](wireframes/viewer_itinerary_page_wireframe.png?raw=true "Itinerary Page (Viewer View)")

### Account Page
![Account page wireframe](wireframes/account_page_wireframe.png?raw=true "Account Page")

## Data Model

### User
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| email | String | @unique |
| username | String | @unique |
| password | String | |
| createdItineraries | Itinerary[] | @relation("CreatedItineraries") |
| likedItineraries | Itinerary[] | @relation("LikedItineraries") |

### Itinerary
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| userId | Int | Foreign key → User.id |
| title | String | |
| location | String | |
| isPublic | Boolean | @default(false) |
| likeCount | Int | @default(0) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| creator | User | @relation("CreatedItineraries", fields: [userId], references: [id]) |
| likedBy | User[] | @relation("LikedItineraries") |
| pins | Pin[] | |

### Pin
| Attribute | Type | Additional Info |
| --- | --- | --- |
| id | Int | @default(autoincrement()) |
| itineraryId | Int | Foreign key → Itinerary.id |
| orderInItinerary | Int | |
| name | String | |
| description | String? | |
| budgetPerPerson | Float | |
| latitude | Float | |
| longitude | Float | |
| address | String? | |
| startTime | DateTime | |
| endTime | DateTime | |
| locationImageUrl | String | |
| itinerary | Itinerary | @relation(fields: [itineraryId], references: [id]) |

## Endpoints

### Users

POST /users - Register a new user
- User story: 13
- Request: { username, email, password }
- Response (201): { username, email, createdAt }
- Errors: 400 if fields are missing or improperly structured

PUT /users/:id - Update a user's information
- User story: 14
- Request: { username, email, password } (all fields optional)
- Response (200): the changed fields
- Errors: 400 if fields are improperly structured, 404 if the user cannot be found

GET /users/:id - Get a user's dashboard information
- User story: 15
- Request: none
- Response (200): { username, email, likedItineraries, createdItineraries }
- Errors: 401 if the user is not signed in, 404 if the user cannot be found

### Itineraries

POST /itineraries - Create a new itinerary
- User stories: 8, 11
- Request: { title, isPublic, pins }
- Response (201): { title, creator, isPublic, pins, createdAt }
- Errors: 400 if fields are missing or wrongly structured, 401 if the user is not signed in

GET /itineraries - List itineraries accessible to the user
- User stories: 9, 11
- Request: none
- Response (200): [ { createdAt, updatedAt, title, creator, isPublic, likeCount, pins } ]
- Errors: 401 if the user is not signed in

GET /itineraries/:id - Get a single itinerary
- User stories: 9, 11
- Request: none
- Response (200): { createdAt, updatedAt, title, creator, isPublic, likeCount, pins }
- Errors: 401 if the user is not signed in, 403 if the user is not authorized to access the resource, 404 if the itinerary cannot be found

PUT /itineraries/:id - Update an itinerary
- User stories: 7, 8
- Request: { title, isPublic, likeCount, pins } (all fields optional)
- Response (200): the changed fields
- Errors: 401 if the user is not signed in, 403 if the user does not have access to the itinerary, 404 if the itinerary cannot be found

DELETE /itineraries/:id - Delete an itinerary
- User story: 12
- Request: none
- Response (204): none
- Errors: 401 if the user is not signed in, 403 if the authenticated user does not have access to the itinerary, 404 if the itinerary cannot be found

### Pins

GET /pins/:id - Get a single pin
- User stories: 3, 5
- Request: none
- Response (200): { orderInItinerary, name, description, budgetPerPerson, latitude, longitude, address, startTime, endTime, locationImageUrl }
- Errors: 401 if the user is not signed in, 403 if the authenticated user does not have access to the pin, 404 if the pin cannot be found

POST /pins - Create a pin for an itinerary
- User stories: 1, 2, 3, 4, 10
- Request: { itineraryId, orderInItinerary, name, description, budgetPerPerson, latitude, longitude, address, startTime, endTime, locationImageUrl }
- Response (201): the created pin
- Errors: 400 if fields are missing or wrongly structured, 401 if the user is not signed in

PUT /pins/:id - Update a pin
- User story: 7
- Request: { orderInItinerary, name, description, budgetPerPerson, latitude, longitude, address, startTime, endTime, locationImageUrl } (all fields optional)
- Response (200): the changed fields
- Errors: 400 if fields are missing or wrongly structured, 401 if the user is not signed in, 403 if the authenticated user does not have access to the pin, 404 if the pin cannot be found

DELETE /pins/:id - Delete a pin from an itinerary
- User story: 7
- Request: none
- Response (204): none
- Errors: 401 if the user is not signed in, 403 if the authenticated user does not have access to the pin, 404 if the pin cannot be found

### AI Agent

POST /ai-agent - Generate a structured itinerary from AI
- User stories: 1, 2, 3, 4, 5, 6, 10
- Description: Receives structured input, prompts the AI agent, and returns an itinerary to be stored in the database and rendered on the frontend.
- Request: { foodPreferences, startingLocation, timeConstraints, interests }
- Response (200): { itinerary }
- Errors: 401 if the user is not signed in

## State Architecture

Global (used by auth or App component)
#1  const [currentUser, setCurrentUser]                       = useState(null);

Database (come from API)
#3  const [exploreItinerariesList, setExploreItinerariesList] = useState([];
#4  const [yourItinerariesList, setYourItinerariesList]       = useState([]);
#5  const [savedItinerariesList, setSavedItinerariesList]     = useState([]);
#6  const [recentItinerariesList, setRecentItinerariesList]   = useState([]);

Local to guide page
#2  const [userSearchQuery, setUserSearchQuery]               = useState("");

Local to Iternerary wizard component
#8  const [draftPreferences, setDraftPreferences] = useState({
      timeRange: { start: null, end: null },
      startingLocations: [],
      travelRadius: null,
      transport: "",              // single value
      interests: [],              // list (tag input)
      foodPreferences: [],        // list (tag input)
      budget: null,               // single value (per person)
      isPublic: false,            // single boolean
    });
#10 const [currentWizardStep, setCurrentWizardStep]           = useState(1);

Local to Iternerary page
#11 const [currentPin, setCurrentPin]                         = useState(null);
#9  const [currentViewedItinerary, setCurrentViewedItinerary] = useState(null);

## Component Hierarchy

```

<App>
│
├── <Navbar>
│   ├── <Logo>
│   ├── <NavLinks>              (only if authenticated)
│   │   ├── <NavLink> "Home"
│   │   └── <NavLink> "Guides"
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
│   │       │   └── <SubmitButton> "Register"
|   |       └── <LoginSection>
|   |           ├── <loginText>
|   |           ├── <loginLink>
│   │
│   ├── <HomePage>
│   │   ├── <ExploreSection>
│   │   │   ├── <SectionHeader>
│   │   │   └── <CardCarousel>
│   │   │       ├── <TripCard> ×N
│   │   │       └── <CarouselArrow>
│   │   ├── <YourTripsSection>
│   │   │   ├── <SectionHeader>
│   │   │   │   └── <NewTripButton>
│   │   │   └── <CardCarousel>
│   │   │       ├── <TripCard> ×N
│   │   │       └── <CarouselArrow>
│   │   └── <SavedTripsSection>
│   │       ├── <SectionHeader>
│   │       └── <CardCarousel>
│   │           ├── <TripCard> ×N
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
│   │   │   │   ├── <SaveButton> (owner only)
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
│   └── <GuidePage>
│       ├── <SearchBar>
│       ├── <SectionHeader>
│       ├── <GuidesGrid>
│       │   └── <GuideCard> ×N
│       └── <LoadMoreButton>
│
└── <Footer>
```

## AI Feature Specification

The app uses AI in three distinct places. The recommendation engine stays
deterministic (it selects and ranks real places from our database); the AI is a
language layer around it that either enriches data offline or turns constraints
and plain language into a usable day. Every model call is made through OpenRouter
and must return structured JSON, and each feature has a non-AI fallback so the
app never hard-fails on a bad response.

### Tag Enrichment (offline seed step)

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

### Itinerary Sequencing (POST /ai-agent)

Organizes a shortlist of real, pre-ranked places into a sensible one-day
itinerary. The AI sequences only — it does not choose or invent places.

- User stories: 1, 2, 3, 5, 6, 10
- Description: Receives the recommendation engine's shortlist plus the group's
  constraints and returns an ordered day to be stored and rendered.
- Input: { shortlist (places with id, category, coordinates, hours, cost estimate), timeWindow, budget, groupSize, startingLocations }
- Output (200): a structured JSON itinerary — ordered stops with arrive/depart times, a per-stop cost estimate, and travel time to the next stop
- Behavior:
    - Orders stops by geography, inserts meal stops at meal times, and respects each place's opening hours and the trip's time window
    - Uses only place IDs from the provided shortlist — no hallucinated places
    - Keeps the estimated total cost within the group's budget; if no feasible day fits the constraints, it returns a "constraints too tight" message instead of an itinerary
    - If the AI call fails or its output fails validation, the system falls back to a deterministic ordering so an itinerary is always produced

### Natural-Language Itinerary Editing

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

## Decision Log

## Milestones

Milestone 1: Creating the Website’s Skeleton
Goal: Begin creating the skeleton for what the project will look like

Requirements:
- Set up the frontend and backend libraries and frameworks
- Translate the User, Itinerary, and Pin models from project_plan.md into prisma/schema.prisma, including the named relations and the implicit many-to-many for likes.
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
    - If public, the user should be able to access it in a “Itineraries” page
    - On this “Itineraries” page, users should be able to filter to find certain itineraries
    - All public itineraries should be displayed on the “Itineraries” page.
    - For these public itineraries, the user should be able to like these itineraries, which changes their like count for all users
- Users should be able to view the itineraries they have liked from their dashboard
- Users should be able to save a copy of another user’s public itinerary to their own dashboard

Checkpoint:
- The user can see a visual itinerary with pins and information surrounding the itinerary
- The user should be able to set their itinerary as public so other users can use it
- The user can find other user’s public itineraries
- The user can like a public itinerary and view their liked itineraries from their dashboard
- The user can save a copy of a public itinerary to their own dashboard

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
- A written/text version of the itinerary for easy sharing