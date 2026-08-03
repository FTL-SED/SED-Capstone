import './ItineraryWizard.css'
import { useState, useEffect, useRef } from 'react'
import PageHeading from '../PageHeading/PageHeading.jsx'
import WizardStepper from '../WizardStepper/WizardStepper.jsx'
import Step1_TripBasics from '../Step1_TripBasics/Step1_TripBasics.jsx'
import Step2_Members from '../Step2_Members/Step2_Members.jsx'
import Step3_Finish from '../Step3_Finish/Step3_Finish.jsx'
import { newMember } from '../memberModel.js'
import { useLocation } from 'react-router-dom'
import { getCurrentUser } from '../../../lib/currentUser.js'
import { usePreferencesQuery } from '../../../hooks/usePreferences.js'
import { prefsFromRecord } from '../../../lib/preferences.js'


// The single source of truth for everything the wizard collects. Trip-level
// fields live at the top; per-member fields live in `members` (name, one
// starting location, and that member's interests/food). Each step reads/writes
// via the `form` + `update` props; the finish handler submits it.
// See .claude/roadmap/frontend-backend-integration.md (Step 5).
// The first member represents the signed-in user (the organizer is always on
// their own trip), so it's pre-seeded from `currentUser` rather than left blank;
// their saved preferences (location/interests/food) are filled in async once
// they load (see the effect below). "+ Add member" still adds blank members.
const makeInitialForm = () => {
  const me = getCurrentUser();
  return {
    tripDate: '',
    startTime: '',
    endTime: '',
    transport: '',
    travelRadius: '',
    budget: '25', // slider default; budget is required, so start at a real value
    includeMeals: true, // default: schedule breakfast/lunch/dinner where the window allows
    members: [{ ...newMember(), name: me?.username ?? '' }],
    isPublic: false,
    title: '',
    description: '',
    coverImageFile: null,
  };
};

function ItineraryWizard() {
  const location = useLocation();
  const [step, setStep] = useState(1);
  // A restored draft (e.g. returning from the banner generator) wins; otherwise
  // start fresh with the signed-in user pre-seeded as member 1.
  const [form, setForm] = useState(location.state?.form ?? makeInitialForm);

  // Fill member 1 with the signed-in user's SAVED preferences (start location,
  // interests, food) once they load from the server. `currentUser` in
  // localStorage only carries identity, not prefs, so they arrive async. Only
  // touches an untouched first member (name matches, no location picked yet) so
  // it never clobbers a user's edits or a restored draft. Runs once per load.
  const me = getCurrentUser();
  const { data: prefs } = usePreferencesQuery(me?.id);
  const seededPrefs = useRef(false);
  useEffect(() => {
    if (!prefs || seededPrefs.current) return;
    if (location.state?.form) { seededPrefs.current = true; return; } // restored draft owns its members
    seededPrefs.current = true;
    setForm((f) => {
      const first = f.members[0];
      // Bail if the user already edited member 1 (picked a location, or renamed
      // away from their username) — don't overwrite their input.
      if (!first || first.location || (first.name && first.name !== (me?.username ?? ''))) return f;
      const mapped = prefsFromRecord(prefs);
      const merged = {
        ...first,
        name: first.name || me?.username || '',
        location: mapped.location,
        interestTags: mapped.interestTags,
        foodPrefs: mapped.foodPrefs,
      };
      return { ...f, members: [merged, ...f.members.slice(1)] };
    });
  }, [prefs, location.state, me?.id, me?.username]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const goTo = (n) => setStep(n);
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="itinerary-wizard">
      {/* Heading + progress stepper now live inside the card, above the form */}
      <PageHeading />
      <WizardStepper activeStep={step} />

      {step === 1 && <Step1_TripBasics form={form} update={update} onNext={next} />}
      {step === 2 && <Step2_Members form={form} update={update} onNext={next} onBack={back} />}
      {step === 3 && <Step3_Finish form={form} update={update} onBack={back} goTo={goTo} />}
    </div>
  );
}

export default ItineraryWizard;
