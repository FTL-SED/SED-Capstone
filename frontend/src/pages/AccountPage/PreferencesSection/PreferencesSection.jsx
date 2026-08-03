import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import TagPills from '../../../components/Inputs/TagPills/TagPills.jsx'
import AddressPicker from '../../../components/Inputs/AddressPicker/AddressPicker.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { usePreferencesQuery, usePreferencesMutation } from '../../../hooks/usePreferences.js'
import {
  INITIAL_PREFS,
  buildPreferencesPayload,
  prefsFromRecord,
} from '../../../lib/preferences.js'
import { INTEREST_TAGS, CUISINE_TAGS, DIET_TAGS } from '../../../api/vocab.js'
import './PreferencesSection.css'

// The saved-preferences editor, opened from the "Preferences" button in the
// account nav. Reads the user's prefs from the shared React Query cache
// (usePreferences) — so reopening is instant, no reload — seeds a local editable
// form from that cached record, and saves via the mutation (which updates the
// cache). Deliberately does NOT send isPublic — that's the quick toggle in
// ProfileSection — so this editor can't clobber it.
//
// On the Account page it's shown as its own view (replacing the profile
// sections), so the Save action lives in the card header. The parent drives
// saving through the forwarded ref (save() + isPending) and reports its own
// pending state up via onPendingChange; the internal header + save button are
// hidden then (embedded=false). It still renders standalone with its own header
// + button when embedded is left default.
const PreferencesSection = forwardRef(function PreferencesSection(
  { currentUser, embedded = true, onSaved, onPendingChange },
  ref,
) {
  const { data: prefs, isLoading, isError } = usePreferencesQuery(currentUser?.id)
  const mutation = usePreferencesMutation(currentUser?.id)

  const [form, setForm] = useState(INITIAL_PREFS)
  const [message, setMessage] = useState('')

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  // Seed the editable form from the cached record whenever it (re)loads. The
  // cache is the source of truth; local form holds in-progress edits until save.
  useEffect(() => {
    if (prefs) setForm(prefsFromRecord(prefs))
  }, [prefs])

  const cuisineSel = form.foodPrefs.filter((t) => CUISINE_TAGS.includes(t))
  const dietSel = form.foodPrefs.filter((t) => DIET_TAGS.includes(t))

  const error = isError
    ? 'Could not load your preferences.'
    : mutation.isError
      ? mutation.error?.response?.data?.error || 'Could not save your preferences. Please try again.'
      : ''

  const handleSave = () => {
    setMessage('')
    // Preserve the existing isPublic (owned by ProfileSection's toggle) by not
    // sending it — the backend leaves unspecified fields untouched.
    const { isPublic, ...body } = buildPreferencesPayload(form)
    void isPublic
    mutation.mutate(body, {
      onSuccess: () => {
        setMessage('Preferences saved.')
        onSaved?.()
      },
    })
  }

  // Let the Account card's header drive Save (and read the pending state) when
  // this editor is rendered as its own view.
  useImperativeHandle(ref, () => ({ save: handleSave, isPending: mutation.isPending }))

  // Keep the parent's header Save button label/disabled state in sync.
  useEffect(() => {
    onPendingChange?.(mutation.isPending)
  }, [mutation.isPending, onPendingChange])

  return (
    <section className="preferences-section">
      {embedded && <SectionHeader title="Preferences" />}

      {isLoading ? (
        <p className="preferences-section__loading">Loading…</p>
      ) : (
        <>
          <label className="preferences-section__label">Interests</label>
          <TagPills
            options={INTEREST_TAGS}
            selected={form.interestTags}
            onChange={(next) => update('interestTags', next)}
            groupLabel="interests"
          />

          <label className="preferences-section__label">Food preferences</label>
          <span className="preferences-section__sublabel">Cuisines</span>
          <TagPills
            options={CUISINE_TAGS}
            selected={cuisineSel}
            onChange={(next) => update('foodPrefs', [...next, ...dietSel])}
            groupLabel="cuisines"
          />

          <span className="preferences-section__sublabel">Dietary</span>
          <TagPills
            options={DIET_TAGS}
            selected={dietSel}
            onChange={(next) => update('foodPrefs', [...cuisineSel, ...next])}
            groupLabel="dietary needs"
          />

          <label className="preferences-section__label">Default starting location</label>
          {/* AddressPicker seeds its input text once on mount, but the saved
              prefs load async (after mount), so the input starts empty. Surface
              the currently-saved location as the placeholder so it's visible;
              falls back to the generic prompt once the location is cleared. */}
          <AddressPicker
            placeholder={form.location?.label || 'Enter starting location'}
            value={form.location}
            onChange={(loc) => update('location', loc)}
          />

          <ErrorMessage message={error} />
          {message && <p className="preferences-section__success">{message}</p>}

          {/* Standalone (non-embedded) mode is driven by the card header's Save
              button, so the inline one is only shown when embedded. */}
          {embedded && (
            <button
              className="preferences-section__save"
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving…' : 'Save preferences'}
            </button>
          )}
        </>
      )}
    </section>
  )
})

export default PreferencesSection
