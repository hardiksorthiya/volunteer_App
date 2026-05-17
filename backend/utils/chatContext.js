const { enrichLocationContext } = require('./locationContext');

const NEAR_ME = /\b(near me|nearby|around me|close to me|in my area|my area|my location|local to me|around here)\b/i;
const VOLUNTEER = /\b(volunteer|volunteering|volunteer\s+activit|ngo|nonprofit|organization|organisation|community\s+service|charity)\b/i;

const STOP = new Set([
  'me', 'my', 'the', 'here', 'find', 'show', 'what', 'how', 'volunteer', 'volunteering',
  'activities', 'activity', 'opportunities', 'organization', 'organisation', 'org', 'name', 'near', 'in', 'at', 'for',
]);

const clean = (s) =>
  String(s || '')
    .replace(/[?!.,;:]+$/g, '')
    .trim()
    .replace(/^(the|a|an|organization|organisation|org)\s+/i, '')
    .replace(/\s+(organization|organisation|org)$/i, '')
    .replace(/\s+volunteer(?:ing)?$/i, '');

const isNearMe = (msg) => NEAR_ME.test(msg || '');

const extractPlace = (msg) => {
  const m =
    msg.match(/\b(?:in|at|near|around)\s+([A-Za-z][A-Za-z\s.'-]{1,48}?)(?:\s*[,.!?]|$)/i) ||
    msg.match(/\bvolunteer(?:ing)?\s+(?:in|at|near)\s+([A-Za-z][A-Za-z\s.'-]{1,48})/i);
  if (!m || !m[1] || /^(organization|organisation|org)\b/i.test(m[1])) return '';
  const p = clean(m[1]);
  return p.length >= 2 ? p : '';
};

const extractOrgTerms = (msg) => {
  const terms = [];
  const patterns = [
    /\b(?:organization|organisation|org)\s+(?:named\s+|called\s+)?["']?([^"'?,.\n]{2,60})["']?/i,
    /\bvolunteer(?:ing)?\s+(?:with|at|for|by|from)\s+["']?([^"'?,.\n]{2,60})["']?/i,
    /\bactivities?\s+(?:by|from|for|with)\s+["']?([^"'?,.\n]{2,60})["']?/i,
  ];
  for (const re of patterns) {
    const m = msg.match(re);
    if (m && m[1]) {
      const t = clean(m[1]);
      if (t) terms.push(t);
    }
  }
  if (!terms.length && VOLUNTEER.test(msg)) {
    const words = msg
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w.toLowerCase()));
    if (words.length <= 5) terms.push(words.join(' '));
    words.filter((w) => w.length >= 4).forEach((w) => terms.push(w));
  }
  return [...new Set(terms)].slice(0, 5);
};

const placeFromGps = (loc) => {
  if (!loc) return '';
  if (loc.city) return String(loc.city).trim();
  if (loc.label) return clean(loc.label.split(',')[0]) || loc.label.split(',')[0].trim();
  return '';
};

const resolveSearch = (message, location) => {
  const orgTerms = extractOrgTerms(message);
  if (orgTerms.length && /\b(organization|organisation|org|with|from|by)\b/i.test(message) && !isNearMe(message)) {
    return { mode: 'organization', label: orgTerms[0], terms: orgTerms };
  }
  if (isNearMe(message)) {
    const label = location?.label || [location?.city, location?.region, location?.country].filter(Boolean).join(', ');
    return {
      mode: 'near_me',
      label: label || placeFromGps(location) || 'your area',
      terms: [...orgTerms, placeFromGps(location), location?.region].filter(Boolean),
      hasGps: Boolean(location?.latitude && location?.longitude),
    };
  }
  const place = extractPlace(message);
  if (place) return { mode: 'place', label: place, terms: [...orgTerms, place] };
  if (orgTerms.length) return { mode: 'organization', label: orgTerms[0], terms: orgTerms };
  return null;
};

const shouldLookupActivities = (message) => VOLUNTEER.test(message) && (isNearMe(message) || extractPlace(message) || extractOrgTerms(message).length > 0);

const queryActivities = async (db, terms, userId) => {
  if (!terms.length) return [];

  const likes = [];
  const params = [];
  terms.forEach((term) => {
    const like = `%${term}%`;
    likes.push(
      '(a.organization_name LIKE ? OR a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR a.category LIKE ?)'
    );
    params.push(like, like, like, like, like);
  });

  let sql = `
    SELECT a.id, a.title, a.description, a.location, a.category, a.organization_name, a.start_date, a.end_date
    FROM activities a
    WHERE a.is_active = true AND (${likes.join(' OR ')})
  `;
  if (userId) {
    sql += ' AND (a.is_public = true OR a.created_by = ?)';
    params.push(userId);
  } else {
    sql += ' AND a.is_public = true';
  }
  sql += ' ORDER BY a.start_date DESC LIMIT 25';

  const [rows] = await db.promise.execute(sql, params);
  return rows || [];
};

const groupByCategory = (activities) => {
  const map = {};
  activities.forEach((a) => {
    const cat = (a.category || 'Other opportunities').trim() || 'Other opportunities';
    if (!map[cat]) map[cat] = [];
    map[cat].push(a);
  });
  return map;
};

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const buildActivityListForAi = (activities) => {
  if (!activities.length) return '';

  const grouped = groupByCategory(activities);
  const blocks = [];

  Object.entries(grouped).forEach(([category, items]) => {
    blocks.push(`Category: ${category}`);
    items.forEach((a) => {
      const org = (a.organization_name || '').trim() || 'Organization not listed';
      const desc = (a.description || a.title || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      const dates = [formatDate(a.start_date), formatDate(a.end_date)].filter(Boolean).join(' to ');
      blocks.push(
        `- [Volunteer Connect] Organization: ${org} | Activity: ${a.title} | Location: ${a.location || 'N/A'} | ${desc}${dates ? ` | Dates: ${dates}` : ''}`
      );
    });
    blocks.push('');
  });

  return blocks.join('\n');
};

const CHAT_RESPONSE_FORMAT = `RESPONSE FORMAT (required when user asks about volunteer opportunities, organizations, "near me", or a city):

1) Start with 1–2 friendly sentences mentioning their city/area or search.

2) Then list opportunities grouped by category. Use this structure:

**Category Name** (examples: Community & Social Service, Education & Youth Activities, Environment, Health & Care)

**Organization Name** — One clear line: what volunteers do, who they help, and types of programs.

**Another Organization** — ...

3) Use 2–4 category sections when possible.

4) Every line must be: Organization name first, em dash (—), then description. Bold the organization name.

5) Include every item from the "Volunteer Connect activities" list below in the correct category.

6) If the platform list is empty or very short, add other well-known NGOs and volunteer programs in the user's area (same format). Only use organizations you believe are real for that location.

7) Do not end with login prompts, sign-up calls to action, or generic closing lines (for example "log in to Volunteer Connect" or "make a positive impact"). End after the last organization entry unless the user asked how to join.

Keep answers helpful and scannable like ChatGPT. Volunteering topics only.`;

const buildContextMessages = (message, location, search, activities) => {
  const extra = [];

  const area = search?.label || placeFromGps(location) || 'the requested area';

  if (search?.mode === 'near_me' && !search.hasGps && !placeFromGps(location)) {
    extra.push({
      role: 'system',
      content:
        'User asked "near me" but location is unavailable. Ask them to allow location or name their city. Use the response format when you answer.',
    });
    return extra;
  }

  if (search) {
    extra.push({
      role: 'system',
      content: `User is searching for volunteering near or related to: ${area}. Use the required response format with organization names grouped by category.`,
    });
  }

  const list = buildActivityListForAi(activities);
  if (list) {
    extra.push({
      role: 'system',
      content: `Volunteer Connect activities to include in your answer:\n\n${list}`,
    });
  } else if (search) {
    extra.push({
      role: 'system',
      content: `No Volunteer Connect activities matched "${area}" in the database. Still use the required format and suggest real NGOs/volunteer options in ${area} from general knowledge.`,
    });
  }

  if (location?.label || location?.city) {
    extra.push({
      role: 'system',
      content: `User device location: ${location.label || [location.city, location.region, location.country].filter(Boolean).join(', ')}.`,
    });
  }

  return extra;
};

const prepareChatContext = async (db, message, locationContext, userId = null) => {
  const location = await enrichLocationContext(locationContext);
  const search = resolveSearch(message, location);

  let activities = [];
  if (shouldLookupActivities(message) && search) {
    const terms = [...new Set(search.terms || [])].filter(Boolean);
    if (search.mode === 'near_me' && terms.length === 0 && search.label) {
      terms.push(search.label.split(',')[0]);
    }
    activities = await queryActivities(db, terms, userId);
  }

  return { location, search, activities };
};

module.exports = {
  CHAT_RESPONSE_FORMAT,
  prepareChatContext,
  buildContextMessages,
  shouldLookupActivities,
};
