import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import api from './api';
import ItineraryList from './components/ItineraryList.jsx';
import NewItineraryForm from './components/NewItineraryForm.jsx';
import ItineraryDetails from './components/ItineraryDetails.jsx';
import NewItemForm from './components/NewItemForm.jsx';
import AIGeneratorForm from './components/AIGeneratorForm.jsx';

const TYPE_LABELS = { trip: '旅行', daily: '日常', commute: '通勤', custom: '自定义' };
const TRAVEL_MODE_LABELS = { walk: '步行', 'public-transit': '公共交通', drive: '驾车', bike: '骑行' };
const BUDGET_LEVELS = {
  frugal: { label: '节省', base: 420 },
  moderate: { label: '均衡', base: 960 },
  premium: { label: '进阶', base: 1680 },
  luxury: { label: '奢华', base: 2680 },
};
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function useStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!status) {
      return undefined;
    }

    const timeout = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  const showStatus = useCallback((payload) => {
    setStatus(payload);
  }, []);

  return [status, showStatus];
}

function resolveItemDate(itinerary, item) {
  if (!itinerary || !item) return null;
  if (item.startTime) {
    const parsed = dayjs(item.startTime);
    if (parsed.isValid()) {
      return parsed;
    }
  }
  if (itinerary.startDate && item.day != null) {
    const base = dayjs(itinerary.startDate);
    if (base.isValid()) {
      const offset = Number(item.day) - 1;
      return base.add(Number.isNaN(offset) ? 0 : offset, 'day');
    }
  }
  return null;
}

function computeItineraryAnalytics(itinerary) {
  if (!itinerary) return null;
  const items = Array.isArray(itinerary.items) ? itinerary.items : [];
  let totalMinutes = 0;
  let earliestStart = null;
  let latestEnd = null;
  const modeCount = {};

  items.forEach((item) => {
    const start = item.startTime ? dayjs(item.startTime) : resolveItemDate(itinerary, item);
    const end = item.endTime ? dayjs(item.endTime) : null;

    if (start?.isValid()) {
      if (!earliestStart || start.isBefore(earliestStart)) {
        earliestStart = start;
      }
    }

    if (end?.isValid()) {
      if (!latestEnd || end.isAfter(latestEnd)) {
        latestEnd = end;
      }
    } else if (start?.isValid()) {
      if (!latestEnd || start.isAfter(latestEnd)) {
        latestEnd = start;
      }
    }

    if (start?.isValid() && end?.isValid()) {
      totalMinutes += Math.max(end.diff(start, 'minute'), 30);
    } else {
      totalMinutes += 90;
    }

    const mode = item.travelMode || 'walk';
    modeCount[mode] = (modeCount[mode] || 0) + 1;
  });

  const durationHours = Math.round((totalMinutes / 60) * 10) / 10;
  const startDate = itinerary.startDate ? dayjs(itinerary.startDate) : null;
  const endDate = itinerary.endDate ? dayjs(itinerary.endDate) : null;
  const daySpan =
    startDate?.isValid() && endDate?.isValid()
      ? Math.max(endDate.startOf('day').diff(startDate.startOf('day'), 'day') + 1, 1)
      : 1;

  const itemsPerDay = items.length ? Math.round((items.length / daySpan) * 10) / 10 : 0;
  const focusTags = itinerary.preferences?.focus || [];
  const budgetLevel = itinerary.preferences?.budget || 'moderate';
  const budgetConfig = BUDGET_LEVELS[budgetLevel] || BUDGET_LEVELS.moderate;
  const estimatedBudget = budgetConfig.base + items.length * 120;
  const intensityScore = Math.min(100, Math.round(itemsPerDay * 22 + durationHours * 2.4));
  const recoveryScore = Math.max(20, 100 - intensityScore + 10);
  const primaryMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'walk';

  return {
    durationHours,
    daySpan,
    itemsPerDay,
    itemCount: items.length,
    focusTags,
    budgetLevel,
    budgetLabel: budgetConfig.label,
    estimatedBudget,
    intensityScore,
    recoveryScore,
    modeCount,
    primaryMode,
    earliestStart: earliestStart || startDate,
    latestEnd: latestEnd || endDate,
  };
}

function buildDashboardCalendar(itineraries) {
  const now = dayjs();
  const start = now.subtract(now.day(), 'day').startOf('day');
  const days = [];

  for (let index = 0; index < 14; index += 1) {
    const date = start.add(index, 'day');
    const key = date.format('YYYY-MM-DD');
    days.push({
      key,
      date,
      dayLabel: date.format('D'),
      weekdayLabel: WEEKDAY_LABELS[date.day()],
      isToday: date.isSame(now, 'day'),
      isPast: date.isBefore(now, 'day'),
      items: [],
    });
  }

  const lookup = new Map(days.map((entry) => [entry.key, entry]));
  itineraries.forEach((itinerary) => {
    const items = itinerary.items || [];
    items.forEach((item) => {
      const resolved = resolveItemDate(itinerary, item);
      if (!resolved?.isValid()) return;
      const key = resolved.startOf('day').format('YYYY-MM-DD');
      const dayEntry = lookup.get(key);
      if (!dayEntry) return;
      const startTime = item.startTime ? dayjs(item.startTime) : null;
      dayEntry.items.push({
        id: item.id,
        name: item.name,
        time: startTime?.isValid() ? startTime.format('HH:mm') : null,
        itineraryTitle: itinerary.title,
        itineraryId: itinerary.id,
        type: itinerary.type || 'custom',
      });
    });
  });

  days.forEach((day) => {
    day.items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function generatePlanningTips(itinerary, upcomingActivities) {
  if (!itinerary) {
    return ['尚未选择行程，点击右侧的「新建行程」开始吧。'];
  }

  const tips = [];
  const now = dayjs();
  const startDate = itinerary.startDate ? dayjs(itinerary.startDate) : null;
  const endDate = itinerary.endDate ? dayjs(itinerary.endDate) : null;

  if (startDate?.isValid()) {
    const diff = startDate.startOf('day').diff(now.startOf('day'), 'day');
    if (diff > 3) {
      tips.push(`距离出发还有 ${diff} 天，提前确认交通与住宿安排。`);
    } else if (diff >= 1) {
      tips.push(`行程将在 ${diff} 天后开始，准备好证件与装备。`);
    } else if (diff === 0) {
      tips.push('行程今天开启，注意随时查看时间节点。');
    } else {
      tips.push('行程已在进行中，记录亮点并保持节奏。');
    }
  } else {
    tips.push('尚未设置出发日期，补全时间有助于日历同步。');
  }

  if (upcomingActivities.length > 0) {
    const next = upcomingActivities[0];
    const start = next.start;
    if (start?.isValid()) {
      tips.push(`下一项活动「${next.name}」将在 ${start.format('M月D日 HH:mm')} 开始。提前 15 分钟出发更稳妥。`);
    } else if (next.day != null) {
      tips.push(`下一项活动安排在第 ${next.day} 天，完善具体时间以获得提醒。`);
    }
  } else {
    tips.push('当前没有即将到来的活动，试着添加新的体验或学习任务。');
  }

  if (itinerary.preferences?.focus?.length) {
    tips.push(`本次行程关注：${itinerary.preferences.focus.join('、')}。提前准备相关素材。`);
  } else {
    tips.push('为行程添加兴趣关键词，让 AI 推荐更贴合的内容。');
  }

  if (endDate?.isValid() && startDate?.isValid()) {
    const duration = endDate.startOf('day').diff(startDate.startOf('day'), 'day') + 1;
    if (duration >= 5) {
      tips.push('行程天数较长，安排弹性休息日可缓解疲劳。');
    }
  }

  return tips.slice(0, 4);
}

function buildPlanRecommendations(itineraries) {
  if (!itineraries.length) return [];
  const now = dayjs();
  return itineraries
    .map((itinerary) => {
      const analytics = computeItineraryAnalytics(itinerary);
      const startDate = itinerary.startDate ? dayjs(itinerary.startDate) : null;
      const daysUntil = startDate?.isValid() ? startDate.startOf('day').diff(now.startOf('day'), 'day') : null;
      const focusScore = analytics?.focusTags?.length ? analytics.focusTags.length * 6 : 10;
      const freshnessScore = daysUntil != null ? Math.max(0, 28 - Math.abs(daysUntil)) : 12;
      const pacingScore = analytics ? Math.round((analytics.intensityScore + analytics.recoveryScore) / 2) : 45;
      const score = Math.min(100, pacingScore + focusScore + freshnessScore);
      return {
        itinerary,
        analytics,
        daysUntil,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function generateAiNarrative(itinerary, analytics) {
  if (!itinerary || !analytics) {
    return '使用 FoxTrail 的 AI 助手生成或优化行程，系统会自动评估节奏、预算与交通模式。';
  }
  const focusText = analytics.focusTags?.length ? analytics.focusTags.join('、') : '多主题';
  const pacingText =
    analytics.intensityScore > 70 ? '较为紧凑' : analytics.intensityScore > 45 ? '节奏均衡' : '相对轻松';
  const modeText = TRAVEL_MODE_LABELS[analytics.primaryMode] || '步行';
  const windowText =
    analytics.earliestStart && analytics.latestEnd
      ? `${analytics.earliestStart.format('M月D日 HH:mm')} - ${analytics.latestEnd.format('M月D日 HH:mm')}`
      : '时间待定';
  return `AI 评估该行程以 ${focusText} 为核心，整体${pacingText}，主要交通方式为${modeText}。关键时间段集中在 ${windowText}，可根据个人状态调整密度并优化预算使用。`;
}
export default function App() {
  const [itineraries, setItineraries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useStatus();
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const itineraryMatch = useMatch('/planner/:id') || useMatch('/itineraries/:id');
  const currentRouteId = itineraryMatch?.params?.id || null;

  const getErrorMessage = useCallback((error, fallback) => {
    return error?.response?.data?.message || error?.message || fallback;
  }, []);

  const fetchItineraries = useCallback(async () => {
    setListLoading(true);
    try {
      const response = await api.get('/api/itineraries');
      const data = response.data || [];
      setItineraries(data);

      if (!data.length) {
        setSelectedId(null);
        setSelectedItinerary(null);
        if (currentRouteId) {
          navigate('/planner', { replace: true });
        }
        return data;
      }

      const hasRouteSelection = currentRouteId && data.some((item) => item.id === currentRouteId);
      const hasCurrentSelection = selectedId && data.some((item) => item.id === selectedId);

      if (hasRouteSelection) {
        setSelectedId(currentRouteId);
      } else if (!hasCurrentSelection) {
        const firstId = data[0].id;
        setSelectedId(firstId);
        if (currentRouteId) {
          navigate('/planner', { replace: true });
        }
      }

      return data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, '无法加载行程。') });
      throw error;
    } finally {
      setListLoading(false);
    }
  }, [currentRouteId, getErrorMessage, navigate, selectedId, setStatus]);

  const fetchItinerary = useCallback(
    async (id) => {
      if (!id) {
        setSelectedItinerary(null);
        return null;
      }

      setDetailsLoading(true);
      try {
        const response = await api.get(`/api/itineraries/${id}`);
        setSelectedItinerary(response.data);
        return response.data;
      } catch (error) {
        setStatus({ type: 'error', message: getErrorMessage(error, '无法加载行程详情。') });
        throw error;
      } finally {
        setDetailsLoading(false);
      }
    },
    [getErrorMessage, setStatus]
  );

  useEffect(() => {
    fetchItineraries().catch(() => {});
  }, [fetchItineraries]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedItinerary(null);
      return;
    }

    setSelectedItinerary(null);
    fetchItinerary(selectedId).catch(() => {});
  }, [fetchItinerary, selectedId]);

  useEffect(() => {
    if (currentRouteId && currentRouteId !== selectedId) {
      setSelectedId(currentRouteId);
    }
  }, [currentRouteId, selectedId]);

  const handleCreateItinerary = async (form) => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        startDate: form.startDate ? dayjs(form.startDate).startOf('day').toISOString() : undefined,
        endDate: form.endDate ? dayjs(form.endDate).endOf('day').toISOString() : undefined,
      };
      const response = await api.post('/api/itineraries', payload);
      setStatus({ type: 'success', message: '行程创建成功。' });
      await fetchItineraries();
      setSelectedId(response.data.id);
      navigate(`/planner/${response.data.id}`);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, '无法创建行程。') });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (itineraryId, payload) => {
    if (!itineraryId) {
      setStatus({ type: 'error', message: '请选择一个行程后再添加活动。' });
      return;
    }

    try {
      await api.post(`/api/itineraries/${itineraryId}/items`, payload);
      setStatus({ type: 'success', message: '已添加活动到行程。' });
      await fetchItinerary(itineraryId);
      await fetchItineraries();
      setSelectedId(itineraryId);
      navigate(`/planner/${itineraryId}`);
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, '无法添加活动。') });
      throw error;
    }
  };

  const handleDeleteItem = async (itineraryId, itemId) => {
    try {
      await api.delete(`/api/itineraries/${itineraryId}/items/${itemId}`);
      setStatus({ type: 'success', message: '已删除活动。' });
      await fetchItinerary(itineraryId);
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, '无法删除活动。') });
      throw error;
    }
  };

  const handleOptimise = async (itineraryId) => {
    try {
      const response = await api.post(`/api/itineraries/${itineraryId}/optimize`);
      setStatus({ type: 'success', message: response.data.message });
      await fetchItinerary(itineraryId);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, '无法优化行程。') });
      throw error;
    }
  };

  const handleSync = async (itineraryId) => {
    try {
      const response = await api.post(`/api/itineraries/${itineraryId}/sync`);
      setStatus({ type: 'info', message: `已于 ${dayjs(response.data.syncedAt).format('HH:mm')} 同步。` });
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, '无法同步日历。') });
      throw error;
    }
  };

  const handleSelect = useCallback(
    (id, options = {}) => {
      if (id === selectedId) return;
      setSelectedId(id);
      if (!options.keepCurrentRoute) {
        navigate(`/planner/${id}`);
      }
    },
    [navigate, selectedId]
  );

  const handleGenerate = async (payload) => {
    setAiLoading(true);
    try {
      const response = await api.post('/api/itineraries/generate', payload);
      setStatus({ type: 'success', message: '已生成 AI 行程。' });
      await fetchItineraries();
      setSelectedId(response.data.id);
      navigate(`/planner/${response.data.id}`);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'AI 行程生成失败。') });
      throw error;
    } finally {
      setAiLoading(false);
    }
  };

  const openPlanner = useCallback(
    (id) => {
      const targetId = id || selectedId;
      if (targetId) {
        navigate(`/planner/${targetId}`);
      } else {
        navigate('/planner');
      }
    },
    [navigate, selectedId]
  );

  const openAddActivity = useCallback(
    (id) => {
      const targetId = id || selectedId;
      if (targetId) {
        navigate(`/activities/new?itinerary=${targetId}`);
      } else {
        navigate('/activities/new');
      }
    },
    [navigate, selectedId]
  );

  const openCreateItinerary = useCallback(() => {
    navigate('/create');
  }, [navigate]);

  const openAi = useCallback(() => {
    navigate('/ai');
  }, [navigate]);

  const dashboardItineraries = useMemo(
    () =>
      itineraries
        .slice()
        .sort((a, b) => {
          const startA = a.startDate ? dayjs(a.startDate) : null;
          const startB = b.startDate ? dayjs(b.startDate) : null;

          if (startA?.isValid() && startB?.isValid()) {
            return startA.valueOf() - startB.valueOf();
          }

          if (startA?.isValid()) return -1;
          if (startB?.isValid()) return 1;

          return a.title.localeCompare(b.title);
        })
        .map((itinerary) => ({
          ...itinerary,
          items: itinerary.items ? itinerary.items.slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) : [],
        })),
    [itineraries]
  );

  return (
    <div className="app">
      <SiteHeader isHome={location.pathname === '/'} status={status} />
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                itineraries={dashboardItineraries}
                onEnter={() => navigate('/dashboard')}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                itineraries={dashboardItineraries}
                selectedId={selectedId}
                selectedItinerary={selectedItinerary}
                onSelect={(id) => handleSelect(id, { keepCurrentRoute: true })}
                onOptimize={handleOptimise}
                onSync={handleSync}
                listLoading={listLoading}
                detailsLoading={detailsLoading}
                onCreateItinerary={openCreateItinerary}
                onAddActivity={openAddActivity}
                onOpenPlanner={openPlanner}
                onOpenAi={openAi}
                onGenerate={handleGenerate}
                aiLoading={aiLoading}
              />
            }
          />
          <Route
            path="/planner"
            element={
              <PlannerWorkspace
                itineraries={dashboardItineraries}
                selectedId={selectedId}
                selectedItinerary={selectedItinerary}
                onSelect={handleSelect}
                onOptimize={handleOptimise}
                onSync={handleSync}
                onDeleteItem={handleDeleteItem}
                listLoading={listLoading}
                detailsLoading={detailsLoading}
              />
            }
          />
          <Route
            path="/planner/:id"
            element={
              <PlannerWorkspace
                itineraries={dashboardItineraries}
                selectedId={selectedId}
                selectedItinerary={selectedItinerary}
                onSelect={handleSelect}
                onOptimize={handleOptimise}
                onSync={handleSync}
                onDeleteItem={handleDeleteItem}
                listLoading={listLoading}
                detailsLoading={detailsLoading}
              />
            }
          />
          <Route path="/itineraries" element={<LegacyItineraryRedirect />} />
          <Route path="/itineraries/:id" element={<LegacyItineraryRedirect />} />
          <Route path="/create" element={<CreateItineraryPage onCreate={handleCreateItinerary} loading={loading} />} />
          <Route
            path="/activities/new"
            element={<NewActivityPage itineraries={dashboardItineraries} onAdd={handleAddItem} selectedId={selectedId} />}
          />
          <Route path="/ai" element={<AIPage onGenerate={handleGenerate} loading={aiLoading} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
function SiteHeader({ isHome, status }) {
  return (
    <header className={`app-header ${isHome ? 'home' : ''}`}>
      <div className="app-header-top">
        <div className="app-brand">
          <span className="brand-mark" aria-hidden="true">
            🦊
          </span>
          <div>
            <span className="brand-name">FoxTrail</span>
            <span className="brand-tagline">智能行程工作台</span>
          </div>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            首页
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            仪表盘
          </NavLink>
          <NavLink to="/planner" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            规划工作台
          </NavLink>
          <NavLink to="/create" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            新建行程
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
            AI 助手
          </NavLink>
        </nav>
      </div>
      {!isHome && <p className="app-header-note">随时在仪表盘浏览即将到来的任务、日历视图与 AI 建议。</p>}
      {status && <div className={`status status-${status.type}`}>{status.message}</div>}
    </header>
  );
}

function HomePage({ itineraries, onEnter }) {
  const totalItineraries = itineraries.length;
  const totalActivities = itineraries.reduce((acc, item) => acc + (item.items?.length || 0), 0);
  const destinations = Array.from(new Set(itineraries.map((item) => item.destination).filter(Boolean)));
  const upcoming = itineraries
    .filter((item) => {
      if (!item.startDate) return false;
      const start = dayjs(item.startDate);
      return start.isAfter(dayjs().subtract(1, 'day'));
    })
    .sort((a, b) => {
      const aStart = a.startDate ? dayjs(a.startDate) : dayjs.invalid();
      const bStart = b.startDate ? dayjs(b.startDate) : dayjs.invalid();
      if (aStart.isValid() && bStart.isValid()) return aStart.valueOf() - bStart.valueOf();
      if (aStart.isValid()) return -1;
      if (bStart.isValid()) return 1;
      return a.title.localeCompare(b.title);
    });
  const nextItinerary = upcoming[0] || itineraries[0] || null;
  const nextStart = nextItinerary?.startDate ? dayjs(nextItinerary.startDate) : null;
  const nextCountdown = nextStart?.isValid() ? nextStart.startOf('day').diff(dayjs().startOf('day'), 'day') : null;

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-content">
          <h1>FoxTrail 智能行程空间</h1>
          <p>
            将学习、出差与旅行的计划集中到一个空间。FoxTrail 仪表盘把待办、日历与 AI 优化结果串联起来，
            让每一次出发都胸有成竹。
          </p>
          <div className="home-stats">
            <div>
              <span className="stat-label">规划中的行程</span>
              <strong>{totalItineraries || '0'}</strong>
            </div>
            <div>
              <span className="stat-label">已排定活动</span>
              <strong>{totalActivities || '0'}</strong>
            </div>
            <div>
              <span className="stat-label">目的地</span>
              <strong>{destinations.length || '1'}</strong>
            </div>
          </div>
          <div className="home-actions">
            <button type="button" className="primary" onClick={onEnter}>
              进入仪表盘
            </button>
            <NavLink to="/planner" className="ghost-link">
              查看规划工作台 →
            </NavLink>
          </div>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-card">
            <span className="card-label">下一段旅程</span>
            <h3>{nextItinerary ? nextItinerary.title : '等待你的下一个想法'}</h3>
            <p>
              {nextItinerary?.destination || '欢迎创建新的目的地'}
              {nextCountdown != null && (
                <span className="countdown">{nextCountdown >= 0 ? ` · ${nextCountdown} 天后出发` : ' · 进行中'}</span>
              )}
            </p>
            <ul>
              <li>活动数量：{nextItinerary?.items?.length || 0}</li>
              <li>关注主题：{nextItinerary?.preferences?.focus?.join('、') || '尚未设置'}</li>
              <li>AI 摘要：{nextItinerary?.preferences?.aiSummary || '等待生成'}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <article className="feature-card">
          <h3>当前规划总览</h3>
          <p>登陆仪表盘即可查看即将到来的任务、提醒与关键指标，随时同步进度。</p>
        </article>
        <article className="feature-card">
          <h3>日历式时间轴</h3>
          <p>二周日历视图结合活动标签，灵感与待办一眼即明。</p>
        </article>
        <article className="feature-card">
          <h3>AI 行程优化</h3>
          <p>自动评估预算、节奏与交通，生成更符合你节奏的安排。</p>
        </article>
        <article className="feature-card">
          <h3>多端衔接</h3>
          <p>后续可无缝同步到 Outlook / Google Calendar，并接入地图与天气数据。</p>
        </article>
      </section>
    </div>
  );
}
function DashboardPage({
  itineraries,
  selectedId,
  selectedItinerary,
  onSelect,
  onOptimize,
  onSync,
  listLoading,
  detailsLoading,
  onCreateItinerary,
  onAddActivity,
  onOpenPlanner,
  onOpenAi,
  onGenerate,
  aiLoading,
}) {
  const calendarWeeks = useMemo(() => buildDashboardCalendar(itineraries), [itineraries]);
  const recommendations = useMemo(() => buildPlanRecommendations(itineraries), [itineraries]);
  const recommendedMatch = recommendations.find((item) => item.itinerary.id === selectedId);
  const spotlightItinerary =
    selectedItinerary || recommendedMatch?.itinerary || recommendations[0]?.itinerary || itineraries[0] || null;
  const analytics = useMemo(() => computeItineraryAnalytics(spotlightItinerary), [spotlightItinerary]);

  const upcomingActivities = useMemo(() => {
    if (!spotlightItinerary) return [];
    return (spotlightItinerary.items || [])
      .map((item) => ({
        ...item,
        start: resolveItemDate(spotlightItinerary, item),
      }))
      .filter((item) => item.start?.isValid())
      .sort((a, b) => a.start.valueOf() - b.start.valueOf())
      .slice(0, 3);
  }, [spotlightItinerary]);

  const planningTips = useMemo(
    () => generatePlanningTips(spotlightItinerary, upcomingActivities),
    [spotlightItinerary, upcomingActivities]
  );
  const aiNarrative = useMemo(() => generateAiNarrative(spotlightItinerary, analytics), [spotlightItinerary, analytics]);

  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        <section className="panel dashboard-panel planning-module" id="dashboard-planning">
          <CurrentPlanningPanel
            itinerary={spotlightItinerary}
            analytics={analytics}
            tips={planningTips}
            upcomingActivities={upcomingActivities}
            onOptimize={onOptimize}
            onSync={onSync}
            onAddActivity={onAddActivity}
            onOpenPlanner={onOpenPlanner}
            onCreateItinerary={onCreateItinerary}
            detailsLoading={detailsLoading}
          />
        </section>

        <section className="panel dashboard-panel ai-module" id="dashboard-ai">
          <AiPlannerPanel
            itinerary={spotlightItinerary}
            analytics={analytics}
            narrative={aiNarrative}
            onGenerate={onGenerate}
            loading={aiLoading}
            onOpenAi={onOpenAi}
          />
        </section>
      </div>

      <aside className="dashboard-sidebar">
        <section className="panel dashboard-panel calendar-module" id="dashboard-calendar">
          <CalendarPanel weeks={calendarWeeks} onAddActivity={onAddActivity} onOpenPlanner={onOpenPlanner} />
        </section>

        <section className="panel dashboard-panel decision-module" id="dashboard-decisions">
          <PlanDecisionPanel
            recommendations={recommendations}
            selectedId={selectedId}
            onSelect={onSelect}
            onOpenPlanner={onOpenPlanner}
          />
        </section>

        <div className="dashboard-list">
          <ItineraryList itineraries={itineraries} selectedId={selectedId} onSelect={onSelect} loading={listLoading} />
          <div className="dashboard-list-actions">
            <button type="button" className="secondary" onClick={onCreateItinerary}>
              新建行程
            </button>
            <button type="button" className="ghost" onClick={onOpenAi}>
              打开 AI 工作台
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CurrentPlanningPanel({
  itinerary,
  analytics,
  tips,
  upcomingActivities,
  onOptimize,
  onSync,
  onAddActivity,
  onOpenPlanner,
  onCreateItinerary,
  detailsLoading,
}) {
  if (!itinerary) {
    return (
      <div className="planning-empty">
        <h2>欢迎来到 FoxTrail 仪表盘</h2>
        <p>创建你的第一个行程后，这里会展示实时提醒、图像化指标与时间轴预览。</p>
        <div className="planning-empty-actions">
          <button type="button" className="primary" onClick={onCreateItinerary}>
            新建行程
          </button>
          <button type="button" className="ghost" onClick={() => onOpenPlanner()}>
            浏览工作台
          </button>
        </div>
      </div>
    );
  }

  const startDate = itinerary.startDate ? dayjs(itinerary.startDate) : null;
  const countdown = startDate?.isValid() ? startDate.startOf('day').diff(dayjs().startOf('day'), 'day') : null;
  const mainModeCount = analytics?.modeCount?.[analytics.primaryMode] || 0;
  const modeRatio = analytics?.itemCount ? Math.round((mainModeCount / Math.max(analytics.itemCount, 1)) * 100) : 0;

  return (
    <>
      <div className="planning-hero">
        <div className="planning-info">
          <span className="planning-label">当前规划</span>
          <h2>{itinerary.title}</h2>
          <p>
            {itinerary.destination || '未设置目的地'} · {analytics?.focusTags?.join('、') || '等待个性化偏好'}
          </p>
          <div className="planning-metrics">
            <div>
              <span className="label">出发倒计时</span>
              <strong>
                {countdown != null ? (countdown > 0 ? `${countdown} 天` : countdown === 0 ? '今天' : '进行中') : '待定'}
              </strong>
            </div>
            <div>
              <span className="label">活动数量</span>
              <strong>{analytics?.itemCount ?? itinerary.items?.length ?? 0}</strong>
            </div>
            <div>
              <span className="label">预计预算</span>
              <strong>￥{analytics ? analytics.estimatedBudget : '—'}</strong>
            </div>
            <div>
              <span className="label">节奏评估</span>
              <strong>{analytics ? `${analytics.intensityScore} / 100` : '—'}</strong>
            </div>
          </div>
          <div className="planning-actions">
            <button type="button" className="primary" onClick={() => onOptimize(itinerary.id)}>
              一键优化
            </button>
            <button type="button" className="secondary" onClick={() => onAddActivity(itinerary.id)}>
              添加活动
            </button>
            <button type="button" className="ghost" onClick={() => onSync(itinerary.id)}>
              同步日历
            </button>
            <button type="button" className="ghost" onClick={() => onOpenPlanner(itinerary.id)}>
              打开工作台
            </button>
          </div>
        </div>
        <div className="planning-visual" aria-hidden="true">
          <div className="visual-card">
            <span>节奏指数</span>
            <strong>{analytics ? analytics.intensityScore : 0}</strong>
            <div className="visual-progress">
              <span style={{ width: `${analytics ? Math.min(analytics.intensityScore, 100) : 0}%` }} />
            </div>
            <p>{analytics?.intensityScore > 70 ? '记得安排休息时间。' : '节奏舒适，可持续推进。'}</p>
            <div className="visual-note">
              <span>主要交通：{analytics ? TRAVEL_MODE_LABELS[analytics.primaryMode] || '步行' : '—'}</span>
              <span>占比：{modeRatio}%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="planning-tips">
        <h3>今日提醒</h3>
        <ul>
          {tips.map((tip, index) => (
            <li key={`tip-${index}`}>{tip}</li>
          ))}
        </ul>
      </div>
      <div className="timeline-preview" aria-busy={detailsLoading}>
        <h3>即将到来的活动</h3>
        {detailsLoading ? (
          <p>加载行程详情中…</p>
        ) : upcomingActivities.length ? (
          <ul>
            {upcomingActivities.map((activity) => (
              <li key={activity.id}>
                <div>
                  <span className="time">
                    {activity.start?.isValid() ? activity.start.format('M月D日 HH:mm') : '时间待定'}
                  </span>
                  <span className="name">{activity.name}</span>
                </div>
                {activity.location && <span className="location">{activity.location}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">暂时没有即将到来的活动，可以添加新的任务。</p>
        )}
      </div>
    </>
  );
}

function CalendarPanel({ weeks, onAddActivity, onOpenPlanner }) {
  return (
    <div>
      <div className="panel-header">
        <div>
          <h2>二周行程日历</h2>
          <p className="panel-subtitle">与 Outlook 风格类似的紧凑视图，快速了解重点。</p>
        </div>
        <div className="panel-actions">
          <button type="button" className="ghost" onClick={() => onOpenPlanner()}>
            查看全部
          </button>
          <button type="button" className="secondary" onClick={() => onAddActivity()}>
            添加活动
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="calendar-row">
            {week.map((day) => (
              <div
                key={day.key}
                className={`calendar-day ${day.isToday ? 'today' : ''} ${day.isPast ? 'past' : ''} ${
                  day.items.length ? 'has-items' : ''
                }`}
              >
                <div className="calendar-day-header">
                  <span className="weekday">{day.weekdayLabel}</span>
                  <span className="date">{day.dayLabel}</span>
                </div>
                <div className="calendar-items">
                  {day.items.slice(0, 3).map((item) => (
                    <span key={item.id} className={`calendar-item badge-${item.type || 'custom'}`}>
                      {item.time ? `${item.time} · ${item.name}` : item.name}
                    </span>
                  ))}
                  {day.items.length > 3 && <span className="calendar-more">+{day.items.length - 3}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function AiPlannerPanel({ itinerary, analytics, narrative, onGenerate, loading, onOpenAi }) {
  const modeCount = analytics?.modeCount || {};
  const primaryCount = analytics?.primaryMode ? modeCount[analytics.primaryMode] || 0 : 0;
  const modeRatio = analytics?.itemCount ? Math.round((primaryCount / Math.max(analytics.itemCount, 1)) * 100) : 0;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h2>AI 行程优化中心</h2>
          <p className="panel-subtitle">结合预算、节奏与交通方式的综合评估。</p>
        </div>
        <button type="button" className="ghost" onClick={onOpenAi}>
          打开完整助手
        </button>
      </div>
      {itinerary ? (
        <div className="ai-metrics">
          <div className="metric-card">
            <span className="label">预计时长</span>
            <strong>{analytics ? `${analytics.durationHours} 小时` : '计算中'}</strong>
            <span className="metric-trend">
              覆盖 {analytics?.daySpan ?? 1} 天 / {analytics?.itemCount ?? 0} 项活动
            </span>
          </div>
          <div className="metric-card">
            <span className="label">预算档位</span>
            <strong>{analytics ? `${analytics.budgetLabel} · ￥${analytics.estimatedBudget}` : '待定'}</strong>
            <span className="metric-trend">AI 将结合价格类 API 进一步细化。</span>
          </div>
          <div className="metric-card">
            <span className="label">节奏指数</span>
            <strong>{analytics?.intensityScore ?? 0}/100</strong>
            <span className="metric-trend">休息充足度：{analytics ? `${analytics.recoveryScore}/100` : '—'}</span>
          </div>
          <div className="metric-card">
            <span className="label">交通模式</span>
            <strong>{analytics ? TRAVEL_MODE_LABELS[analytics.primaryMode] || '步行' : '待定'}</strong>
            <span className="metric-trend">占比约 {modeRatio}%</span>
          </div>
        </div>
      ) : (
        <p className="empty">创建一个行程后即可看到预算、节奏与交通的综合评分。</p>
      )}
      <p className="ai-narrative">{narrative}</p>
      <div className="ai-generator">
        <h3>快速生成新行程</h3>
        <AIGeneratorForm onGenerate={onGenerate} loading={loading} embedded />
      </div>
    </div>
  );
}

function PlanDecisionPanel({ recommendations, selectedId, onSelect, onOpenPlanner }) {
  if (!recommendations.length) {
    return (
      <div>
        <div className="panel-header">
          <h2>下一步选择</h2>
          <p className="panel-subtitle">创建行程后，这里会根据 AI 评分给出推荐。</p>
        </div>
        <p className="empty">目前还没有行程候选。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-header">
        <h2>下一步选择</h2>
        <p className="panel-subtitle">AI 推荐优先处理的行程，结合分数快速决策。</p>
      </div>
      <div className="decision-list">
        {recommendations.map((item) => {
          const { itinerary, analytics, daysUntil, score } = item;
          const durationText = analytics?.daySpan ? `${analytics.daySpan} 天` : '时间灵活';
          const countdownText =
            daysUntil != null ? (daysUntil > 0 ? `${daysUntil} 天后` : daysUntil === 0 ? '今天' : '进行中') : '待定';
          const isActive = selectedId === itinerary.id;

          const handleView = () => {
            onSelect(itinerary.id);
            onOpenPlanner(itinerary.id);
          };

          return (
            <article key={itinerary.id} className={`decision-card ${isActive ? 'active' : ''}`}>
              <div className="decision-score">
                <strong>{score}</strong>
                <span>推荐指数</span>
              </div>
              <div className="decision-body">
                <h3>{itinerary.title}</h3>
                <p>
                  {TYPE_LABELS[itinerary.type] || TYPE_LABELS.custom} · {durationText} · {analytics?.itemCount ?? 0} 项活动
                </p>
                <span className="countdown">出发：{countdownText}</span>
              </div>
              <div className="decision-actions">
                <button type="button" className="secondary" onClick={() => onSelect(itinerary.id)}>
                  设为当前
                </button>
                <button type="button" className="ghost" onClick={handleView}>
                  查看详情
                </button>
              </div>
              <div className="decision-progress">
                <span style={{ width: `${score}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function PlannerWorkspace({
  itineraries,
  selectedId,
  selectedItinerary,
  onSelect,
  onOptimize,
  onSync,
  onDeleteItem,
  listLoading,
  detailsLoading,
}) {
  const navigate = useNavigate();
  const hasItineraries = itineraries.length > 0;

  const handleAddActivityClick = () => {
    if (selectedId) {
      navigate(`/activities/new?itinerary=${selectedId}`);
    } else {
      navigate('/activities/new');
    }
  };

  return (
    <div className="layout">
      <section className="column column-wide">
        <ItineraryDetails
          itinerary={selectedItinerary}
          loading={detailsLoading}
          onOptimize={onOptimize}
          onSync={onSync}
          onDeleteItem={onDeleteItem}
        />
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>工作台操作</h2>
              <p className="panel-subtitle">在此维护活动列表并与仪表盘保持同步。</p>
            </div>
            <button type="button" className="ghost" onClick={() => navigate('/dashboard')}>
              返回仪表盘
            </button>
          </div>
          {listLoading ? (
            <p>行程列表加载中…</p>
          ) : hasItineraries ? (
            selectedId ? (
              <>
                <p>为当前行程添加新的活动或任务。</p>
                <button type="button" className="secondary" onClick={handleAddActivityClick}>
                  添加活动
                </button>
              </>
            ) : (
              <p>请选择一个行程后再添加活动。</p>
            )
          ) : (
            <p>暂时还没有行程，请先创建一个新行程。</p>
          )}
        </div>
      </section>
      <aside className="column column-side">
        <ItineraryList itineraries={itineraries} selectedId={selectedId} onSelect={onSelect} loading={listLoading} />
      </aside>
    </div>
  );
}

function CreateItineraryPage({ onCreate, loading }) {
  return (
    <div className="layout single-column">
      <section className="column column-wide">
        <NewItineraryForm onCreate={onCreate} loading={loading} />
      </section>
    </div>
  );
}

function AIPage({ onGenerate, loading }) {
  return (
    <div className="layout single-column">
      <section className="column column-wide">
        <AIGeneratorForm onGenerate={onGenerate} loading={loading} />
      </section>
    </div>
  );
}

function NewActivityPage({ itineraries, onAdd, selectedId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryItinerary = searchParams.get('itinerary') || '';
  const defaultItineraryId = queryItinerary || selectedId || '';
  const hasItineraries = itineraries.length > 0;

  return (
    <div className="layout single-column">
      <section className="column column-wide">
        <div className="panel">
          <div className="panel-header">
            <h2>添加行程活动</h2>
            <button type="button" className="ghost" onClick={() => navigate(-1)}>
              返回
            </button>
          </div>
          {hasItineraries ? (
            <NewItemForm itineraries={itineraries} defaultItineraryId={defaultItineraryId} onAdd={onAdd} />
          ) : (
            <p className="empty">请先创建行程，再来添加活动。</p>
          )}
        </div>
      </section>
    </div>
  );
}

function LegacyItineraryRedirect() {
  const params = useParams();
  const target = params.id ? `/planner/${params.id}` : '/planner';
  return <Navigate to={target} replace />;
}
