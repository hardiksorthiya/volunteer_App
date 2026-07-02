const { enrichLocationContext } = require('./locationContext');

const NEAR_ME = /\b(near me|nearby|around me|close to me|in my area|my area|my location|local to me|around here)\b/i;
const VOLUNTEER = /\b(volunteer|volunteering|volunteer\s+activit|ngo|nonprofit|organization|organisation|community\s+service|charity)\b/i;
const DETAIL_QUERY =
  /\b(address|addresses|location|where\s+is|where\s+are|contact|phone|email|e-mail|website|web\s*site|url|link|reach|directions|how\s+to\s+(find|get|contact|join)|call|visit|details?|information|info)\b/i;

const STOP = new Set([
  'me', 'my', 'the', 'here', 'find', 'show', 'what', 'how', 'volunteer', 'volunteering',
  'activities', 'activity', 'opportunities', 'organization', 'organisation', 'org', 'name', 'near', 'in', 'at', 'for',
  'give', 'please', 'that', 'this', 'particular', 'specific', 'about', 'address', 'website', 'phone', 'email',
]);

const clean = (s) =>
  String(s || '')
    .replace(/[?!.,;:]+$/g, '')
    .trim()
    .replace(/^(the|a|an|organization|organisation|org)\s+/i, '')
    .replace(/\s+(organization|organisation|org)$/i, '')
    .replace(/\s+volunteer(?:ing)?$/i, '');

const isNearMe = (msg) => NEAR_ME.test(msg || '');

const isDetailQuery = (msg) => DETAIL_QUERY.test(msg || '');

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
    /\b(?:address|location|contact|details?|info)\s+(?:of|for|about)\s+["']?([^"'?,.\n]{2,80})["']?/i,
    /\bgive\s+me\s+(?:the\s+)?address\s+(?:of\s+)?["']?([^"'?,.\n]{2,80})["']?/i,
    /\b["']([^"']{2,80})["']\s+(?:activity|event|organization)/i,
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

const extractActivityId = (msg) => {
  const m = msg.match(/\b(?:activity\s*)?(?:#|id\s*:?\s*)(\d{1,8})\b/i);
  return m ? parseInt(m[1], 10) : null;
};

const extractTermsFromConversation = (message, conversationHistory = []) => {
  const terms = [...extractOrgTerms(message)];

  const quoted = message.match(/["']([^"']{2,80})["']/g);
  if (quoted) {
    quoted.forEach((q) => {
      const t = clean(q.replace(/["']/g, ''));
      if (t) terms.push(t);
    });
  }

  const recent = (conversationHistory || []).slice(-8);
  for (const msg of recent) {
    const content = msg?.content || '';
    if (!content) continue;

    const boldMatches = content.match(/\*\*([^*]{2,80})\*\*/g);
    if (boldMatches) {
      boldMatches.forEach((m) => {
        const t = clean(m.replace(/\*\*/g, ''));
        if (t && t.length >= 2) terms.push(t);
      });
    }

    const activityMatches = content.match(/Activity:\s*([^|\n]+)/gi);
    if (activityMatches) {
      activityMatches.forEach((m) => {
        const t = clean(m.replace(/Activity:\s*/i, ''));
        if (t) terms.push(t);
      });
    }

    const orgMatches = content.match(/Organization:\s*([^|\n]+)/gi);
    if (orgMatches) {
      orgMatches.forEach((m) => {
        const t = clean(m.replace(/Organization:\s*/i, ''));
        if (t) terms.push(t);
      });
    }

    const titleMatches = content.match(/Title:\s*([^|\n]+)/gi);
    if (titleMatches) {
      titleMatches.forEach((m) => {
        const t = clean(m.replace(/Title:\s*/i, ''));
        if (t) terms.push(t);
      });
    }
  }

  return [...new Set(terms.filter((t) => t && t.length >= 2))].slice(0, 10);
};

const placeFromGps = (loc) => {
  if (!loc) return '';
  if (loc.city) return String(loc.city).trim();
  if (loc.label) return clean(loc.label.split(',')[0]) || loc.label.split(',')[0].trim();
  return '';
};

const resolveSearch = (message, location) => {
  if (isDetailQuery(message)) {
    const terms = extractOrgTerms(message);
    return { mode: 'detail', label: 'activity contact details', terms };
  }

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

const shouldLookupActivities = (message, conversationHistory = []) => {
  if (isDetailQuery(message)) return true;
  if (extractActivityId(message)) return true;
  if (isNearMe(message)) return true;
  if (VOLUNTEER.test(message) && (isNearMe(message) || extractPlace(message) || extractOrgTerms(message).length > 0)) {
    return true;
  }
  if (extractTermsFromConversation(message, conversationHistory).length > 0 && isDetailQuery(message)) {
    return true;
  }
  return false;
};

const ACTIVITY_SELECT = `
    a.id, a.title, a.description, a.location, a.category, a.organization_name,
    a.start_date, a.end_date, a.contact_email, a.contact_phone, a.requirements
`;

const queryActivities = async (db, terms, userId) => {
  if (!terms.length) return [];

  const likes = [];
  const params = [];
  terms.forEach((term) => {
    const like = `%${term}%`;
    likes.push(
      '(a.organization_name LIKE ? OR a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR a.category LIKE ? OR a.contact_email LIKE ? OR a.contact_phone LIKE ?)'
    );
    params.push(like, like, like, like, like, like, like);
  });

  let sql = `
    SELECT ${ACTIVITY_SELECT}
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

const queryActivityById = async (db, activityId, userId) => {
  if (!activityId) return [];

  let sql = `SELECT ${ACTIVITY_SELECT} FROM activities a WHERE a.id = ? AND a.is_active = true`;
  const params = [activityId];
  if (userId) {
    sql += ' AND (a.is_public = true OR a.created_by = ?)';
    params.push(userId);
  } else {
    sql += ' AND a.is_public = true';
  }

  const [rows] = await db.promise.execute(sql, params);
  return rows || [];
};

const queryRecentActivities = async (db, userId, limit = 12) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  let sql = `SELECT ${ACTIVITY_SELECT} FROM activities a WHERE a.is_active = true`;
  const params = [];
  if (userId) {
    sql += ' AND (a.is_public = true OR a.created_by = ?)';
    params.push(userId);
  } else {
    sql += ' AND a.is_public = true';
  }
  sql += ` ORDER BY a.start_date DESC LIMIT ${safeLimit}`;

  const [rows] = await db.promise.execute(sql, params);
  return rows || [];
};

const dedupeActivities = (rows) => {
  const seen = new Set();
  return (rows || []).filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
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

const extractUrlFromText = (text) => {
  const m = String(text || '').match(/https?:\/\/[^\s)\]}>"']+/i);
  return m ? m[0].replace(/[.,;]+$/, '') : '';
};

const formatContactField = (value, fallback = 'Not provided in Volunteer Connect') => {
  const v = String(value || '').trim();
  return v || fallback;
};

const buildActivityListForAi = (activities) => {
  if (!activities.length) return '';

  const grouped = groupByCategory(activities);
  const blocks = [];

  Object.entries(grouped).forEach(([category, items]) => {
    blocks.push(`Category: ${category}`);
    items.forEach((a) => {
      const org = (a.organization_name || '').trim() || 'Organization not listed';
      const desc = (a.description || a.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const dates = [formatDate(a.start_date), formatDate(a.end_date)].filter(Boolean).join(' to ');
      const website =
        extractUrlFromText(a.description) ||
        extractUrlFromText(a.requirements) ||
        'Not provided in Volunteer Connect';
      blocks.push(
        [
          `- Activity ID: ${a.id}`,
          `Organization: ${org}`,
          `Title: ${a.title}`,
          `Address/Location: ${formatContactField(a.location)}`,
          `Contact email: ${formatContactField(a.contact_email)}`,
          `Contact phone: ${formatContactField(a.contact_phone)}`,
          `Website: ${website}`,
          `Requirements: ${formatContactField(a.requirements, 'None listed')}`,
          desc ? `Description: ${desc}` : null,
          dates ? `Dates: ${dates}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
      );
    });
    blocks.push('');
  });

  return blocks.join('\n');
};

const CHAT_RESPONSE_FORMAT = `RESPONSE FORMAT (required when user asks about volunteer opportunities, organizations, "near me", or a city):

Write like ChatGPT: warm intro, then rich grouped lists. Example structure for "near me" or a city:

1) Opening (1–2 sentences): "Here are some volunteer activities and organizations near **[City]** that are currently active:"

2) Group by thematic categories with bold headings, for example:
**Education & Child Welfare**
**Organization Name** — What volunteers do, programs, who they help.

**Food Distribution & Community Support**
**Organization Name** — ...

**Animal Welfare** / **Social & Community Service** / **Environment** (use 3–5 relevant sections)

3) Optional section **Opportunities You Can Join** with bullet points (teaching, food drives, tree plantation, blood camps, animal care, elderly visits, etc.).

4) Close by offering to narrow by neighborhood if you know the city (e.g. Satellite, Maninagar) — only when location is approximate.

5) Include every item from the Volunteer Connect activities database list first (correct category). Bold each **Organization Name**.

6) If the database list is empty or short, add real, well-known NGOs and volunteer programs in that city (India-aware when relevant). Same format — organization name, em dash, clear description.

7) No login/sign-up footer. Volunteering topics only.`;

const CHAT_DETAIL_FORMAT = `DETAIL REQUEST (address, contact, website, directions for a named organization):

Reply like ChatGPT with a polished contact card. Example:

The address of **Organization Name** is:

📍 [Full street address, area, city, state, postal code, country]

**Contact Number:** [phone with country code if known]
**Email:** [if known]
**Website:** [URL if known]
**Timings:** [typical hours if publicly known, e.g. Monday–Saturday 10:00 AM–6:00 PM]

[1–2 sentences on what the organization does — disability support, education, food distribution, etc.]

RULES:
1) Use Volunteer Connect database fields FIRST when provided below (Address/Location, Contact email, Contact phone, Website).
2) If the user names a specific real NGO from the conversation but database fields are empty, you MAY supplement with accurate publicly known address and phone for that named organization in India.
3) Never fabricate random details — only well-established public information or database values.
4) If truly unknown, say so and suggest checking the organization's official website or Volunteer Connect Activities tab.`;

const buildContextMessages = (message, location, search, activities) => {
  const extra = [];
  const wantsDetail = isDetailQuery(message) || search?.mode === 'detail';

  const area = search?.label || placeFromGps(location) || 'the requested area';

  if (search?.mode === 'near_me' && !search.hasGps && !placeFromGps(location)) {
    extra.push({
      role: 'system',
      content:
        'User asked "near me" but location is unavailable. Ask them to allow location or name their city. Use the response format when you answer.',
    });
    return extra;
  }

  if (wantsDetail) {
    extra.push({
      role: 'system',
      content: CHAT_DETAIL_FORMAT,
    });
  } else if (search) {
    extra.push({
      role: 'system',
      content: `User is searching for volunteering near or related to: ${area}. Use the required response format with organization names grouped by category.`,
    });
  }

  const list = buildActivityListForAi(activities);
  if (list) {
    extra.push({
      role: 'system',
      content: `Volunteer Connect activities (use these exact contact/address fields — do not invent data):\n\n${list}`,
    });
  } else if (search || wantsDetail) {
    extra.push({
      role: 'system',
      content: wantsDetail
        ? 'No Volunteer Connect database record matched. The user named a specific organization — provide a ChatGPT-style address/contact card using accurate public information for that organization if you know it; otherwise ask them to confirm the exact name or check Activities in the app.'
        : `No Volunteer Connect activities matched "${area}" in the database. Still use the required format and suggest real NGOs/volunteer options in ${area} from general knowledge.`,
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

const prepareChatContext = async (db, message, locationContext, userId = null, conversationHistory = []) => {
  const location = await enrichLocationContext(locationContext);
  const search = resolveSearch(message, location);
  const wantsDetail = isDetailQuery(message);
  const activityId = extractActivityId(message);

  let activities = [];

  if (shouldLookupActivities(message, conversationHistory)) {
    const historyTerms = extractTermsFromConversation(message, conversationHistory);
    let terms = [...new Set([...(search?.terms || []), ...historyTerms, ...extractOrgTerms(message)])].filter(Boolean);

    if (isNearMe(message) && placeFromGps(location) && !terms.includes(placeFromGps(location))) {
      terms.push(placeFromGps(location));
    }

    if (activityId) {
      activities = await queryActivityById(db, activityId, userId);
    }

    if (terms.length) {
      const byTerms = await queryActivities(db, terms, userId);
      activities = dedupeActivities([...activities, ...byTerms]);
    }

    if (!activities.length && wantsDetail) {
      const recent = await queryRecentActivities(db, userId, 15);
      activities = dedupeActivities(recent);
    }
  }

  return { location, search, activities, wantsDetail };
};

module.exports = {
  CHAT_RESPONSE_FORMAT,
  CHAT_DETAIL_FORMAT,
  prepareChatContext,
  buildContextMessages,
  shouldLookupActivities,
  isDetailQuery,
  buildActivityListForAi,
};
