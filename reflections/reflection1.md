# Reflection #1

Pod Members: **Emmanuel, Dylan, Semir**

## Reflection Questions

* Name at least one successful thing this week.

 We finished the recommendation engine and got it working end to end, from the trip form all the way to a ranked list of real places. We also connected the frontend to the backend so users can log in, like, and bookmark itineraries. The AI itinerary generation started coming together too.

* What were some challenges you and/or your group faced this week?

 We worked on separate branches, so merging our code caused a lot of conflicts, especially when two people changed the same files. Some code was also built on older versions before recent changes were pushed, so we had to reconcile things by hand. We also had to switch our geocoding provider partway through.

* Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?  (i.e over planned, did not know how to implement certain features, miscommunication from the team, had to pivot from original plans, etc.)

 We finished most of our tasks, including the recommendation engine, auth, and the like/bookmark feature. The AI itinerary generation is still in a pull request and not fully merged yet. Next week we would prioritize finishing the AI step first since the rest of the app depends on it.

* Did the resources provided to you help prepare you in planning and executing your capstone project sprint this week? Be specific, what resources did you find particularly helpful or which tasks did you need more support on?

 The planning docs and user stories helped us keep the recommendation engine and AI features aligned with what we actually needed to build. We could have used more support on Git workflow, since merge conflicts across branches slowed us down. Clearer rules on branching and merging order would have helped.

* Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

 The AI itinerary generation is most at risk since it depends on a live model and is still being merged. The seeded place data is also thin, so recommendations can look sparse. If these stay at risk, we will lean on the deterministic fallback for sequencing and add more seed places so the results feel realistic.
