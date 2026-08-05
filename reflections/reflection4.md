# Reflection #4

Pod Members: **Emmanuel, Dylan, Semir**

## Reflection Questions

* Name at least one successful thing this week.

 We got the app stable and presentable for the final demo. The biggest win was shipping the AI cover-image banner feature, which lets a user generate a travel banner for their itinerary in one tap instead of hunting for a stock image. We put it behind content moderation that fails closed, a prompt guard against injection, and a per-user rate limit, so it is safe to expose on a public cover. We also finished the PDF email export so anyone can send an itinerary to friends who do not have accounts, and we spent real time on polish: page and stop animations, a cleaner create flow, and cleaning up the AI text so it uses 12-hour times and drops the dashes that made it read as robotic.

* What were some challenges you and/or your group faced this week?

 Most of our pain this week came from the difference between working locally and running on Render. The email export worked fine on our machines but failed in production until we fixed the SMTP port and secure settings and forced IPv4 on the Gmail transport. The AI generation also hung on the deployed backend because it sits behind a proxy with about a 100 second request cap, and the model sometimes took longer than that, so the request got killed before our fallback could return. We fixed that by supporting two providers behind one client and tuning the OpenAI path to a faster model with a 30 second timeout and a single retry, so the worst case stays under the cap and the deterministic fallback always has time to run.

* Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?  (i.e over planned, did not know how to implement certain features, miscommunication from the team, had to pivot from original plans, etc.)

 We finished everything we set out to do for this sprint since it was scoped as polish and deploy hardening rather than new features. We deliberately did not build the two features that had been at risk all along, the AI chatbot editing and user-generated custom stops, because we had already decided to cut them to protect the demo. The one thing we chose to do near the end was clean the AI-assistant scratch files out of the repo so a reviewer reads a production repo, and we folded the details those files held back into the project plan so the planning folder stays self-contained.

* Did the resources provided to you help prepare you in planning and executing your capstone project sprint this week? Be specific, what resources did you find particularly helpful or which tasks did you need more support on?

 The practice demo day and our pod syncs were the most useful this week. Rehearsing the demo forced us to find the rough edges in the end-to-end flow that we would not have caught just by using the app ourselves, like formatting and loading states. Where we could have used more support was deployment. A lot of our time went into production-only bugs, and clearer guidance on Render environment variables, proxy limits, and email delivery would have saved us a couple of late nights.

* Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

 At this point nothing in the MVP is at risk since every user story we committed to is built and deployed. The only items still open are the ones we intentionally cut and labeled as future work: natural-language itinerary editing and turning on the larger imported venue catalog. Neither is needed for the demo, so our plan is to leave them documented as stretch work rather than rush them in and risk destabilizing a working app right before the final presentation.
