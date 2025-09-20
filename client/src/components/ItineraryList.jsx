import dayjs from 'dayjs';

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return 'Unscheduled';
  const start = dayjs(startDate).format('MMM D');
  const end = dayjs(endDate).format('MMM D, YYYY');
  return `${start} → ${end}`;
}

export default function ItineraryList({ itineraries, selectedId, onSelect }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Itineraries</h2>
        <p className="panel-subtitle">Manage personal, study and travel plans.</p>
      </div>
      <ul className="itinerary-list">
        {itineraries.map((itinerary) => (
          <li key={itinerary.id}>
            <button
              type="button"
              className={`itinerary-item ${selectedId === itinerary.id ? 'active' : ''}`}
              onClick={() => onSelect(itinerary.id)}
            >
              <span className="itinerary-title">{itinerary.title}</span>
              <span className="itinerary-meta">
                <span className={`badge badge-${itinerary.type}`}>{itinerary.type}</span>
                <span>{formatDateRange(itinerary.startDate, itinerary.endDate)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {itineraries.length === 0 && <p className="empty">No itineraries yet. Create one below.</p>}
    </div>
  );
}
