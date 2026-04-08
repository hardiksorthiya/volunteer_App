const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

// Multer setup for CSV uploads (activities import)
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Helper function to convert date string to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
// Accepts: YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, DD-MM-YYYY, DD-MM-YYYY HH:mm, DD-MM-YYYY HH:mm:ss
const formatDateForMySQL = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  const s = dateString.trim();
  if (!s) return null;
  try {
    // Already MySQL format (YYYY-MM-DD HH:MM:SS)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;
    // Date-only YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;
    // DD-MM-YYYY or D-M-YYYY with optional time (HH:mm or HH:mm:ss)
    const ddmmyyyyTime = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ddmmyyyyTime) {
      const [, d, m, y, h = '0', min = '0', sec = '0'] = ddmmyyyyTime;
      const day = String(parseInt(d, 10)).padStart(2, '0');
      const month = String(parseInt(m, 10)).padStart(2, '0');
      const hour = String(parseInt(h, 10)).padStart(2, '0');
      const minute = String(parseInt(min, 10)).padStart(2, '0');
      const second = String(parseInt(sec, 10)).padStart(2, '0');
      return `${y}-${month}-${day} ${hour}:${minute}:${second}`;
    }
    // Parse ISO or other date string (e.g. MM/DD/YYYY)
    const date = new Date(s);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

// Normalize time to HH:mm:ss (e.g. "09:00" -> "09:00:00")
const normalizeTime = (t) => {
  if (!t || typeof t !== 'string') return '00:00:00';
  const trimmed = t.trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.replace(/\b(\d)\b/g, '0$1').replace(/^(\d):/, '0$1:');
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map((x) => String(parseInt(x, 10)).padStart(2, '0'));
    return `${h}:${m}:00`;
  }
  return null;
};

// Parse one CSV line handling quoted fields (e.g. "Beach Cleanup, Morning", "desc with, comma")
const parseCSVLine = (line) => {
  const cells = [];
  let current = '';
  let inQuoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuoted = false;
      } else current += c;
    } else {
      if (c === '"') inQuoted = true;
      else if (c === ',') { cells.push(current); current = ''; }
      else current += c;
    }
  }
  cells.push(current);
  return cells.map((cell) => {
    const t = cell.trim();
    if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') return t.slice(1, -1).replace(/""/g, '"').trim();
    return t;
  });
};

// Helper: compute activity status from dates and task completion
// When activity has tasks: "completed" only when ALL tasks are completed (ignore date-based completed).
// When activity has no tasks: use date-based status only.
const getActivityStatusFromRow = (row) => {
  const allTasksCompleted = row.all_tasks_completed === 1 || row.all_tasks_completed === true;
  const activityHasTasks = row.activity_has_tasks === 1 || row.activity_has_tasks === true;
  if (allTasksCompleted) return 'completed';
  const startDate = row.start_date ? new Date(row.start_date) : null;
  const endDate = row.end_date ? new Date(row.end_date) : null;
  const now = new Date();
  if (!startDate) return 'upcoming';
  // If activity has tasks but not all completed, never show "completed" (even if end_date passed)
  if (activityHasTasks) {
    if (endDate && endDate < now) return 'ongoing'; // end date passed but tasks incomplete
    if (startDate <= now && (!endDate || endDate >= now)) return 'ongoing';
    return 'upcoming';
  }
  // No tasks: use date-based status
  if (endDate && endDate < now) return 'completed';
  if (startDate <= now && (!endDate || endDate >= now)) return 'ongoing';
  return 'upcoming';
};

// @route   POST /api/activities
// @desc    Create a new activity
// @access  Private
// Rules:
//   - Admin can create public activities (is_public = true) that volunteers can join
//   - Volunteers can create private activities (is_public = false) visible only to them
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, organization_name, location, start_date, end_date, max_participants, participant_ids, contact_email, contact_phone, requirements } = req.body;
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Validation
    if (!title || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Title and start_date are required'
      });
    }

    // Determine if activity is public based on user role
    // Admin creates public activities, volunteers create private activities
    const is_public = isAdmin ? true : false;

    // Format dates for MySQL (convert ISO format to MySQL datetime format)
    const formattedStartDate = formatDateForMySQL(start_date);
    const formattedEndDate = formatDateForMySQL(end_date);

    if (!formattedStartDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start_date format. Please provide a valid date.'
      });
    }

    // Insert activity (contact + requirements stored for mobile/web forms)
    const [result] = await db.promise.execute(
      `INSERT INTO activities 
       (title, description, category, organization_name, location, contact_email, contact_phone, start_date, end_date, created_by, is_public, max_participants, requirements) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        category || null,
        organization_name || null,
        location || null,
        contact_email || null,
        contact_phone || null,
        formattedStartDate,
        formattedEndDate,
        userId,
        is_public,
        max_participants || null,
        requirements || null
      ]
    );

    const activityId = result.insertId;

    // Add participants if provided (admin only)
    if (isAdmin && participant_ids && Array.isArray(participant_ids) && participant_ids.length > 0) {
      // Validate that all user IDs exist
      const placeholders = participant_ids.map(() => '?').join(',');
      const [users] = await db.promise.execute(
        `SELECT id FROM users WHERE id IN (${placeholders}) AND is_active = true`,
        participant_ids
      );

      const validUserIds = users.map(u => u.id);
      const invalidUserIds = participant_ids.filter(id => !validUserIds.includes(parseInt(id)));

      if (invalidUserIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid user IDs: ${invalidUserIds.join(', ')}`
        });
      }

      // Add participants
      for (const participantId of validUserIds) {
        // Check if already a participant (shouldn't happen, but just in case)
        const [existing] = await db.promise.execute(
          'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
          [activityId, participantId]
        );

        if (existing.length === 0) {
          await db.promise.execute(
            'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, ?)',
            [activityId, participantId, 'registered']
          );
        }
      }
    }

    // Get created activity
    const [activities] = await db.promise.execute(
      `SELECT a.*, 
       u.name as creator_name, u.email as creator_email,
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
       FROM activities a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [activityId]
    );

    res.status(201).json({
      success: true,
      message: is_public 
        ? 'Public activity created successfully. Volunteers can now join.' 
        : 'Private activity created successfully. This activity is only visible to you.',
      data: activities[0]
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Import CSV handler (used by router and by server.js so route is matched before /:id)
// @route   POST /api/activities/import-csv
// Expected CSV header: title,description,category,organization_name,location,start_date,end_date,max_participants,is_public
const importCsvHandler = async (req, res) => {
  console.log('📥 POST /api/activities/import-csv - CSV import request received');
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'CSV file (field name "file") is required.'
      });
    }

    const userId = req.user.id;
    let text = req.file.buffer.toString('utf-8');
    // Strip BOM (Excel/some editors add UTF-8 BOM)
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV file must contain a header row and at least one data row.'
      });
    }

    const headerCells = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const findCol = (names) => {
      for (const name of names) {
        const idx = headerCells.indexOf(name.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxTitle = findCol(['title', 'activity_title', 'name']);
    const idxStart = findCol(['start_date', 'start', 'startdate']);
    const idxEnd = findCol(['end_date', 'end', 'enddate']);
    const idxStartTime = findCol(['start_time', 'starttime', 'time_start']);
    const idxEndTime = findCol(['end_time', 'endtime', 'time_end']);
    const idxDescription = findCol(['description', 'details']);
    const idxCategory = findCol(['category']);
    const idxOrg = findCol(['organization_name', 'organization', 'org']);
    const idxLocation = findCol(['location', 'city']);
    const idxMaxParticipants = findCol(['max_participants', 'max_volunteers']);
    const idxIsPublic = findCol(['is_public', 'public']);

    if (idxTitle === -1 || idxStart === -1) {
      return res.status(400).json({
        success: false,
        message: 'CSV must include at least "title" and "start_date" columns.'
      });
    }

    const createdActivities = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1; // 1-based including header
      const line = lines[i];
      if (!line.trim()) continue;
      const cells = parseCSVLine(line);

      const safeGet = (idx) => (idx >= 0 && idx < cells.length ? cells[idx].trim() : '');

      const title = safeGet(idxTitle);
      const start_date_raw = safeGet(idxStart);
      const end_date_raw = safeGet(idxEnd);
      const start_time_raw = idxStartTime >= 0 ? safeGet(idxStartTime) : '';
      const end_time_raw = idxEndTime >= 0 ? safeGet(idxEndTime) : '';
      const description = safeGet(idxDescription);
      const category = safeGet(idxCategory);
      const organization_name = safeGet(idxOrg);
      const location = safeGet(idxLocation);
      const max_participants_raw = safeGet(idxMaxParticipants);
      const is_public_raw = safeGet(idxIsPublic);

      if (!title || !start_date_raw) {
        errors.push({ row: rowNumber, message: 'Missing required title or start_date.' });
        continue;
      }

      // Build start datetime: use start_date + start_time if separate columns, else use start_date as full datetime
      let startInput = start_date_raw;
      if (start_time_raw) {
        const t = normalizeTime(start_time_raw);
        if (t) startInput = `${start_date_raw.trim()} ${t}`;
      }
      const formattedStart = formatDateForMySQL(startInput);

      let formattedEnd = null;
      if (end_date_raw) {
        let endInput = end_date_raw;
        if (end_time_raw) {
          const t = normalizeTime(end_time_raw);
          if (t) endInput = `${end_date_raw.trim()} ${t}`;
        }
        formattedEnd = formatDateForMySQL(endInput);
      }

      if (!formattedStart) {
        errors.push({ row: rowNumber, message: `Invalid start_date/time: "${start_date_raw}"${start_time_raw ? ` "${start_time_raw}"` : ''}` });
        continue;
      }

      const max_participants = max_participants_raw ? parseInt(max_participants_raw, 10) || null : null;
      let is_public = true; // Admin imports are public by default
      if (idxIsPublic !== -1 && is_public_raw) {
        const lowered = is_public_raw.toLowerCase();
        is_public = lowered === '1' || lowered === 'true' || lowered === 'yes' || lowered === 'y';
      }

      try {
        const [result] = await db.promise.execute(
          `INSERT INTO activities 
           (title, description, category, organization_name, location, start_date, end_date, created_by, is_public, max_participants) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            title,
            description || null,
            category || null,
            organization_name || null,
            location || null,
            formattedStart,
            formattedEnd,
            userId,
            is_public,
            max_participants
          ]
        );
        createdActivities.push({ row: rowNumber, activity_id: result.insertId, title });
      } catch (err) {
        console.error('Error inserting activity from CSV row', rowNumber, err);
        errors.push({ row: rowNumber, message: err.message || 'Database insert failed' });
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${createdActivities.length} activities from CSV.`,
      data: {
        created_count: createdActivities.length,
        created_activities: createdActivities,
        errors
      }
    });
  } catch (error) {
    console.error('Import activities CSV error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

router.post('/import-csv', authenticate, authorize('admin'), uploadCsv.single('file'), importCsvHandler);
router.importCsvHandler = importCsvHandler;
router.uploadCsv = uploadCsv;

// @route   GET /api/activities
// @desc    Get all activities
// @access  Private
// Rules:
//   - Admins see all activities (public + private)
//   - Volunteers see public activities + their own private activities
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';
    const taskHoursScopePersonal = req.query.task_scope === 'personal';

    let query;
    let params = [];

    if (isAdmin) {
      // Admin sees all activities; task_hours = total hours from ALL tasks in the activity
      const taskHoursSelect = taskHoursScopePersonal
        ? `COALESCE((SELECT SUM(at.total_hours) 
                  FROM activity_tasks at 
                  WHERE at.activity_id = a.id AND at.created_by = ? AND at.total_hours IS NOT NULL), 0)`
        : `COALESCE((SELECT SUM(at.total_hours) 
                  FROM activity_tasks at 
                  WHERE at.activity_id = a.id AND at.total_hours IS NOT NULL), 0)`;

      query = `
        SELECT a.*, 
        u.name as creator_name, u.email as creator_email, u.user_type as creator_user_type,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count,
        EXISTS(SELECT 1 FROM activity_participants WHERE activity_id = a.id AND user_id = ?) as is_joined,
        EXISTS(SELECT 1 FROM task_users tu 
               JOIN activity_tasks at ON tu.task_id = at.id 
               WHERE at.activity_id = a.id AND tu.user_id = ?) as has_tasks,
        ${taskHoursSelect} as task_hours,
        (SELECT (COUNT(*) > 0 AND SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) = COUNT(*)) FROM activity_tasks WHERE activity_id = a.id) as all_tasks_completed,
        EXISTS(SELECT 1 FROM activity_tasks WHERE activity_id = a.id) as activity_has_tasks
        FROM activities a
        JOIN users u ON a.created_by = u.id
        WHERE a.is_active = true
        ORDER BY a.start_date ASC
      `;
      params = taskHoursScopePersonal ? [userId, userId, userId] : [userId, userId];
    } else {
      // Volunteers see public activities + their own private activities
      query = `
        SELECT a.*, 
        u.name as creator_name, u.email as creator_email, u.user_type as creator_user_type,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count,
        EXISTS(SELECT 1 FROM activity_participants WHERE activity_id = a.id AND user_id = ?) as is_joined,
        EXISTS(SELECT 1 FROM task_users tu 
               JOIN activity_tasks at ON tu.task_id = at.id 
               WHERE at.activity_id = a.id AND tu.user_id = ?) as has_tasks,
        COALESCE((SELECT SUM(at.total_hours) 
                  FROM activity_tasks at 
                  WHERE at.activity_id = a.id AND at.created_by = ? AND at.total_hours IS NOT NULL), 0) as task_hours,
        (SELECT (COUNT(*) > 0 AND SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) = COUNT(*)) FROM activity_tasks WHERE activity_id = a.id) as all_tasks_completed,
        EXISTS(SELECT 1 FROM activity_tasks WHERE activity_id = a.id) as activity_has_tasks
        FROM activities a
        JOIN users u ON a.created_by = u.id
        WHERE a.is_active = true 
        AND (a.is_public = true OR a.created_by = ?)
        ORDER BY a.start_date ASC
      `;
      params = [userId, userId, userId, userId];
    }

    const [rows] = await db.promise.execute(query, params);
    const activities = rows.map((row) => ({
      ...row,
      status: getActivityStatusFromRow(row)
    }));

    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== USER STATISTICS ROUTES ====================
// Note: These routes must be defined before /:id route to ensure proper matching
// IMPORTANT: These routes must come before any /:id routes to avoid route conflicts

// Debug route to verify stats routes are accessible
router.get('/stats/test', (req, res) => {
  res.json({ success: true, message: 'Stats routes are working!' });
});

// @route   GET /api/activities/stats/total-hours
// @desc    Get total hours from tasks created by the current user
// @access  Private
router.get('/stats/total-hours', authenticate, async (req, res) => {
  console.log('📊 GET /api/activities/stats/total-hours - Request received');
  try {
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';
    const scopePersonal = req.query.scope === 'personal';
    const scopePersonalCreated = req.query.scope === 'personal_created';

    // personal_created: only tasks in activities created by the user (strict individual).
    // personal: tasks created by the user (any activity). global: all tasks.
    let query;
    let params = [];
    if (scopePersonalCreated && isAdmin) {
      query = `SELECT COALESCE(SUM(at.total_hours), 0) as total_hours
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE a.created_by = ?
           AND at.created_by = ?
           AND at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND a.is_active = true`;
      params = [userId, userId];
    } else if (!isAdmin || scopePersonal) {
      query = `SELECT COALESCE(SUM(at.total_hours), 0) as total_hours
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE at.created_by = ?
           AND at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND a.is_active = true`;
      params = [userId];
    } else {
      query = `SELECT COALESCE(SUM(at.total_hours), 0) as total_hours
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND a.is_active = true`;
    }
    const [result] = await db.promise.execute(query, params);

    const totalHours = result[0]?.total_hours || 0;

    res.json({
      success: true,
      data: {
        total_hours: parseInt(totalHours) || 0
      }
    });
  } catch (error) {
    console.error('Get total hours error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/stats/completed
// @desc    Get count of completed activities for the current user
// @access  Private
router.get('/stats/completed', authenticate, async (req, res) => {
  console.log('📊 GET /api/activities/stats/completed - Request received');
  try {
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';
    const scopePersonal = req.query.scope === 'personal';
    const scopePersonalCreated = req.query.scope === 'personal_created';

    let query;
    let params = [];

    if (isAdmin && scopePersonalCreated) {
      // Only activities created by the user, completed (same completion logic).
      query = `
        SELECT COUNT(DISTINCT a.id) as completed_count
        FROM activities a
        WHERE a.is_active = true AND a.created_by = ?
        AND (
          (
            EXISTS(SELECT 1 FROM activity_tasks atx WHERE atx.activity_id = a.id)
            AND NOT EXISTS (SELECT 1 FROM activity_tasks atx WHERE atx.activity_id = a.id AND atx.status <> 'completed')
          )
          OR (NOT EXISTS(SELECT 1 FROM activity_tasks atx WHERE atx.activity_id = a.id) AND a.end_date IS NOT NULL AND a.end_date < NOW())
        )
      `;
      params = [userId];
    } else if (isAdmin && !scopePersonal) {
      // Admin (global): completed activities across ALL activities.
      // Completion logic matches activity status logic:
      // - If activity has tasks: completed only when ALL tasks are completed
      // - If activity has no tasks: completed when end_date is in the past
      query = `
        SELECT COUNT(DISTINCT a.id) as completed_count
        FROM activities a
        WHERE a.is_active = true
        AND (
          (
            EXISTS(SELECT 1 FROM activity_tasks atx WHERE atx.activity_id = a.id)
            AND NOT EXISTS (
              SELECT 1
              FROM activity_tasks atx
              WHERE atx.activity_id = a.id
                AND atx.status <> 'completed'
            )
          )
          OR
          (
            NOT EXISTS(SELECT 1 FROM activity_tasks atx WHERE atx.activity_id = a.id)
            AND a.end_date IS NOT NULL AND a.end_date < NOW()
          )
        )
      `;
      params = [];
    } else {
      // Volunteer: count completed activities they created, joined, or have tasks in
      // Completed when EITHER:
      //   - end_date is in the past (time-based completion), OR
      //   - all tasks for the activity are marked as completed (task-based completion)
      query = `
        SELECT COUNT(DISTINCT a.id) as completed_count
        FROM activities a
        WHERE a.is_active = true
        AND (
          (a.end_date IS NOT NULL AND a.end_date < NOW())
          OR NOT EXISTS (
            SELECT 1 
            FROM activity_tasks at 
            WHERE at.activity_id = a.id 
              AND at.status <> 'completed'
          )
        )
        AND (a.is_public = true OR a.created_by = ?)
        AND (
          a.created_by = ? OR
          EXISTS(SELECT 1 FROM activity_participants WHERE activity_id = a.id AND user_id = ?) OR
          EXISTS(SELECT 1 FROM task_users tu 
                 JOIN activity_tasks at ON tu.task_id = at.id 
                 WHERE at.activity_id = a.id AND tu.user_id = ?) OR
          EXISTS(SELECT 1 FROM activity_tasks WHERE activity_id = a.id AND created_by = ?)
        )
      `;
      params = [userId, userId, userId, userId, userId];
    }

    const [result] = await db.promise.execute(query, params);
    const completedCount = result[0]?.completed_count || 0;

    res.json({
      success: true,
      data: {
        completed_activities: parseInt(completedCount) || 0
      }
    });
  } catch (error) {
    console.error('Get completed activities error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/stats/my-activities
// @desc    Get total count of activities for the current user (created, joined, or has tasks). Admin can use ?scope=personal for own stats.
// @access  Private
router.get('/stats/my-activities', authenticate, async (req, res) => {
  console.log('📊 GET /api/activities/stats/my-activities - Request received');
  try {
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';
    const scopePersonal = req.query.scope === 'personal';
    const scopePersonalCreated = req.query.scope === 'personal_created';

    let query;
    let params = [];

    if (isAdmin && scopePersonalCreated) {
      query = `SELECT COUNT(DISTINCT a.id) as my_activities_count FROM activities a WHERE a.is_active = true AND a.created_by = ?`;
      params = [userId];
    } else if (isAdmin && !scopePersonal) {
      query = `
        SELECT COUNT(DISTINCT a.id) as my_activities_count
        FROM activities a
        WHERE a.is_active = true
      `;
      params = [];
    } else {
      // Volunteer: count activities they created, joined, or have tasks in (only public or their own)
      query = `
        SELECT COUNT(DISTINCT a.id) as my_activities_count
        FROM activities a
        WHERE a.is_active = true
        AND (a.is_public = true OR a.created_by = ?)
        AND (
          a.created_by = ? OR
          EXISTS(SELECT 1 FROM activity_participants WHERE activity_id = a.id AND user_id = ?) OR
          EXISTS(SELECT 1 FROM task_users tu 
                 JOIN activity_tasks at ON tu.task_id = at.id 
                 WHERE at.activity_id = a.id AND tu.user_id = ?) OR
          EXISTS(SELECT 1 FROM activity_tasks WHERE activity_id = a.id AND created_by = ?)
        )
      `;
      params = [userId, userId, userId, userId, userId];
    }

    const [result] = await db.promise.execute(query, params);
    const myActivitiesCount = result[0]?.my_activities_count || 0;

    res.json({
      success: true,
      data: {
        my_activities: parseInt(myActivitiesCount) || 0
      }
    });
  } catch (error) {
    console.error('Get my activities error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/stats/total-tasks
// @desc    Get total count of tasks created by the current user
// @access  Private
router.get('/stats/total-tasks', authenticate, async (req, res) => {
  console.log('📊 GET /api/activities/stats/total-tasks - Request received');
  try {
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';
    const scopePersonal = req.query.scope === 'personal';
    const scopePersonalCreated = req.query.scope === 'personal_created';

    // personal_created: only tasks in activities created by the user (strict individual).
    let query;
    let params = [];
    if (isAdmin && scopePersonalCreated) {
      query = `SELECT COUNT(*) as total_tasks
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE a.created_by = ? AND at.created_by = ? AND a.is_active = true`;
      params = [userId, userId];
    } else if (!isAdmin || scopePersonal) {
      query = `SELECT COUNT(*) as total_tasks
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE at.created_by = ? AND a.is_active = true`;
      params = [userId];
    } else {
      query = `SELECT COUNT(*) as total_tasks
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE a.is_active = true`;
    }
    const [result] = await db.promise.execute(query, params);

    const totalTasks = result[0]?.total_tasks || 0;

    res.json({
      success: true,
      data: {
        total_tasks: parseInt(totalTasks) || 0
      }
    });
  } catch (error) {
    console.error('Get total tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/stats/task-hours-by-activity
// @desc    Get task hours grouped by activity for a specific date range
// @access  Private
// Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), or period (last_week, last_month, last_year)
router.get('/stats/task-hours-by-activity', authenticate, async (req, res) => {
  console.log('📊 GET /api/activities/stats/task-hours-by-activity - Request received');
  try {
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';
    const scopePersonal = req.query.scope === 'personal';
    const scopePersonalCreated = req.query.scope === 'personal_created';
    const { start_date, end_date, period } = req.query;

    let startDate, endDate;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Determine date range based on period or provided dates
    if (period === 'last_week') {
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999); // Include end of today
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'last_month') {
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'last_year') {
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (start_date && end_date) {
      startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to last month if no period or dates provided
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    }

    // Format dates for MySQL
    const formatDateForQuery = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDateForQuery(startDate);
    const endDateStr = formatDateForQuery(endDate);

    console.log('📅 Date range:', { startDateStr, endDateStr, period, start_date, end_date, userId });

    // personal_created: only activities created by user, tasks created by user.
    // personal: tasks created by user (any activity). global: all tasks.
    const usePersonalCreated = isAdmin && scopePersonalCreated;
    const usePersonal = !isAdmin || scopePersonal || usePersonalCreated;
    const query = usePersonalCreated
      ? `SELECT 
          a.id as activity_id,
          a.title as activity_title,
          COALESCE(SUM(at.total_hours), 0) as total_hours,
          COUNT(at.id) as task_count
         FROM activities a
         INNER JOIN activity_tasks at ON a.id = at.activity_id
         WHERE a.is_active = true AND a.created_by = ? AND at.created_by = ?
           AND at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND (
             (DATE(at.created_at) >= ? AND DATE(at.created_at) <= ?)
             OR (DATE(at.updated_at) >= ? AND DATE(at.updated_at) <= ?)
           )
         GROUP BY a.id, a.title
         ORDER BY total_hours DESC`
      : !usePersonal
      ? `SELECT 
          a.id as activity_id,
          a.title as activity_title,
          COALESCE(SUM(at.total_hours), 0) as total_hours,
          COUNT(at.id) as task_count
         FROM activities a
         INNER JOIN activity_tasks at ON a.id = at.activity_id
         WHERE a.is_active = true
           AND at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND (
             (DATE(at.created_at) >= ? AND DATE(at.created_at) <= ?)
             OR
             (DATE(at.updated_at) >= ? AND DATE(at.updated_at) <= ?)
           )
         GROUP BY a.id, a.title
         ORDER BY total_hours DESC`
      : `SELECT 
          a.id as activity_id,
          a.title as activity_title,
          COALESCE(SUM(at.total_hours), 0) as total_hours,
          COUNT(at.id) as task_count
         FROM activities a
         INNER JOIN activity_tasks at ON a.id = at.activity_id
         WHERE a.is_active = true
           AND at.created_by = ?
           AND at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND (
             (DATE(at.created_at) >= ? AND DATE(at.created_at) <= ?)
             OR
             (DATE(at.updated_at) >= ? AND DATE(at.updated_at) <= ?)
           )
         GROUP BY a.id, a.title
         ORDER BY total_hours DESC`;

    const params = usePersonalCreated
      ? [userId, userId, startDateStr, endDateStr, startDateStr, endDateStr]
      : usePersonal
      ? [userId, startDateStr, endDateStr, startDateStr, endDateStr]
      : [startDateStr, endDateStr, startDateStr, endDateStr];

    const [result] = await db.promise.execute(query, params);

    console.log('📊 Query result count:', result.length);
    if (result.length > 0) {
      console.log('📊 Sample result:', result[0]);
    }

    const taskHoursData = result.map(row => ({
      activity_id: row.activity_id,
      activity_title: row.activity_title,
      total_hours: parseInt(row.total_hours) || 0,
      task_count: parseInt(row.task_count) || 0
    }));

    res.json({
      success: true,
      data: {
        task_hours_by_activity: taskHoursData,
        date_range: {
          start_date: startDateStr,
          end_date: endDateStr
        }
      }
    });
  } catch (error) {
    console.error('Get task hours by activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== TASK MANAGEMENT ROUTES ====================
// Note: These routes must be defined before /:id route to ensure proper matching

// @route   GET /api/activities/tasks/my-tasks
// @desc    Get all tasks for the current user (tasks they created or are assigned to)
// @access  Private
router.get('/tasks/my-tasks', authenticate, async (req, res) => {
  console.log('📋 GET /api/activities/tasks/my-tasks - Request received');
  try {
    const userId = req.user.id;

    // Get all tasks where:
    // 1. User created the task (created_by = userId)
    // 2. OR user is assigned to the task (via task_users table)
    const [tasks] = await db.promise.execute(
      `SELECT DISTINCT
        at.id,
        at.activity_id,
        at.title,
        at.description,
        at.start_date,
        at.due_date,
        at.total_hours,
        at.status,
        at.completed,
        at.created_at,
        at.updated_at,
        at.created_by,
        a.title as activity_title,
        a.location as activity_location,
        u.name as creator_name,
        CASE 
          WHEN at.created_by = ? THEN 'created'
          WHEN EXISTS(SELECT 1 FROM task_users tu WHERE tu.task_id = at.id AND tu.user_id = ?) THEN 'assigned'
          ELSE 'unknown'
        END as task_type
       FROM activity_tasks at
       INNER JOIN activities a ON at.activity_id = a.id
       LEFT JOIN users u ON at.created_by = u.id
       WHERE (at.created_by = ? 
         OR EXISTS(SELECT 1 FROM task_users tu WHERE tu.task_id = at.id AND tu.user_id = ?))
         AND a.is_active = true
       ORDER BY at.updated_at DESC, at.created_at DESC`,
      [userId, userId, userId, userId]
    );

    console.log('📋 User tasks count:', tasks.length);

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/:id/tasks
// @desc    Get all tasks for an activity
// @access  Private
router.get('/:id/tasks', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Check if activity exists and user has access
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check access permission
    if (!isAdmin && !activity.is_public && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view tasks for public activities or your own private activities.'
      });
    }

    // Get tasks for this activity with creator info
    const [tasks] = await db.promise.execute(
      `SELECT t.*, u.name as creator_name, u.user_type as creator_user_type, u.role as creator_role
       FROM activity_tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.activity_id = ?
       ORDER BY t.created_at ASC`,
      [activityId]
    );

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/activities/:id/tasks
// @desc    Create a new task for an activity
// @access  Private
router.post('/:id/tasks', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = parseInt(req.user.id); // Ensure userId is an integer
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { title, description, start_date, due_date, total_hours, status } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    // Check if activity exists and user has access
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Ensure proper type comparison (convert to numbers for comparison)
    const activityCreatorId = Number(activity.created_by);
    const currentUserId = Number(userId);
    const isActivityCreator = activityCreatorId === currentUserId;

    // Check if user has joined the activity
    let hasJoined = false;
    try {
      // Ensure both IDs are integers for proper comparison
      const activityIdInt = parseInt(activityId);
      const userIdInt = parseInt(userId);
      
      const [participants] = await db.promise.execute(
        'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
        [activityIdInt, userIdInt]
      );
      
      hasJoined = participants && Array.isArray(participants) && participants.length > 0;
      
      console.log('📋 Participant Check:', {
        activityId: activityIdInt,
        userId: userIdInt,
        hasJoined,
        participantsFound: participants ? participants.length : 0,
        participantData: participants && participants.length > 0 ? participants[0] : null
      });
    } catch (dbError) {
      console.error('❌ Database error checking participants:', dbError);
      hasJoined = false;
    }

    // Check permission: Admin, activity creator, OR users who joined can add tasks
    const canCreateTask = isAdmin || isActivityCreator || hasJoined;
    
    console.log('🔐 Permission Check:', {
      userId: parseInt(userId),
      activityId: parseInt(activityId),
      isAdmin,
      isActivityCreator,
      hasJoined,
      canCreateTask,
      activityCreatedBy: activityCreatorId
    });
    
    if (!canCreateTask) {
      return res.status(403).json({
        success: false,
        message: 'You can only add tasks to activities you created or have joined. Please join the activity first if you want to add tasks.',
        debug: {
          isAdmin,
          isActivityCreator,
          hasJoined,
          userId: parseInt(userId),
          activityId: parseInt(activityId)
        }
      });
    }
    
    console.log('✅ Permission GRANTED - User can create task');

    // Determine completed status based on status field
    const completed = status === 'completed' || false;

    // Format dates for MySQL
    const formattedTaskStartDate = formatDateForMySQL(start_date);
    const formattedTaskDueDate = formatDateForMySQL(due_date);

    // Insert task
    const [result] = await db.promise.execute(
      `INSERT INTO activity_tasks 
       (activity_id, title, description, start_date, due_date, total_hours, status, completed, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activityId,
        title.trim(),
        description ? description.trim() : null,
        formattedTaskStartDate,
        formattedTaskDueDate,
        total_hours ? parseInt(total_hours) : null,
        status || 'pending',
        completed,
        userId
      ]
    );

    // Get created task with creator information
    const [tasks] = await db.promise.execute(
      `SELECT t.*, u.name as creator_name, u.user_type as creator_user_type, u.role as creator_role
       FROM activity_tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    console.log('✅ Task created successfully:', {
      taskId: result.insertId,
      activityId: parseInt(activityId),
      createdBy: parseInt(userId),
      title: title.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: tasks[0]
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/activities/:id/tasks/:taskId
// @desc    Update a task
// @access  Private
router.put('/:id/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { title, description, start_date, due_date, total_hours, status, completed } = req.body;

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check if task exists and get task creator info
    const [tasks] = await db.promise.execute(
      `SELECT t.*, u.user_type as task_creator_type, u.role as task_creator_role
       FROM activity_tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ? AND t.activity_id = ?`,
      [taskId, activityId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = tasks[0];
    const taskCreatorId = task.created_by;
    const taskCreatorIsAdmin = task.task_creator_role === 0 || task.task_creator_type === 'admin';

    // Check permission:
    // 1. If task was created by a regular user: only that user can edit
    // 2. If task was created by admin: only admin can edit (not regular users)
    if (taskCreatorIsAdmin) {
      // Task created by admin - only admin can edit
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit tasks that you created. Admin tasks can only be edited by admins.'
        });
      }
    } else {
      // Task created by regular user - only that user can edit
      if (taskCreatorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit tasks that you created'
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description ? description.trim() : null); }
    if (start_date !== undefined) { 
      const formattedTaskStartDate = formatDateForMySQL(start_date);
      updates.push('start_date = ?'); 
      values.push(formattedTaskStartDate); 
    }
    if (due_date !== undefined) { 
      const formattedTaskDueDate = formatDateForMySQL(due_date);
      updates.push('due_date = ?'); 
      values.push(formattedTaskDueDate); 
    }
    if (total_hours !== undefined) { updates.push('total_hours = ?'); values.push(total_hours ? parseInt(total_hours) : null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (completed !== undefined) { updates.push('completed = ?'); values.push(completed); }
    
    // Auto-update completed based on status if status is provided
    if (status !== undefined && completed === undefined) {
      updates.push('completed = ?');
      values.push(status === 'completed');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(taskId);

    await db.promise.execute(
      `UPDATE activity_tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated task with creator info
    const [updatedTasks] = await db.promise.execute(
      `SELECT t.*, u.name as creator_name, u.user_type as creator_user_type, u.role as creator_role
       FROM activity_tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ?`,
      [taskId]
    );

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTasks[0]
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/activities/:id/tasks/:taskId
// @desc    Delete a task
// @access  Private
router.delete('/:id/tasks/:taskId', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check if task exists and get task creator info
    const [tasks] = await db.promise.execute(
      `SELECT t.*, u.user_type as task_creator_type, u.role as task_creator_role
       FROM activity_tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ? AND t.activity_id = ?`,
      [taskId, activityId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = tasks[0];
    const taskCreatorId = parseInt(task.created_by);
    const currentUserIdInt = parseInt(userId);
    const taskCreatorIsAdmin = task.task_creator_role === 0 || task.task_creator_type === 'admin';
    const isActivityCreator = parseInt(activity.created_by) === currentUserIdInt;

    // Check permission:
    // 1. Admin can delete any task (created by admin or regular user)
    // 2. Activity creator (admin) can delete any task in their activity
    // 3. If task was created by admin: only admin can delete (not regular users)
    // 4. If task was created by regular user: that user OR admin can delete
    if (isAdmin) {
      // Admin can delete any task
      console.log('✅ Admin can delete task - permission granted');
    } else if (taskCreatorIsAdmin) {
      // Task created by admin - only admin can delete
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks that you created. Admin tasks can only be deleted by admins.'
      });
    } else {
      // Task created by regular user - only that user can delete (unless admin)
      if (taskCreatorId !== currentUserIdInt) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete tasks that you created'
        });
      }
    }

    // Delete task
    await db.promise.execute(
      'DELETE FROM activity_tasks WHERE id = ?',
      [taskId]
    );

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== TASK USER MANAGEMENT ROUTES ====================
// Note: These routes must be defined before /:id route to ensure proper matching

// @route   POST /api/activities/:id/tasks/:taskId/users
// @desc    Assign a user to a task (Admin or activity creator only)
// @access  Private
router.post('/:id/tasks/:taskId/users', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const assignUserId = parseInt(user_id);

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission - only admin or activity creator can assign users to tasks
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign users to tasks for activities you created'
      });
    }

    // Check if task exists
    const [tasks] = await db.promise.execute(
      'SELECT * FROM activity_tasks WHERE id = ? AND activity_id = ?',
      [taskId, activityId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user exists and is active
    const [users] = await db.promise.execute(
      'SELECT id, name, email FROM users WHERE id = ? AND is_active = true',
      [assignUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if user is already assigned to this task
    const [existing] = await db.promise.execute(
      'SELECT * FROM task_users WHERE task_id = ? AND user_id = ?',
      [taskId, assignUserId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to this task'
      });
    }

    // Assign user to task
    await db.promise.execute(
      'INSERT INTO task_users (task_id, user_id, status) VALUES (?, ?, ?)',
      [taskId, assignUserId, 'assigned']
    );

    // Get updated assignment info
    const [assignment] = await db.promise.execute(
      `SELECT tu.*, u.id as user_id, u.name, u.email, u.phone
       FROM task_users tu
       JOIN users u ON tu.user_id = u.id
       WHERE tu.task_id = ? AND tu.user_id = ?`,
      [taskId, assignUserId]
    );

    res.status(201).json({
      success: true,
      message: 'User assigned to task successfully',
      data: assignment[0]
    });
  } catch (error) {
    console.error('Assign user to task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/activities/:id/tasks/:taskId/users/:userId
// @desc    Update a user's assignment status in a task (Admin or activity creator only)
// @access  Private
router.put('/:id/tasks/:taskId/users/:userId', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);
    const assignUserId = parseInt(req.params.userId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { status } = req.body;

    // Validate status if provided
    const validStatuses = ['assigned', 'in-progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission - only admin or activity creator can update task assignments
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update task assignments for activities you created'
      });
    }

    // Check if task exists
    const [tasks] = await db.promise.execute(
      'SELECT * FROM activity_tasks WHERE id = ? AND activity_id = ?',
      [taskId, activityId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is assigned to this task
    const [existing] = await db.promise.execute(
      'SELECT * FROM task_users WHERE task_id = ? AND user_id = ?',
      [taskId, assignUserId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not assigned to this task'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update. Provide at least one field (status)'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(taskId, assignUserId);

    // Update assignment
    await db.promise.execute(
      `UPDATE task_users SET ${updates.join(', ')} WHERE task_id = ? AND user_id = ?`,
      values
    );

    // Get updated assignment info
    const [assignment] = await db.promise.execute(
      `SELECT tu.*, u.id as user_id, u.name, u.email, u.phone
       FROM task_users tu
       JOIN users u ON tu.user_id = u.id
       WHERE tu.task_id = ? AND tu.user_id = ?`,
      [taskId, assignUserId]
    );

    res.json({
      success: true,
      message: 'Task assignment updated successfully',
      data: assignment[0]
    });
  } catch (error) {
    console.error('Update task assignment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/activities/:id/tasks/:taskId/users/:userId
// @desc    Remove a user from a task (Admin or activity creator only)
// @access  Private
router.delete('/:id/tasks/:taskId/users/:userId', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);
    const assignUserId = parseInt(req.params.userId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission - only admin or activity creator can remove task assignments
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove task assignments for activities you created'
      });
    }

    // Check if task exists
    const [tasks] = await db.promise.execute(
      'SELECT * FROM activity_tasks WHERE id = ? AND activity_id = ?',
      [taskId, activityId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is assigned to this task
    const [existing] = await db.promise.execute(
      'SELECT * FROM task_users WHERE task_id = ? AND user_id = ?',
      [taskId, assignUserId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not assigned to this task'
      });
    }

    // Remove assignment
    await db.promise.execute(
      'DELETE FROM task_users WHERE task_id = ? AND user_id = ?',
      [taskId, assignUserId]
    );

    res.json({
      success: true,
      message: 'User removed from task successfully'
    });
  } catch (error) {
    console.error('Remove user from task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/:id/tasks/:taskId/users
// @desc    Get all users assigned to a task
// @access  Private
router.get('/:id/tasks/:taskId/users', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check access permission
    if (!isAdmin && !activity.is_public && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view task users for public activities or your own private activities.'
      });
    }

    // Check if task exists
    const [tasks] = await db.promise.execute(
      'SELECT * FROM activity_tasks WHERE id = ? AND activity_id = ?',
      [taskId, activityId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get assigned users for this task
    const [assignedUsers] = await db.promise.execute(
      `SELECT tu.*, u.id as user_id, u.name, u.email, u.phone
       FROM task_users tu
       JOIN users u ON tu.user_id = u.id
       WHERE tu.task_id = ?
       ORDER BY tu.assigned_at ASC`,
      [taskId]
    );

    res.json({
      success: true,
      count: assignedUsers.length,
      data: assignedUsers
    });
  } catch (error) {
    console.error('Get task users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/activities/:id
// @desc    Get activity by ID
// @access  Private
// Rules:
//   - Admins can view any activity
//   - Volunteers can only view public activities or their own private activities
router.get('/:id', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const [activities] = await db.promise.execute(
      `SELECT a.*, 
       u.name as creator_name, u.email as creator_email, u.user_type as creator_user_type,
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count,
       EXISTS(SELECT 1 FROM activity_participants WHERE activity_id = a.id AND user_id = ?) as is_joined,
       (SELECT (COUNT(*) > 0 AND SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) = COUNT(*)) FROM activity_tasks WHERE activity_id = a.id) as all_tasks_completed,
       EXISTS(SELECT 1 FROM activity_tasks WHERE activity_id = a.id) as activity_has_tasks
       FROM activities a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = ? AND a.is_active = true`,
      [userId, activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];
    const status = getActivityStatusFromRow(activity);

    // Check access permission
    if (!isAdmin && !activity.is_public && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view public activities or your own private activities.'
      });
    }

    // Get participants list (only for public activities or if user is admin/creator)
    let participants = [];
    if (activity.is_public || isAdmin || activity.created_by === userId) {
      const [participantsList] = await db.promise.execute(
        `SELECT ap.*, u.id as user_id, u.name, u.email, u.phone
         FROM activity_participants ap
         JOIN users u ON ap.user_id = u.id
         WHERE ap.activity_id = ?
         ORDER BY ap.joined_at ASC`,
        [activityId]
      );
      participants = participantsList;
    }

    res.json({
      success: true,
      data: {
        ...activity,
        status,
        participants: participants
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/activities/:id/join
// @desc    Join an activity
// @access  Private
// Rules:
//   - Only public activities (created by admin) can be joined
//   - Volunteers cannot join private activities created by other volunteers
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get activity details
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check if activity is public (only public activities can be joined)
    if (!activity.is_public) {
      return res.status(403).json({
        success: false,
        message: 'Cannot join this activity. Only public activities created by admins can be joined.'
      });
    }

    // Check if user is already a participant
    const [existing] = await db.promise.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this activity'
      });
    }

    // Check max participants limit
    if (activity.max_participants) {
      const [count] = await db.promise.execute(
        'SELECT COUNT(*) as count FROM activity_participants WHERE activity_id = ?',
        [activityId]
      );
      
      if (count[0].count >= activity.max_participants) {
        return res.status(400).json({
          success: false,
          message: 'Activity is full. Maximum participants reached.'
        });
      }
    }

    // Add participant
    await db.promise.execute(
      'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, ?)',
      [activityId, userId, 'registered']
    );

    // Get updated activity with participant count
    const [updated] = await db.promise.execute(
      `SELECT a.*, 
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
       FROM activities a
       WHERE a.id = ?`,
      [activityId]
    );

    res.json({
      success: true,
      message: 'Successfully joined the activity',
      data: updated[0]
    });
  } catch (error) {
    console.error('Join activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/activities/:id/leave
// @desc    Leave an activity
// @access  Private
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if user is a participant
    const [existing] = await db.promise.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );

    if (existing.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You are not a participant of this activity'
      });
    }

    // Remove participant
    await db.promise.execute(
      'DELETE FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );

    res.json({
      success: true,
      message: 'Successfully left the activity'
    });
  } catch (error) {
    console.error('Leave activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/activities/:id
// @desc    Update an activity
// @access  Private
// Rules:
//   - Admins can update any activity
//   - Volunteers can only update their own activities
router.put('/:id', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { title, description, category, organization_name, location, start_date, end_date, max_participants, is_active, participant_ids, contact_email, contact_phone, requirements } = req.body;

    // Get activity
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ?',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own activities'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (organization_name !== undefined) { updates.push('organization_name = ?'); values.push(organization_name); }
    if (location !== undefined) { updates.push('location = ?'); values.push(location); }
    if (start_date !== undefined) { 
      const formattedStartDate = formatDateForMySQL(start_date);
      if (!formattedStartDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start_date format. Please provide a valid date.'
        });
      }
      updates.push('start_date = ?'); 
      values.push(formattedStartDate); 
    }
    if (end_date !== undefined) { 
      const formattedEndDate = formatDateForMySQL(end_date);
      updates.push('end_date = ?'); 
      values.push(formattedEndDate); 
    }
    if (max_participants !== undefined) { updates.push('max_participants = ?'); values.push(max_participants); }
    if (contact_email !== undefined) { updates.push('contact_email = ?'); values.push(contact_email); }
    if (contact_phone !== undefined) { updates.push('contact_phone = ?'); values.push(contact_phone); }
    if (requirements !== undefined) { updates.push('requirements = ?'); values.push(requirements); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    
    // Only admin can change is_public status
    if (isAdmin && req.body.is_public !== undefined) {
      updates.push('is_public = ?');
      values.push(req.body.is_public ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(activityId);

    await db.promise.execute(
      `UPDATE activities SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Update participants if provided (admin or activity creator only)
    if (participant_ids !== undefined && (isAdmin || activity.created_by === userId)) {
      // Get current participants
      const [currentParticipants] = await db.promise.execute(
        'SELECT user_id FROM activity_participants WHERE activity_id = ?',
        [activityId]
      );
      const currentUserIds = currentParticipants.map(p => p.user_id);

      // Parse participant_ids to integers
      const newUserIds = Array.isArray(participant_ids) 
        ? participant_ids.map(id => parseInt(id)).filter(id => !isNaN(id))
        : [];

      // Find users to add and remove
      const usersToAdd = newUserIds.filter(id => !currentUserIds.includes(id));
      const usersToRemove = currentUserIds.filter(id => !newUserIds.includes(id));

      // Remove participants
      if (usersToRemove.length > 0) {
        const placeholders = usersToRemove.map(() => '?').join(',');
        await db.promise.execute(
          `DELETE FROM activity_participants WHERE activity_id = ? AND user_id IN (${placeholders})`,
          [activityId, ...usersToRemove]
        );
      }

      // Add new participants
      if (usersToAdd.length > 0) {
        // Validate that all user IDs exist
        const placeholders = usersToAdd.map(() => '?').join(',');
        const [users] = await db.promise.execute(
          `SELECT id FROM users WHERE id IN (${placeholders}) AND is_active = true`,
          usersToAdd
        );

        const validUserIds = users.map(u => u.id);

        // Add participants
        for (const participantId of validUserIds) {
          // Check if already a participant (shouldn't happen, but just in case)
          const [existing] = await db.promise.execute(
            'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
            [activityId, participantId]
          );

          if (existing.length === 0) {
            await db.promise.execute(
              'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, ?)',
              [activityId, participantId, 'registered']
            );
          }
        }
      }
    }

    // Get updated activity
    const [updated] = await db.promise.execute(
      `SELECT a.*, 
       u.name as creator_name, u.email as creator_email,
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
       FROM activities a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [activityId]
    );

    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/activities/:id/participants
// @desc    Add a participant to an activity (Admin or activity creator only)
// @access  Private
router.post('/:id/participants', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const participantUserId = parseInt(user_id);

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission - only admin or activity creator can add participants
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only add participants to activities you created'
      });
    }

    // Check if user exists and is active
    const [users] = await db.promise.execute(
      'SELECT id, name, email FROM users WHERE id = ? AND is_active = true',
      [participantUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if user is already a participant
    const [existing] = await db.promise.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, participantUserId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User is already a participant in this activity'
      });
    }

    // Check max participants limit
    if (activity.max_participants) {
      const [count] = await db.promise.execute(
        'SELECT COUNT(*) as count FROM activity_participants WHERE activity_id = ?',
        [activityId]
      );
      
      if (count[0].count >= activity.max_participants) {
        return res.status(400).json({
          success: false,
          message: 'Activity is full. Maximum participants reached.'
        });
      }
    }

    // Add participant
    await db.promise.execute(
      'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, ?)',
      [activityId, participantUserId, 'registered']
    );

    // Get updated participant info
    const [participant] = await db.promise.execute(
      `SELECT ap.*, u.id as user_id, u.name, u.email, u.phone
       FROM activity_participants ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.activity_id = ? AND ap.user_id = ?`,
      [activityId, participantUserId]
    );

    // Get updated activity with participant count
    const [updated] = await db.promise.execute(
      `SELECT a.*, 
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
       FROM activities a
       WHERE a.id = ?`,
      [activityId]
    );

    res.status(201).json({
      success: true,
      message: 'Participant added successfully',
      data: {
        participant: participant[0],
        activity: updated[0]
      }
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/activities/:id/participants/:userId
// @desc    Update a participant's status in an activity (Admin or activity creator only)
// @access  Private
router.put('/:id/participants/:userId', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const participantUserId = parseInt(req.params.userId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    const { status } = req.body;

    // Validate status if provided
    const validStatuses = ['registered', 'confirmed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission - only admin or activity creator can update participants
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update participants for activities you created'
      });
    }

    // Check if user is a participant
    const [existing] = await db.promise.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, participantUserId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not a participant in this activity'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update. Provide at least one field (status)'
      });
    }

    values.push(activityId, participantUserId);

    // Update participant
    await db.promise.execute(
      `UPDATE activity_participants SET ${updates.join(', ')} WHERE activity_id = ? AND user_id = ?`,
      values
    );

    // Get updated participant info
    const [participant] = await db.promise.execute(
      `SELECT ap.*, u.id as user_id, u.name, u.email, u.phone
       FROM activity_participants ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.activity_id = ? AND ap.user_id = ?`,
      [activityId, participantUserId]
    );

    // Get updated activity with participant count
    const [updated] = await db.promise.execute(
      `SELECT a.*, 
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
       FROM activities a
       WHERE a.id = ?`,
      [activityId]
    );

    res.json({
      success: true,
      message: 'Participant updated successfully',
      data: {
        participant: participant[0],
        activity: updated[0]
      }
    });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/activities/:id/participants/:userId
// @desc    Remove a participant from an activity (Admin or activity creator only)
// @access  Private
router.delete('/:id/participants/:userId', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const participantUserId = parseInt(req.params.userId);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Check if activity exists
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ? AND is_active = true',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission - only admin or activity creator can remove participants
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove participants from activities you created'
      });
    }

    // Check if user is a participant
    const [existing] = await db.promise.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, participantUserId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User is not a participant in this activity'
      });
    }

    // Remove participant
    await db.promise.execute(
      'DELETE FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, participantUserId]
    );

    // Get updated activity with participant count
    const [updated] = await db.promise.execute(
      `SELECT a.*, 
       (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
       FROM activities a
       WHERE a.id = ?`,
      [activityId]
    );

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete an activity
// @access  Private
// Rules:
//   - Admins can delete any activity
//   - Volunteers can only delete their own activities
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = Number(req.user.role);
    const isAdmin = userRole === 0 || req.user.user_type === 'admin';

    // Get activity
    const [activities] = await db.promise.execute(
      'SELECT * FROM activities WHERE id = ?',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const activity = activities[0];

    // Check permission
    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own activities'
      });
    }

    // Hard delete so related tasks/hours are removed from DB.
    // Cascades: activity_tasks, task_users, activity_participants (via FK onDelete CASCADE).
    await db.promise.execute(
      'DELETE FROM activities WHERE id = ?',
      [activityId]
    );

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

