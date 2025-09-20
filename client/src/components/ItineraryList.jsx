import dayjs from 'dayjs';

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '未安排时间';
  const start = dayjs(startDate).format('M月D日');
  const end = dayjs(endDate).format('YYYY年M月D日');
  return `${start} → ${end}`;
}

const typeLabels = {
  trip: '旅行',
  daily: '日常',
  commute: '通勤',
  custom: '自定义',
};

function formatType(type) {
  if (!type) return typeLabels.custom;
  return typeLabels[type] || typeLabels.custom;
}

export default function ItineraryList({ itineraries, selectedId, onSelect, loading }) {
  const isEmpty = !loading && itineraries.length === 0;

  return (
    <div className="panel" aria-busy={loading}>
      <div className="panel-header">
        <h2>行程列表</h2>
        <p className="panel-subtitle">管理个人、学习与旅行计划。</p>
      </div>
      <ul className="itinerary-list">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={`placeholder-${index}`} className="skeleton-list-item">
                <div className="itinerary-item skeleton-block" aria-hidden="true">
                  <span className="skeleton skeleton-title" />
                  <span className="skeleton skeleton-text" />
                </div>
              </li>
            ))
          : itineraries.map((itinerary) => {
              const isActive = selectedId === itinerary.id;
              const activityCount = itinerary.items?.length ?? 0;
              const typeKey = itinerary.type || 'custom';

              return (
                <li key={itinerary.id}>
                  <button
                    type="button"
                    className={`itinerary-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelect(itinerary.id)}
                    aria-pressed={isActive}
                  >
                    <span className="itinerary-title">{itinerary.title}</span>
                    <span className="itinerary-meta">
                      <span className={`badge badge-${typeKey}`}>{formatType(itinerary.type)}</span>
                      <span>{formatDateRange(itinerary.startDate, itinerary.endDate)}</span>
                      <span className="itinerary-count">{activityCount} 个活动</span>
                    </span>
                    {itinerary.destination && <span className="itinerary-destination">{itinerary.destination}</span>}
                  </button>
                </li>
              );
            })}
      </ul>
      {isEmpty && <p className="empty">还没有行程，请先新建。</p>}
    </div>
  );
}
