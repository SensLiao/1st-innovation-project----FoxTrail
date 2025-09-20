import { useEffect, useState } from 'react';

const initialState = {
  itineraryId: '',
  name: '',
  category: 'general',
  location: '',
  day: '',
  startTime: '',
  endTime: '',
  travelMode: 'walk',
  notes: ''
};

export default function NewItemForm({ onAdd, disabled = false, itineraries = [], defaultItineraryId = '' }) {
  const [form, setForm] = useState({ ...initialState, itineraryId: defaultItineraryId || '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setForm((prev) => ({ ...prev, itineraryId: defaultItineraryId || '' }));
  }, [defaultItineraryId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (disabled || submitting) return;

    setSubmitting(true);
    const { itineraryId, ...activity } = form;
    const payload = {
      ...activity,
      day: activity.day ? Number(activity.day) : null,
      startTime: activity.startTime ? new Date(activity.startTime).toISOString() : null,
      endTime: activity.endTime ? new Date(activity.endTime).toISOString() : null
    };

    try {
      await onAdd(itineraryId, payload);
      setForm({ ...initialState, itineraryId });
    } catch (error) {
      console.error('无法添加行程活动', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = disabled || submitting;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        选择行程
        <select name="itineraryId" value={form.itineraryId} onChange={handleChange} required>
          <option value="" disabled>
            请选择要添加的行程
          </option>
          {itineraries.map((itinerary) => (
            <option key={itinerary.id} value={itinerary.id}>
              {itinerary.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        活动名称
        <input name="name" value={form.name} onChange={handleChange} placeholder="参观校园创客实验室" required />
      </label>
      <div className="form-grid">
        <label>
          活动类别
          <select name="category" value={form.category} onChange={handleChange}>
            <option value="general">通用</option>
            <option value="culture">文化</option>
            <option value="food">美食</option>
            <option value="nature">自然</option>
            <option value="productivity">效率</option>
            <option value="commute">通勤</option>
          </select>
        </label>
        <label>
          交通方式
          <select name="travelMode" value={form.travelMode} onChange={handleChange}>
            <option value="walk">步行</option>
            <option value="public-transit">公共交通</option>
            <option value="drive">驾车</option>
            <option value="bike">骑行</option>
          </select>
        </label>
      </div>
      <label>
        地点 / 简介
        <input name="location" value={form.location} onChange={handleChange} placeholder="创客空间大楼" />
      </label>
      <div className="form-grid">
        <label>
          第几天
          <input type="number" min="1" name="day" value={form.day} onChange={handleChange} />
        </label>
        <label>
          开始时间
          <input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} />
        </label>
        <label>
          结束时间
          <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} />
        </label>
      </div>
      <label>
        备注
        <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" placeholder="提醒大家带好样品。" />
      </label>
      <button type="submit" className="secondary" disabled={isDisabled}>
        {submitting ? '添加中…' : '添加到行程'}
      </button>
    </form>
  );
}
