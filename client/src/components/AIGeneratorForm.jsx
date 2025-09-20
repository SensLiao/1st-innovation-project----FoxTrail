import { useState } from 'react';

const defaultState = {
  title: 'AI generated adventure',
  destination: '',
  startDate: '',
  days: 3,
  focus: 'culture,food',
  type: 'trip'
};

export default function AIGeneratorForm({ onGenerate, loading }) {
  const [form, setForm] = useState(defaultState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const payload = {
      ...form,
      days: Number(form.days),
      preferences: { focus: form.focus.split(',').map((item) => item.trim()).filter(Boolean) }
    };

    try {
      await onGenerate(payload);
    } catch (error) {
      console.error('Unable to generate itinerary', error);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>AI itinerary assistant</h2>
        <p className="panel-subtitle">Describe a goal and let the assistant draft a schedule.</p>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" value={form.title} onChange={handleChange} />
        </label>
        <label>
          Destination / context
          <input name="destination" value={form.destination} onChange={handleChange} placeholder="Seoul" />
        </label>
        <div className="form-grid">
          <label>
            Start date
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
          </label>
          <label>
            Days
            <input type="number" min="1" max="14" name="days" value={form.days} onChange={handleChange} />
          </label>
        </div>
        <label>
          Focus keywords
          <input name="focus" value={form.focus} onChange={handleChange} placeholder="culture,food" />
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
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Generating…' : 'Generate itinerary'}
        </button>
      </form>
    </div>
  );
}
