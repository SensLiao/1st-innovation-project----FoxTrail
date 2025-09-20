import dayjs from 'dayjs';

function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return 'Flexible timing';
  const start = startTime ? dayjs(startTime).format('MMM D, HH:mm') : 'TBD';
  const end = endTime ? dayjs(endTime).format('HH:mm') : 'TBD';
  return `${start} - ${end}`;
}

export default function ItineraryDetails({ itinerary, onOptimize, onSync, onDeleteItem }) {
  if (!itinerary) {
    return (
      <div className="panel stretch">
        <div className="panel-header">
          <h2>Itinerary details</h2>
        </div>
        <p className="empty">Select or generate an itinerary to review activities.</p>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/share/${itinerary.id}`;

  return (
    <div className="panel stretch">
      <div className="panel-header">
        <div>
          <h2>{itinerary.title}</h2>
          <p className="panel-subtitle">
            {itinerary.destination || 'No destination'} · {itinerary.preferences?.aiSummary || 'Custom itinerary'}
          </p>
        </div>
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => onOptimize(itinerary.id)}>
            Optimise order
          </button>
          <button type="button" className="secondary" onClick={() => onSync(itinerary.id)}>
            Sync calendar
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div>
          <span className="label">Schedule</span>
          <strong>{formatTimeRange(itinerary.startDate, itinerary.endDate)}</strong>
        </div>
        <div>
          <span className="label">Type</span>
          <strong className={`badge badge-${itinerary.type}`}>{itinerary.type}</strong>
        </div>
        <div>
          <span className="label">Share link</span>
          <a href={shareLink} onClick={(event) => event.preventDefault()}>
            {shareLink}
          </a>
        </div>
        <div>
          <span className="label">Collaborators</span>
          <strong>{itinerary.collaborators?.length || 0}</strong>
        </div>
      </div>

      <div className="timeline">
        <h3>Schedule</h3>
        <ul>
          {itinerary.items.map((item) => (
            <li key={item.id} className={`timeline-item category-${item.category}`}>
              <div className="timeline-meta">
                <span className="badge badge-ghost">Day {item.day || '?'}</span>
                <span>{formatTimeRange(item.startTime, item.endTime)}</span>
              </div>
              <div className="timeline-body">
                <h4>{item.name}</h4>
                <p>{item.location}</p>
                <p className="notes">{item.notes}</p>
              </div>
              <div className="timeline-actions">
                <span className="badge badge-outline">{item.travelMode}</span>
                <button type="button" onClick={() => onDeleteItem(itinerary.id, item.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        {itinerary.items.length === 0 && <p className="empty">No activities yet. Add one below.</p>}
      </div>
    </div>
  );
}
