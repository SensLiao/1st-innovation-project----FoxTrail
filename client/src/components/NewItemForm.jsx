import { useState } from 'react';

const initialState = {
  name: '',
  category: 'general',
  location: '',
  day: '',
  startTime: '',
  endTime: '',
  travelMode: 'walk',
  notes: ''
};

export default function NewItemForm({ onAdd, disabled }) {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (disabled || submitting) return;

    setSubmitting(true);
    const payload = {
      ...form,
      day: form.day ? Number(form.day) : null,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : null
    };

    try {
      await onAdd(payload);
      setForm(initialState);
    } catch (error) {
      console.error('Unable to add itinerary item', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = disabled || submitting;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h3>Add activity</h3>
      <label>
        Title
        <input name="name" value={form.name} onChange={handleChange} placeholder="Visit campus maker lab" required />
      </label>
      <div className="form-grid">
        <label>
          Category
          <select name="category" value={form.category} onChange={handleChange}>
            <option value="general">General</option>
            <option value="culture">Culture</option>
            <option value="food">Food</option>
            <option value="nature">Nature</option>
            <option value="productivity">Productivity</option>
            <option value="commute">Commute</option>
          </select>
        </label>
        <label>
          Travel mode
          <select name="travelMode" value={form.travelMode} onChange={handleChange}>
            <option value="walk">Walk</option>
            <option value="public-transit">Public transit</option>
            <option value="drive">Drive</option>
            <option value="bike">Bike</option>
          </select>
        </label>
      </div>
      <label>
        Location / notes
        <input name="location" value={form.location} onChange={handleChange} placeholder="Makerspace building" />
      </label>
      <div className="form-grid">
        <label>
          Day number
          <input type="number" min="1" name="day" value={form.day} onChange={handleChange} />
        </label>
        <label>
          Starts
          <input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} />
        </label>
        <label>
          Ends
          <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} />
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" placeholder="Remind everyone to bring prototypes." />
      </label>
      <button type="submit" className="secondary" disabled={isDisabled}>
        {submitting ? 'Adding…' : 'Add to itinerary'}
      </button>
    </form>
  );
}
