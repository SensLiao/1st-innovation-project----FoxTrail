import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return '时间灵活';
  const start = startTime ? dayjs(startTime).format('M月D日 HH:mm') : '待定';
  const end = endTime ? dayjs(endTime).format('HH:mm') : '待定';
  return `${start} - ${end}`;
}

function formatDayLabel(day) {
  if (!day) return '日期待定';
  return `第${day}天`;
}

const categoryLabels = {
  general: '通用',
  culture: '文化',
  food: '美食',
  nature: '自然',
  productivity: '效率',
  commute: '通勤'
};

const travelModeLabels = {
  walk: '步行',
  'public-transit': '公共交通',
  drive: '驾车',
  bike: '骑行'
};

function formatTravelMode(mode) {
  return travelModeLabels[mode] || '交通灵活';
}

const typeLabels = {
  trip: '旅行',
  daily: '日常',
  commute: '通勤',
  custom: '自定义'
};

function formatType(type) {
  return typeLabels[type] || typeLabels.custom;
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
      console.warn('当前环境不支持剪贴板 API');
      setCopied(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch (error) {
      console.error('复制分享链接失败', error);
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
          <h2>行程详情</h2>
        </div>
        <p className="empty">请选择或生成一个行程以查看安排。</p>
      </div>
    );
  }

  const totalActivities = itinerary.items.length;
  const collaboratorCount = itinerary.collaborators?.length || 0;
  const durationDays = itinerary.startDate && itinerary.endDate
    ? dayjs(itinerary.endDate).diff(dayjs(itinerary.startDate), 'day') + 1
    : null;
  const itinerarySummary = itinerary.preferences?.aiSummary || '自定义行程';

  return (
    <div className="panel stretch" aria-busy={loading}>
      <div className="panel-header">
        <div>
          <h2>{itinerary.title}</h2>
          <p className="panel-subtitle">
            {itinerary.destination || '未填写目的地'} · {itinerarySummary}
          </p>
        </div>
        <div className="panel-actions">
          <button type="button" className="secondary" onClick={() => onOptimize(itinerary.id)}>
            优化顺序
          </button>
          <button type="button" className="secondary" onClick={() => onSync(itinerary.id)}>
            同步到日历
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div>
          <span className="label">时间安排</span>
          <strong>{formatTimeRange(itinerary.startDate, itinerary.endDate)}</strong>
        </div>
        <div>
          <span className="label">类型</span>
          <strong className={`badge badge-${itinerary.type}`}>{formatType(itinerary.type)}</strong>
        </div>
        <div>
          <span className="label">持续时间</span>
          <strong>{durationDays ? `${durationDays} 天` : '时间灵活'}</strong>
        </div>
        <div>
          <span className="label">活动数量</span>
          <strong>{totalActivities}</strong>
        </div>
        <div className="share-link">
          <span className="label">分享链接</span>
          <a href={shareLink} onClick={(event) => event.preventDefault()}>{shareLink}</a>
          <button type="button" className="ghost" onClick={handleCopyShareLink} disabled={!shareLink}>
            {copied ? '已复制！' : '复制链接'}
          </button>
        </div>
        <div>
          <span className="label">协作者</span>
          <strong>{collaboratorCount}</strong>
        </div>
      </div>

      <div className="timeline">
        <h3>日程安排</h3>
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
                    <span className={`badge badge-category-${category}`}>{categoryLabels[category] || '通用'}</span>
                    <span className="badge badge-outline">{formatTravelMode(item.travelMode)}</span>
                  </div>
                  {item.notes && <p className="notes">{item.notes}</p>}
                </div>
                <div className="timeline-actions">
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() => onDeleteItem(itinerary.id, item.id)}
                    aria-label={`删除 ${item.name}`}
                  >
                    删除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {itinerary.items.length === 0 && <p className="empty">暂时没有活动，请前往“添加活动”页面。</p>}
      </div>
    </div>
  );
}
