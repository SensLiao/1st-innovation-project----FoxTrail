import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useMatch,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import api from './api';
import ItineraryList from './components/ItineraryList.jsx';
import NewItineraryForm from './components/NewItineraryForm.jsx';
import ItineraryDetails from './components/ItineraryDetails.jsx';
import NewItemForm from './components/NewItemForm.jsx';
import AIGeneratorForm from './components/AIGeneratorForm.jsx';

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
  const itineraryMatch = useMatch('/itineraries/:id');
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
          navigate('/itineraries', { replace: true });
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
          navigate('/itineraries', { replace: true });
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
      navigate(`/itineraries/${response.data.id}`);
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
      navigate(`/itineraries/${itineraryId}`);
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

  const handleSelect = (id) => {
    if (id === selectedId) return;
    setSelectedId(id);
    navigate(`/itineraries/${id}`);
  };

  const handleGenerate = async (payload) => {
    setAiLoading(true);
    try {
      const response = await api.post('/api/itineraries/generate', payload);
      setStatus({ type: 'success', message: '已生成 AI 行程。' });
      await fetchItineraries();
      setSelectedId(response.data.id);
      navigate(`/itineraries/${response.data.id}`);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'AI 行程生成失败。') });
      throw error;
    } finally {
      setAiLoading(false);
    }
  };

  const dashboardItineraries = useMemo(
    () =>
      itineraries
        .slice()
        .sort((a, b) => {
          const startA = a.startDate ? dayjs(a.startDate) : null;
          const startB = b.startDate ? dayjs(b.startDate) : null;

          if (startA && startB) {
            return startA.valueOf() - startB.valueOf();
          }

          if (startA) return -1;
          if (startB) return 1;

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
      <header className="app-header">
        <div>
          <h1>FoxTrail 行程助手</h1>
          <p>为学习、旅行与日常通勤制定更聪明的行程。</p>
          <nav className="app-nav">
            <NavLink to="/itineraries" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              行程概览
            </NavLink>
            <NavLink to="/create" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              创建行程
            </NavLink>
            <NavLink to="/activities/new" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              添加活动
            </NavLink>
            <NavLink to="/ai" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              AI 助手
            </NavLink>
          </nav>
        </div>
        {status && <div className={`status status-${status.type}`}>{status.message}</div>}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/itineraries" replace />} />
          <Route
            path="/itineraries"
            element={
              <ItinerariesPage
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
            path="/itineraries/:id"
            element={
              <ItinerariesPage
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
          <Route path="/create" element={<CreateItineraryPage onCreate={handleCreateItinerary} loading={loading} />} />
          <Route
            path="/activities/new"
            element={<NewActivityPage itineraries={dashboardItineraries} onAdd={handleAddItem} selectedId={selectedId} />}
          />
          <Route path="/ai" element={<AIPage onGenerate={handleGenerate} loading={aiLoading} />} />
          <Route path="*" element={<Navigate to="/itineraries" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ItinerariesPage({
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
            <h2>活动管理</h2>
          </div>
          {listLoading ? (
            <p>行程列表加载中…</p>
          ) : hasItineraries ? (
            selectedId ? (
              <>
                <p>为当前行程添加新的活动。</p>
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
