const dayjs = require('dayjs');
const { nanoid } = require('nanoid');

const suggestionLibrary = {
  culture: [
    { name: 'Museum immersion', location: 'City Heritage Museum', notes: 'Guided tour of local history exhibits.' },
    { name: 'Historic district walk', location: 'Old Town Quarter', notes: 'Self-paced exploration with photo stops.' },
    { name: 'Craft workshop', location: 'Artisan Studio', notes: 'Create a handmade souvenir with local artists.' }
  ],
  food: [
    { name: 'Local market tasting', location: 'Central Market', notes: 'Sample seasonal produce and street snacks.' },
    { name: 'Chef-led cooking class', location: 'Kitchen Lab', notes: 'Cook regional dishes with a professional chef.' },
    { name: 'Night food tour', location: 'Downtown Food Arcade', notes: 'Guided tasting across iconic eateries.' }
  ],
  nature: [
    { name: 'Sunrise hike', location: 'Skyline Trailhead', notes: 'Easy hike with scenic viewpoints and birdwatching.' },
    { name: 'Botanical garden visit', location: 'City Botanic Gardens', notes: 'Relaxed stroll through themed gardens.' },
    { name: 'Riverside cycling', location: 'Riverfront Loop', notes: 'Leisure ride with picnic stop.' }
  ],
  productivity: [
    { name: 'Morning deep work session', location: 'Co-working Loft', notes: 'Focus block with premium Wi-Fi and coffee.' },
    { name: 'Team stand-up meeting', location: 'Innovation Hub', notes: 'Sync on goals and blockers.' },
    { name: 'Campus library research', location: 'North Library', notes: 'Reserve a quiet room for study time.' }
  ],
  commute: [
    { name: 'Express metro ride', location: 'Metro Line 2', notes: 'Fastest route with one transfer.' },
    { name: 'Bike share transfer', location: 'City Bike Station', notes: 'Use bike share for the last mile to campus.' },
    { name: 'Shuttle bus', location: 'Shuttle Stop A', notes: 'Company shuttle departing every 15 minutes.' }
  ]
};

function buildItems({ startDate, days, focus, type }) {
  const results = [];
  const start = dayjs(startDate || undefined).startOf('day');
  const totalDays = days || 3;
  const focusList = focus && focus.length ? focus : ['culture', 'food'];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const date = start.add(dayIndex, 'day');
    const slotTemplates = ['09:00', '12:30', '16:00'];

    focusList.forEach((focusKey, idx) => {
      const library = suggestionLibrary[focusKey] || suggestionLibrary.culture;
      const suggestion = library[(dayIndex + idx) % library.length];
      const [hour, minute] = slotTemplates[idx % slotTemplates.length].split(':');
      const startTime = date.hour(Number(hour)).minute(Number(minute));
      const durationHours = type === 'commute' ? 1 : 2;

      results.push({
        id: nanoid(),
        name: suggestion.name,
        category: focusKey,
        location: suggestion.location,
        day: dayIndex + 1,
        startTime: startTime.toISOString(),
        endTime: startTime.add(durationHours, 'hour').toISOString(),
        travelMode: focusKey === 'commute' ? 'public-transit' : 'walk',
        notes: suggestion.notes
      });
    });
  }

  return results;
}

function buildSummary({ destination, focus, totalItems }) {
  const focusText = (focus && focus.length ? focus : ['culture']).join(', ');
  return `AI generated ${totalItems} activities for ${destination || 'your itinerary'} focusing on ${focusText}.`;
}

function generateAIItineraryPayload(request) {
  const startDate = request.startDate || dayjs().add(1, 'day').startOf('day').toISOString();
  const totalDays = request.days || 3;
  const focus = request.preferences?.focus || request.focus || ['culture', 'food'];

  const items = buildItems({ startDate, days: totalDays, focus, type: request.type });
  const endDate = dayjs(startDate).add(totalDays - 1, 'day').endOf('day').toISOString();

  return {
    title: request.title || `${request.destination || 'Custom'} plan`,
    destination: request.destination || '',
    type: request.type || 'trip',
    startDate,
    endDate,
    aiGenerated: true,
    startLocation: request.startLocation || '',
    preferences: {
      ...request.preferences,
      focus,
      aiSummary: buildSummary({ destination: request.destination, focus, totalItems: items.length })
    },
    items
  };
}

module.exports = {
  generateAIItineraryPayload
};
