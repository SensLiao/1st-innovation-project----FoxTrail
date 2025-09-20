const fs = require('fs/promises');
const path = require('path');
const dayjs = require('dayjs');
const { nanoid } = require('nanoid');

class ItineraryStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.itineraries = [];
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.itineraries = JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      this.itineraries = this.sampleData();
      await this.persist();
    }
  }

  sampleData() {
    const today = dayjs();
    const itineraryId = nanoid();
    return [
      {
        id: itineraryId,
        title: 'Kyoto Culture & Study Retreat',
        type: 'trip',
        destination: 'Kyoto, Japan',
        startDate: today.add(3, 'day').startOf('day').toISOString(),
        endDate: today.add(7, 'day').endOf('day').toISOString(),
        startLocation: 'Kyoto Station',
        collaborators: [],
        preferences: {
          focus: ['culture', 'food'],
          budget: 'moderate',
          aiSummary:
            'A four-day exploration of Kyoto that balances temples, tea ceremonies and evening food adventures. Generated sample data.'
        },
        aiGenerated: true,
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        items: [
          {
            id: nanoid(),
            name: 'Kiyomizu-dera Temple visit',
            category: 'culture',
            location: 'Kiyomizu-dera',
            day: 1,
            startTime: today.add(3, 'day').hour(9).minute(0).toISOString(),
            endTime: today.add(3, 'day').hour(11).minute(0).toISOString(),
            travelMode: 'public-transit',
            notes: 'Arrive before opening crowds; capture skyline views of Kyoto.'
          },
          {
            id: nanoid(),
            name: 'Tea ceremony workshop',
            category: 'culture',
            location: 'Camellia Tea House',
            day: 1,
            startTime: today.add(3, 'day').hour(13).minute(0).toISOString(),
            endTime: today.add(3, 'day').hour(15).minute(0).toISOString(),
            travelMode: 'walk',
            notes: 'Hands-on session introducing tea etiquette.'
          },
          {
            id: nanoid(),
            name: 'Nishiki Market street food crawl',
            category: 'food',
            location: 'Nishiki Market',
            day: 1,
            startTime: today.add(3, 'day').hour(18).minute(0).toISOString(),
            endTime: today.add(3, 'day').hour(20).minute(0).toISOString(),
            travelMode: 'walk',
            notes: 'Sample seasonal snacks, tofu donuts and matcha sweets.'
          }
        ]
      }
    ];
  }

  async persist() {
    await fs.writeFile(this.filePath, JSON.stringify(this.itineraries, null, 2), 'utf8');
  }

  getAll() {
    return this.itineraries;
  }

  getById(id) {
    return this.itineraries.find((item) => item.id === id);
  }

  async createItinerary(payload) {
    const now = dayjs().toISOString();
    const itinerary = {
      id: nanoid(),
      title: payload.title || 'Untitled Itinerary',
      type: payload.type || 'custom',
      destination: payload.destination || '',
      startDate: payload.startDate || now,
      endDate: payload.endDate || now,
      startLocation: payload.startLocation || '',
      collaborators: payload.collaborators || [],
      preferences: payload.preferences || {},
      aiGenerated: Boolean(payload.aiGenerated),
      createdAt: now,
      updatedAt: now,
      items: []
    };
    this.itineraries.push(itinerary);
    await this.persist();
    return itinerary;
  }

  async updateItinerary(id, updates) {
    const itinerary = this.getById(id);
    if (!itinerary) return null;
    Object.assign(itinerary, updates, { updatedAt: dayjs().toISOString() });
    await this.persist();
    return itinerary;
  }

  async removeItinerary(id) {
    const index = this.itineraries.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.itineraries.splice(index, 1);
    await this.persist();
    return true;
  }

  async addItem(itineraryId, itemPayload) {
    const itinerary = this.getById(itineraryId);
    if (!itinerary) return null;
    const item = {
      id: nanoid(),
      name: itemPayload.name || 'Untitled item',
      category: itemPayload.category || 'general',
      location: itemPayload.location || '',
      day: itemPayload.day ?? null,
      startTime: itemPayload.startTime || null,
      endTime: itemPayload.endTime || null,
      travelMode: itemPayload.travelMode || 'walk',
      notes: itemPayload.notes || ''
    };
    itinerary.items.push(item);
    itinerary.updatedAt = dayjs().toISOString();
    await this.persist();
    return item;
  }

  async updateItem(itineraryId, itemId, updates) {
    const itinerary = this.getById(itineraryId);
    if (!itinerary) return null;
    const item = itinerary.items.find((entry) => entry.id === itemId);
    if (!item) return null;
    Object.assign(item, updates);
    itinerary.updatedAt = dayjs().toISOString();
    await this.persist();
    return item;
  }

  async removeItem(itineraryId, itemId) {
    const itinerary = this.getById(itineraryId);
    if (!itinerary) return false;
    const index = itinerary.items.findIndex((entry) => entry.id === itemId);
    if (index === -1) return false;
    itinerary.items.splice(index, 1);
    itinerary.updatedAt = dayjs().toISOString();
    await this.persist();
    return true;
  }

  async replaceItems(itineraryId, items) {
    const itinerary = this.getById(itineraryId);
    if (!itinerary) return null;
    itinerary.items = items;
    itinerary.updatedAt = dayjs().toISOString();
    await this.persist();
    return itinerary.items;
  }
}

module.exports = ItineraryStore;
