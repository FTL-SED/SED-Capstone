# Project Plan

Pod Members: **Emmanuel, Dylan, Semir**

## Kanban Board

https://trello.com/invite/b/6a4be0e996e36198ef8b85ba/ATTI1326f85c29b362903c595c4b316e58dbD4986BF4/sed-capstone-planning 

## Problem Statement and Description

Young people in unfamiliar cities struggle to plan group outings, since aligning schedules, picking locations, and matching interests means tedious back-and-forth
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

## Data Model

### User
| Attribute | Type | Additional Info |
| id | Int | @default(autoincrement()) |
| email | String | @unique |
| username | String | @unique |
| password | String | |
| createdItineraries | Itinerary[] | @relation("CreatedItineraries") |
| likedItineraries | Itinerary[] | @relation("LikedItineraries") |

### Itinerary
| Attribute | Type | Additional Info |
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

List the API endpoints you will need to implement.


***Don't forget to set up your Issues, Milestones, and Project Board!***
