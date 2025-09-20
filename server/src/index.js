const express = require('express');
const cors = require('cors');
const path = require('path');
const ItineraryStore = require('./store');
const createItineraryRouter = require('./routes/itineraries');

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const dataPath = path.join(__dirname, '..', 'data', 'itineraries.json');
  const store = new ItineraryStore(dataPath);
  await store.init();

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/itineraries', createItineraryRouter(store));

  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error', details: err.message });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`FoxTrail server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});
