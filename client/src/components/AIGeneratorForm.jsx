import { useState } from 'react';

const defaultState = {
  title: 'AI 灵感行程',
  destination: '',
  startDate: '',
  days: 3,
  focus: '文化,美食',
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
      console.error('无法生成行程', error);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>AI 行程助手</h2>
        <p className="panel-subtitle">描述你的目标，让助手快速规划日程。</p>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          行程标题
          <input name="title" value={form.title} onChange={handleChange} />
        </label>
        <label>
          目的地 / 背景
          <input name="destination" value={form.destination} onChange={handleChange} placeholder="首尔" />
        </label>
        <div className="form-grid">
          <label>
            开始日期
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
          </label>
          <label>
            行程天数
            <input type="number" min="1" max="14" name="days" value={form.days} onChange={handleChange} />
          </label>
        </div>
        <label>
          偏好关键词
          <input name="focus" value={form.focus} onChange={handleChange} placeholder="文化,美食" />
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
        <button type="submit" className="primary" disabled={loading}>
          {loading ? '生成中…' : '生成行程'}
        </button>
      </form>
    </div>
  );
}
