import './Step1_TripBasics.css'
import { useState } from 'react'
import DateField from '../DateField/DateField.jsx'
import TimeRangeField from '../TimeRangeField/TimeRangeField.jsx'
import TransportField from '../TransportField/TransportField.jsx'
import TravelRadiusField from '../TravelRadiusField/TravelRadiusField.jsx'
import BudgetField from '../BudgetField/BudgetField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'

// The trip-level fields the backend requires (validateRecommendationInput):
// a start time, an end time that differs from it, and a non-negative budget.
// Transport and travel radius are optional, so they aren't checked here.
function validateTripBasics(form) {
  if (!form.startTime) return 'Please choose a start time.';
  if (!form.endTime) return 'Please choose an end time.';
  if (form.startTime === form.endTime) return 'End time must differ from start time.';
  const budget = Number(form.budget);
  if (form.budget === '' || !Number.isFinite(budget) || budget < 0) {
    return 'Please enter a budget of 0 or more.';
  }
  return '';
}

// Step 1 — all trip-level settings on one screen: date, time window, transport,
// travel radius, and budget. (Who's going + their preferences is Step 2.)
function Step1_TripBasics({ form, update, onNext }) {
  // Only advance once the required fields are valid; otherwise surface why.
  const [error, setError] = useState('');

  const handleNext = () => {
    const message = validateTripBasics(form);
    setError(message);
    if (!message) onNext();
  };

  return (
    <div className="step1-trip-basics">
      <p className="step1-trip-basics__legend">
        <span className="field-required" aria-hidden="true">*</span> Required
      </p>
      <DateField form={form} update={update} />
      <TimeRangeField form={form} update={update} />
      <TransportField form={form} update={update} />
      <TravelRadiusField form={form} update={update} />
      <BudgetField form={form} update={update} />
      <ErrorMessage message={error} />
      <NextButton onClick={handleNext} />
    </div>
  );
}

export default Step1_TripBasics;
