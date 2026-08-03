import './WrittenItinerary.css'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PinName from '../PinName/PinName.jsx'
import PinTiming from '../PinTiming/PinTiming.jsx'
import PinCost from '../PinCost/PinCost.jsx'
import PinAddress from '../PinAddress/PinAddress.jsx'

// A meal badge if the stop was tagged breakfast/lunch/dinner (persist.js folds
// mealType into the pin's tags).
const MEALS = ['breakfast', 'lunch', 'dinner'];
function mealOf(tags = []) {
  return tags.find((t) => MEALS.includes(t));
}

// The whole stop card is the drag surface (owner mode), so any interactive
// control inside it must keep pointer/keyboard events from bubbling up to the
// card's drag sensor — otherwise pressing "remove", the time pencil, or a time
// input would start a drag instead of doing its job.
const noDrag = {
  onPointerDown: (e) => e.stopPropagation(),
  onKeyDown: (e) => e.stopPropagation(),
};

// A stop's remove control: a trash button that flips to an inline "Remove?"
// confirm so a delete always takes two deliberate clicks (never one).
function RemoveStopControl({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="timeline-stop__confirm" {...noDrag}>
        <button type="button" className="timeline-stop__confirm-yes" onClick={onConfirm}>
          Remove
        </button>
        <button type="button" className="timeline-stop__confirm-no" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="timeline-stop__remove"
      aria-label="Remove stop"
      onClick={() => setConfirming(true)}
      {...noDrag}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}

// The inner content of a stop card — shared by the draggable (owner) and static
// (viewer) rows so the two never drift.
function StopCard({ pin, index, total, meal, editable, onRemoveStop, onEditStop, onEditCost, siblings }) {
  return (
    <>
      <div className="timeline-stop__rail">
        <span className="timeline-stop__num">{index + 1}</span>
        {index < total - 1 && <span className="timeline-stop__line" />}
      </div>

      <div className="timeline-stop__card">
        <div className="timeline-stop__head">
          <PinName name={pin.name} />
          {meal && <span className="timeline-stop__meal">{meal}</span>}
          {editable && pin.stopId != null && (
            <RemoveStopControl onConfirm={() => onRemoveStop(pin.stopId)} />
          )}
        </div>
        <PinTiming
          startTime={pin.startTime}
          endTime={pin.endTime}
          editable={editable}
          stopId={pin.stopId}
          onEditStop={onEditStop}
          siblings={siblings}
          controlProps={editable ? noDrag : undefined}
        />
        {pin.address && <PinAddress address={pin.address} />}
        {pin.description && <p className="timeline-stop__desc">{pin.description}</p>}
        <PinCost
          cost={pin.pricePerPerson}
          editable={editable}
          stopId={pin.stopId}
          onEditCost={onEditCost}
          controlProps={editable ? noDrag : undefined}
        />
      </div>
    </>
  );
}

// A draggable timeline row (owner mode). useSortable keys off the stop id; the
// whole row carries the drag listeners so the card itself is the drag surface.
// Interactive controls inside (remove, time editor) stopPropagation via `noDrag`
// so they still work without starting a drag.
function SortableStop({ pin, index, total, meal, onRemoveStop, onEditStop, onEditCost, siblings }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pin.stopId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="timeline-stop timeline-stop--draggable"
      {...attributes}
      {...listeners}
    >
      <StopCard
        pin={pin}
        index={index}
        total={total}
        meal={meal}
        editable
        onRemoveStop={onRemoveStop}
        onEditStop={onEditStop}
        onEditCost={onEditCost}
        siblings={siblings}
      />
    </li>
  );
}

// Wanderlog-style vertical timeline. For the owner (`editable`) each stop is
// draggable (dnd-kit) and dropping calls onReorderStops with the new id order.
function WrittenItinerary({ pins = [], editable = false, onRemoveStop, onEditStop, onEditCost, onReorderStops }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (pins.length === 0) {
    return (
      <div className="written-itinerary">
        <p className="written-itinerary__empty">No stops in this itinerary yet.</p>
      </div>
    );
  }

  const siblingsFor = (pin) =>
    pins.filter((p) => p.stopId !== pin.stopId).map((p) => ({ startTime: p.startTime, endTime: p.endTime }));

  // Viewer (read-only) timeline — unchanged behavior, no drag.
  if (!editable) {
    return (
      <ol className="written-itinerary">
        {pins.map((pin, i) => (
          <li key={pin.stopId ?? pin.id ?? pin.orderInItinerary} className="timeline-stop">
            <StopCard
              pin={pin}
              index={i}
              total={pins.length}
              meal={mealOf(pin.tags)}
              editable={false}
              onRemoveStop={onRemoveStop}
              onEditStop={onEditStop}
              onEditCost={onEditCost}
              siblings={siblingsFor(pin)}
              dragHandle={null}
            />
          </li>
        ))}
      </ol>
    );
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pins.findIndex((p) => p.stopId === active.id);
    const newIndex = pins.findIndex((p) => p.stopId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(pins, oldIndex, newIndex).map((p) => p.stopId);
    onReorderStops(newOrder);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={pins.map((p) => p.stopId)} strategy={verticalListSortingStrategy}>
        <ol className="written-itinerary">
          {pins.map((pin, i) => (
            <SortableStop
              key={pin.stopId}
              pin={pin}
              index={i}
              total={pins.length}
              meal={mealOf(pin.tags)}
              onRemoveStop={onRemoveStop}
              onEditStop={onEditStop}
              onEditCost={onEditCost}
              siblings={siblingsFor(pin)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

export default WrittenItinerary;
