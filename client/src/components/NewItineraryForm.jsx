import { useState } from 'react';

const defaultState = {
  title: '',
  type: 'trip',
  destination: '',
  startDate: '',
  endDate: '',
  startLocation: ''
};

export default function NewItineraryForm({ onCreate, loading }) {
  const [form, setForm] = useState(defaultState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      await onCreate(form);
      setForm(defaultState);
    } catch (error) {
      console.error('Unable to create itinerary', error);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Create itinerary</h2>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" value={form.title} onChange={handleChange} placeholder="Tokyo study sprint" required />
        </label>
        <label>
          Type
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="trip">Trip</option>
            <option value="daily">Daily</option>
            <option value="commute">Commute</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          Destination / Context
          <input name="destination" value={form.destination} onChange={handleChange} placeholder="Kyoto, Japan" />
        </label>
        <div className="form-grid">
          <label>
            Start date
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
          </label>
          <label>
            End date
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
          </label>
        </div>
        <label>
          Start location
          <input name="startLocation" value={form.startLocation} onChange={handleChange} placeholder="Campus dorms" />
        </label>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Saving…' : 'Create itinerary'}
        </button>
      </form>
    </div>
  );
}
