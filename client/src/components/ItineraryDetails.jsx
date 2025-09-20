import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return 'Flexible timing';
  const start = startTime ? dayjs(startTime).format('MMM D, HH:mm') : 'TBD';
  const end = endTime ? dayjs(endTime).format('HH:mm') : 'TBD';
  return `${start} - ${end}`;
}

function formatDayLabel(day) {
  if (!day) return 'Flexible day';
  return `Day ${day}`;
}

const categoryLabels = {
  general: 'General',
  culture: 'Culture',
  food: 'Food',
  nature: 'Nature',
  productivity: 'Productivity',
  commute: 'Commute'
};

const travelModeLabels = {
  walk: 'Walk',
  'public-transit': 'Public transit',
  drive: 'Drive',
  bike: 'Bike'
};

function formatTravelMode(mode) {
  return travelModeLabels[mode] || 'Flexible travel';
}

export default function ItineraryDetails({ itinerary, loading, onOptimize, onSync, onDeleteItem }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const shareLink = useMemo(() => {
    if (!itinerary?.id) return '';
    if (typeof window === 'undefined') {
      return `/share/${itinerary.id}`;
    }
    return `${window.location.origin}/share/${itinerary.id}`;
  }, [itinerary?.id]);

  const handleCopyShareLink = async () => {
    if (!shareLink) return;

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.warn('Clipboard API unavailable in this environment');
      setCopied(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy share link', error);
      setCopied(false);
    }
  };

  if (loading && !itinerary) {
    return (
      <div className="panel stretch" aria-busy="true">
        <div className="panel-header">
          <div className="skeleton skeleton-title-lg" />
          <div className="panel-actions skeleton-actions">
            <span className="skeleton skeleton-button" />
            <span className="skeleton skeleton-button" />
          </div>
        </div>
        <div className="summary-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`summary-skeleton-${index}`}>
              <span className="skeleton skeleton-label" />
              <span className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
        <div className="timeline">
          <div className="skeleton skeleton-subheading" />
          <ul>
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={`timeline-skeleton-${index}`} className="timeline-item skeleton-block">
                <span className="skeleton skeleton-text" />
                <span className="skeleton skeleton-text" />
                <span className="skeleton skeleton-text" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

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

  const totalActivities = itinerary.items.length;
  const collaboratorCount = itinerary.collaborators?.length || 0;
  const durationDays = itinerary.startDate && itinerary.endDate
    ? dayjs(itinerary.endDate).diff(dayjs(itinerary.startDate), 'day') + 1
    : null;
  const itinerarySummary = itinerary.preferences?.aiSummary || 'Custom itinerary';

  return (
    <div className="panel stretch" aria-busy={loading}>
      <div className="panel-header">
        <div>
          <h2>{itinerary.title}</h2>
          <p className="panel-subtitle">
            {itinerary.destination || 'No destination'} · {itinerarySummary}
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
          <span className="label">Duration</span>
          <strong>{durationDays ? `${durationDays} ${durationDays > 1 ? 'days' : 'day'}` : 'Flexible'}</strong>
        </div>
        <div>
          <span className="label">Activities</span>
          <strong>{totalActivities}</strong>
        </div>
        <div className="share-link">
          <span className="label">Share link</span>
          <a href={shareLink} onClick={(event) => event.preventDefault()}>{shareLink}</a>
          <button type="button" className="ghost" onClick={handleCopyShareLink} disabled={!shareLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <div>
          <span className="label">Collaborators</span>
          <strong>{collaboratorCount}</strong>
        </div>
      </div>

      <div className="timeline">
        <h3>Schedule</h3>
        <ul>
          {itinerary.items.map((item) => {
            const category = item.category || 'general';

            return (
              <li key={item.id} className={`timeline-item category-${category}`}>
                <div className="timeline-meta">
                  <span className="badge badge-ghost">{formatDayLabel(item.day)}</span>
                  <span>{formatTimeRange(item.startTime, item.endTime)}</span>
                </div>
                <div className="timeline-body">
                  <h4>{item.name}</h4>
                  {item.location && <p>{item.location}</p>}
                  <div className="timeline-tags">
                    <span className={`badge badge-category-${category}`}>{categoryLabels[category] || 'General'}</span>
                    <span className="badge badge-outline">{formatTravelMode(item.travelMode)}</span>
                  </div>
                  {item.notes && <p className="notes">{item.notes}</p>}
                </div>
                <div className="timeline-actions">
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() => onDeleteItem(itinerary.id, item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {itinerary.items.length === 0 && <p className="empty">No activities yet. Add one below.</p>}
      </div>
    </div>
  );
}
