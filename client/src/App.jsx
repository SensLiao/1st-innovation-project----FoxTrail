import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
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

  const getErrorMessage = useCallback((error, fallback) => {
    return error?.response?.data?.message || error?.message || fallback;
  }, []);

  const fetchItineraries = async () => {
    setListLoading(true);
    try {
      const response = await api.get('/api/itineraries');
      setItineraries(response.data);

      if (response.data.length) {
        if (!selectedId) {
          const firstId = response.data[0].id;
          setSelectedId(firstId);
        }
      } else {
        setSelectedId(null);
        setSelectedItinerary(null);
      }

      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to load itineraries.') });
      throw error;
    } finally {
      setListLoading(false);
    }
  };

  const fetchItinerary = async (id) => {
    if (!id) return null;

    setDetailsLoading(true);
    try {
      const response = await api.get(`/api/itineraries/${id}`);
      setSelectedItinerary(response.data);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to load itinerary details.') });
      throw error;
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedItinerary(null);
      return;
    }

    setSelectedItinerary(null);
    fetchItinerary(selectedId).catch(() => {});
  }, [selectedId]);

  const handleCreateItinerary = async (form) => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        startDate: form.startDate ? dayjs(form.startDate).startOf('day').toISOString() : undefined,
        endDate: form.endDate ? dayjs(form.endDate).endOf('day').toISOString() : undefined
      };
      const response = await api.post('/api/itineraries', payload);
      setStatus({ type: 'success', message: 'Itinerary created successfully.' });
      await fetchItineraries();
      setSelectedId(response.data.id);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to create itinerary.') });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (payload) => {
    if (!selectedId) return;

    try {
      await api.post(`/api/itineraries/${selectedId}/items`, payload);
      setStatus({ type: 'success', message: 'Activity added to itinerary.' });
      await fetchItinerary(selectedId);
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to add activity.') });
      throw error;
    }
  };

  const handleDeleteItem = async (itineraryId, itemId) => {
    try {
      await api.delete(`/api/itineraries/${itineraryId}/items/${itemId}`);
      setStatus({ type: 'success', message: 'Activity removed.' });
      await fetchItinerary(itineraryId);
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to remove activity.') });
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
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to optimise itinerary.') });
      throw error;
    }
  };

  const handleSync = async (itineraryId) => {
    try {
      const response = await api.post(`/api/itineraries/${itineraryId}/sync`);
      setStatus({ type: 'info', message: `Synced at ${dayjs(response.data.syncedAt).format('HH:mm')}` });
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Failed to sync calendar.') });
      throw error;
    }
  };

  const handleSelect = (id) => {
    if (id === selectedId) return;
    setSelectedId(id);
  };

  const handleGenerate = async (payload) => {
    setAiLoading(true);
    try {
      const response = await api.post('/api/itineraries/generate', payload);
      setStatus({ type: 'success', message: 'AI itinerary generated.' });
      await fetchItineraries();
      setSelectedId(response.data.id);
      return response.data;
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'AI generation failed.') });
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
          items: itinerary.items ? itinerary.items.slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) : []
        })),
    [itineraries]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>FoxTrail Planner</h1>
          <p>Plan smarter journeys for study, travel and daily commutes.</p>
        </div>
        {status && <div className={`status status-${status.type}`}>{status.message}</div>}
      </header>

      <main className="layout">
        <section className="column column-wide">
          <ItineraryDetails
            itinerary={selectedItinerary}
            loading={detailsLoading}
            onOptimize={handleOptimise}
            onSync={handleSync}
            onDeleteItem={handleDeleteItem}
          />
          {selectedId && <NewItemForm onAdd={handleAddItem} disabled={detailsLoading} />}
        </section>
        <aside className="column column-side">
          <ItineraryList
            itineraries={dashboardItineraries}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={listLoading}
          />
          <NewItineraryForm onCreate={handleCreateItinerary} loading={loading} />
          <AIGeneratorForm onGenerate={handleGenerate} loading={aiLoading} />
        </aside>
      </main>
    </div>
  );
}
