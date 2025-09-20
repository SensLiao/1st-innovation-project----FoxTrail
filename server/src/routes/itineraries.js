const express = require('express');
const dayjs = require('dayjs');
const { generateAIItineraryPayload } = require('../utils/aiGenerator');

function createItineraryRouter(store) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(store.getAll());
  });

  router.post('/', async (req, res, next) => {
    try {
      const itinerary = await store.createItinerary(req.body || {});
      res.status(201).json(itinerary);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', (req, res) => {
    const itinerary = store.getById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    return res.json(itinerary);
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const itinerary = await store.updateItinerary(req.params.id, req.body || {});
      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
      return res.json(itinerary);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const removed = await store.removeItinerary(req.params.id);
      if (!removed) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/items', async (req, res, next) => {
    try {
      const item = await store.addItem(req.params.id, req.body || {});
      if (!item) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
      return res.status(201).json(item);
    } catch (error) {
      return next(error);
    }
  });

  router.put('/:id/items/:itemId', async (req, res, next) => {
    try {
      const item = await store.updateItem(req.params.id, req.params.itemId, req.body || {});
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      return res.json(item);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id/items/:itemId', async (req, res, next) => {
    try {
      const removed = await store.removeItem(req.params.id, req.params.itemId);
      if (!removed) {
        return res.status(404).json({ message: 'Item not found' });
      }
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/optimize', async (req, res, next) => {
    try {
      const itinerary = store.getById(req.params.id);
      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
      const items = [...itinerary.items];
      items.sort((a, b) => {
        if (a.startTime && b.startTime) {
          return dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf();
        }
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        return a.name.localeCompare(b.name);
      });
      const optimisedItems = items.map((item, index) => ({
        ...item,
        sequence: index + 1
      }));
      await store.replaceItems(req.params.id, optimisedItems);
      return res.json({
        message: 'Itinerary order optimised by chronological sequence.',
        items: optimisedItems
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/sync', (req, res) => {
    const itinerary = store.getById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    return res.json({
      message: 'Calendar sync simulated successfully.',
      syncedAt: dayjs().toISOString()
    });
  });

  router.post('/generate', async (req, res, next) => {
    try {
      const payload = generateAIItineraryPayload(req.body || {});
      const itinerary = await store.createItinerary(payload);
      await store.replaceItems(itinerary.id, payload.items);
      const fresh = store.getById(itinerary.id);
      return res.status(201).json(fresh);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createItineraryRouter;
