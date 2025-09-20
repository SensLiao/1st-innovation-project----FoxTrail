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
      console.error('无法创建行程', error);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>创建新行程</h2>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          行程标题
          <input name="title" value={form.title} onChange={handleChange} placeholder="东京学习冲刺" required />
        </label>
        <label>
          行程类型
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="trip">旅行</option>
            <option value="daily">日常</option>
            <option value="commute">通勤</option>
            <option value="custom">自定义</option>
          </select>
        </label>
        <label>
          目的地 / 背景
          <input name="destination" value={form.destination} onChange={handleChange} placeholder="日本京都" />
        </label>
        <div className="form-grid">
          <label>
            开始日期
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
          </label>
          <label>
            结束日期
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
          </label>
        </div>
        <label>
          出发地点
          <input name="startLocation" value={form.startLocation} onChange={handleChange} placeholder="校园宿舍" />
        </label>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? '保存中…' : '创建行程'}
        </button>
      </form>
    </div>
  );
}
