import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import api from './api';
import ItineraryList from './components/ItineraryList.jsx';
import NewItineraryForm from './components/NewItineraryForm.jsx';
import ItineraryDetails from './components/ItineraryDetails.jsx';
import NewItemForm from './components/NewItemForm.jsx';
import AIGeneratorForm from './components/AIGeneratorForm.jsx';

function useStatus() {
  const [status, setStatus] = useState(null);

  const showStatus = (payload) => {
    setStatus(payload);
    if (payload) {
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return [status, showStatus];
}

export default function App() {
  const [itineraries, setItineraries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useStatus();

  const fetchItineraries = async () => {
    const response = await api.get('/api/itineraries');
    setItineraries(response.data);
    if (response.data.length && !selectedId) {
      const firstId = response.data[0].id;
      setSelectedId(firstId);
    }
  };

  const fetchItinerary = async (id) => {
    const response = await api.get(`/api/itineraries/${id}`);
    setSelectedItinerary(response.data);
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchItinerary(selectedId);
    }
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
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create itinerary.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (payload) => {
    if (!selectedId) return;
    await api.post(`/api/itineraries/${selectedId}/items`, payload);
    setStatus({ type: 'success', message: 'Activity added to itinerary.' });
    await fetchItinerary(selectedId);
  };

  const handleDeleteItem = async (itineraryId, itemId) => {
    await api.delete(`/api/itineraries/${itineraryId}/items/${itemId}`);
    setStatus({ type: 'success', message: 'Activity removed.' });
    await fetchItinerary(itineraryId);
  };

  const handleOptimise = async (itineraryId) => {
    const response = await api.post(`/api/itineraries/${itineraryId}/optimize`);
    setStatus({ type: 'success', message: response.data.message });
    await fetchItinerary(itineraryId);
  };

  const handleSync = async (itineraryId) => {
    const response = await api.post(`/api/itineraries/${itineraryId}/sync`);
    setStatus({ type: 'info', message: `Synced at ${dayjs(response.data.syncedAt).format('HH:mm')}` });
  };

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleGenerate = async (payload) => {
    setAiLoading(true);
    try {
      const response = await api.post('/api/itineraries/generate', payload);
      setStatus({ type: 'success', message: 'AI itinerary generated.' });
      await fetchItineraries();
      setSelectedId(response.data.id);
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'AI generation failed.' });
    } finally {
      setAiLoading(false);
    }
  };

  const dashboardItineraries = useMemo(
    () => itineraries.map((itinerary) => ({
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
            onOptimize={handleOptimise}
            onSync={handleSync}
            onDeleteItem={handleDeleteItem}
          />
          {selectedId && <NewItemForm onAdd={handleAddItem} disabled={!selectedId} />}
        </section>
        <aside className="column column-side">
          <ItineraryList itineraries={dashboardItineraries} selectedId={selectedId} onSelect={handleSelect} />
          <NewItineraryForm onCreate={handleCreateItinerary} loading={loading} />
          <AIGeneratorForm onGenerate={handleGenerate} loading={aiLoading} />
        </aside>
      </main>
    </div>
  );
}
