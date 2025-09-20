import dayjs from 'dayjs';

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return 'Unscheduled';
  const start = dayjs(startDate).format('MMM D');
  const end = dayjs(endDate).format('MMM D, YYYY');
  return `${start} → ${end}`;
}

function formatType(type) {
  if (!type) return 'Custom';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function ItineraryList({ itineraries, selectedId, onSelect, loading }) {
  const isEmpty = !loading && itineraries.length === 0;

  return (
    <div className="panel" aria-busy={loading}>
      <div className="panel-header">
        <h2>Itineraries</h2>
        <p className="panel-subtitle">Manage personal, study and travel plans.</p>
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
                      <span className="itinerary-count">{activityCount} activities</span>
                    </span>
                    {itinerary.destination && <span className="itinerary-destination">{itinerary.destination}</span>}
                  </button>
                </li>
              );
            })}
      </ul>
      {isEmpty && <p className="empty">No itineraries yet. Create one below.</p>}
    </div>
  );
}
