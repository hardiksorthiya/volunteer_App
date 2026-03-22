const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp.extension
    const userId = req.user.id;
    const ext = path.extname(file.originalname);
    const filename = `profile-${userId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch user from database to get latest data including profile_image and hour target
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, profile_image, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at, hour_target_type, hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userData = users[0];
    // Add image field for compatibility with frontend
    if (userData.profile_image) {
      userData.image = userData.profile_image;
    }
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hour target progress handler (shared by both route paths)
const hourTargetProgressHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await db.promise.execute(
      'SELECT hour_target_type, hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const row = users[0] || {};
    const targetType = row.hour_target_type || null; // legacy
    const targetHours = row.hour_target_hours != null ? parseInt(row.hour_target_hours, 10) : null;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const normalizeYMD = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, '0');
        const d = String(value.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const s = String(value);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return s;
      const y = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekStartStr = startOfWeek.toISOString().slice(0, 10).replace(/-/g, '-');
    const monthStartStr = `${y}-${m}-01`;

    // Date-range target (preferred). If not present, fall back to legacy weekly/monthly.
    let rangeStartStr = normalizeYMD(row.hour_target_start_date);
    let rangeEndStr = normalizeYMD(row.hour_target_end_date);

    if (!rangeStartStr || !rangeEndStr) {
      if (targetType === 'weekly') {
        rangeStartStr = weekStartStr;
        rangeEndStr = todayStr;
      } else if (targetType === 'monthly') {
        rangeStartStr = monthStartStr;
        rangeEndStr = todayStr;
      }
    }

    // "Hours worked" should match dashboard "task-hours-by-activity":
    // Count logged hours (total_hours > 0) for tasks created by user that were created OR updated in the period,
    // regardless of task status.
    const [weekResult] = await db.promise.execute(
      `SELECT COALESCE(SUM(at.total_hours), 0) as hours
       FROM activity_tasks at
       INNER JOIN activities a ON at.activity_id = a.id
       WHERE a.is_active = true
         AND at.created_by = ?
         AND at.total_hours IS NOT NULL
         AND at.total_hours > 0
         AND (
           (DATE(at.created_at) >= ? AND DATE(at.created_at) <= ?)
           OR
           (DATE(at.updated_at) >= ? AND DATE(at.updated_at) <= ?)
         )`,
      [userId, weekStartStr, todayStr, weekStartStr, todayStr]
    );
    const [monthResult] = await db.promise.execute(
      `SELECT COALESCE(SUM(at.total_hours), 0) as hours
       FROM activity_tasks at
       INNER JOIN activities a ON at.activity_id = a.id
       WHERE a.is_active = true
         AND at.created_by = ?
         AND at.total_hours IS NOT NULL
         AND at.total_hours > 0
         AND (
           (DATE(at.created_at) >= ? AND DATE(at.created_at) <= ?)
           OR
           (DATE(at.updated_at) >= ? AND DATE(at.updated_at) <= ?)
         )`,
      [userId, monthStartStr, todayStr, monthStartStr, todayStr]
    );
    const currentWeekHours = parseInt(weekResult[0]?.hours || 0, 10);
    const currentMonthHours = parseInt(monthResult[0]?.hours || 0, 10);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const periodLabelWeek = `Week of ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()}`;
    const periodLabelMonth = `${monthNames[now.getMonth()]} ${y}`;

    let currentRangeHours = 0;
    let periodLabelRange = null;
    if (rangeStartStr && rangeEndStr && targetHours != null) {
      const [rangeResult] = await db.promise.execute(
        `SELECT COALESCE(SUM(at.total_hours), 0) as hours
         FROM activity_tasks at
         INNER JOIN activities a ON at.activity_id = a.id
         WHERE a.is_active = true
           AND at.created_by = ?
           AND at.total_hours IS NOT NULL
           AND at.total_hours > 0
           AND (
             (DATE(at.created_at) >= ? AND DATE(at.created_at) <= ?)
             OR
             (DATE(at.updated_at) >= ? AND DATE(at.updated_at) <= ?)
           )`,
        [userId, rangeStartStr, rangeEndStr, rangeStartStr, rangeEndStr]
      );
      currentRangeHours = parseInt(rangeResult[0]?.hours || 0, 10);
      periodLabelRange = `${rangeStartStr} - ${rangeEndStr}`;
    }
    res.json({
      success: true,
      data: {
        target_type: targetType,
        target_hours: targetHours,

        // Date-range fields (new)
        target_start_date: normalizeYMD(row.hour_target_start_date) || rangeStartStr,
        target_end_date: normalizeYMD(row.hour_target_end_date) || rangeEndStr,
        current_range_hours: currentRangeHours,
        period_label_range: periodLabelRange,

        current_week_hours: currentWeekHours,
        current_month_hours: currentMonthHours,
        period_label_week: periodLabelWeek,
        period_label_month: periodLabelMonth
      }
    });
  } catch (error) {
    console.error('Hour target progress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/users/me/hour-target-progress  OR  GET /api/users/hour-target-progress
// @desc    Get user's hour target and progress (hours completed in current week/month)
// @access  Private
router.get('/me/hour-target-progress', authenticate, hourTargetProgressHandler);
router.get('/hour-target-progress', authenticate, hourTargetProgressHandler);

// @route   GET /api/users/me/hour-targets
// @desc    Get current user's hour target history (most recent first)
// @access  Private
router.get('/me/hour-targets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.promise.execute(
      `SELECT id, target_type, target_hours, start_date, end_date, created_at
       FROM user_hour_targets
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Get hour targets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/users/me/hour-target
// @desc    Clear current hour target (active target hours + date range) and remove matching history record(s)
// @access  Private
router.delete('/me/hour-target', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.promise.execute(
      'SELECT hour_target_type, hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const normalizeYMD = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, '0');
        const d = String(value.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const s = String(value);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return s;
      const y = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    const currType = rows[0].hour_target_type || null;
    const currHours = rows[0].hour_target_hours != null ? parseInt(rows[0].hour_target_hours, 10) : null;
    const currStart = normalizeYMD(rows[0].hour_target_start_date);
    const currEnd = normalizeYMD(rows[0].hour_target_end_date);

    // Best-effort history cleanup (exact match when range is known).
    if (currHours != null) {
      if (currStart && currEnd) {
        await db.promise.execute(
          'DELETE FROM user_hour_targets WHERE user_id = ? AND target_hours = ? AND start_date = ? AND end_date = ?',
          [userId, currHours, currStart, currEnd]
        );
      } else if (currType) {
        await db.promise.execute(
          'DELETE FROM user_hour_targets WHERE user_id = ? AND target_hours = ? AND target_type = ?',
          [userId, currHours, currType]
        );
      } else {
        // Fallback: delete history rows matching the hours only.
        await db.promise.execute(
          'DELETE FROM user_hour_targets WHERE user_id = ? AND target_hours = ?',
          [userId, currHours]
        );
      }
    }

    await db.promise.execute(
      'UPDATE users SET hour_target_type = ?, hour_target_hours = ?, hour_target_start_date = ?, hour_target_end_date = ? WHERE id = ?',
      [null, null, null, null, userId]
    );

    res.json({ success: true, message: 'Hour target cleared' });
  } catch (error) {
    console.error('Clear hour target error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/me/hour-targets/:id
// @desc    Edit a history target row and sync it to the active user target
// @access  Private
router.put('/me/hour-targets/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = parseInt(req.params.id, 10);
    const {
      hour_target_hours,
      hour_target_start_date,
      hour_target_end_date
    } = req.body;

    if (!targetId || Number.isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid target id' });
    }

    const hoursNum =
      hour_target_hours === '' || hour_target_hours === undefined || hour_target_hours === null
        ? null
        : parseInt(hour_target_hours, 10);

    if (hoursNum === null || Number.isNaN(hoursNum) || hoursNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'hour_target_hours must be a non-negative number'
      });
    }

    if (!hour_target_start_date || !hour_target_end_date) {
      return res.status(400).json({
        success: false,
        message: 'Provide hour_target_start_date and hour_target_end_date.'
      });
    }

    const startVal = String(hour_target_start_date);
    const endVal = String(hour_target_end_date);
    const startDate = new Date(`${startVal}T00:00:00Z`);
    const endDate = new Date(`${endVal}T00:00:00Z`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'hour_target_start_date and hour_target_end_date must be valid dates (YYYY-MM-DD).'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'hour_target_start_date must be before or equal to hour_target_end_date.'
      });
    }

    // Ensure target belongs to the user
    const [existingRows] = await db.promise.execute(
      'SELECT id FROM user_hour_targets WHERE id = ? AND user_id = ?',
      [targetId, userId]
    );
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Target not found' });
    }

    // Keep existing target_type (enum not-null). We only update the numeric/date range.
    await db.promise.execute(
      'UPDATE user_hour_targets SET target_hours = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?',
      [hoursNum, startVal, endVal, targetId, userId]
    );

    // Sync active target in `users` table
    await db.promise.execute(
      'UPDATE users SET hour_target_type = ?, hour_target_hours = ?, hour_target_start_date = ?, hour_target_end_date = ? WHERE id = ?',
      [null, hoursNum, startVal, endVal, userId]
    );

    res.json({ success: true, message: 'Hour target updated' });
  } catch (error) {
    console.error('Edit hour target error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/users/me/hour-targets/:id
// @desc    Delete a history target row and clear active target if it matches
// @access  Private
router.delete('/me/hour-targets/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = parseInt(req.params.id, 10);

    if (!targetId || Number.isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid target id' });
    }

    const [existingRows] = await db.promise.execute(
      'SELECT target_hours, start_date, end_date FROM user_hour_targets WHERE id = ? AND user_id = ?',
      [targetId, userId]
    );
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Target not found' });
    }

    const row = existingRows[0];
    const deletedHours = row.target_hours != null ? parseInt(row.target_hours, 10) : null;
    const deletedStart = row.start_date ? String(row.start_date) : null;
    const deletedEnd = row.end_date ? String(row.end_date) : null;

    await db.promise.execute(
      'DELETE FROM user_hour_targets WHERE id = ? AND user_id = ?',
      [targetId, userId]
    );

    const [activeRows] = await db.promise.execute(
      'SELECT hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
      [userId]
    );

    if (activeRows && activeRows.length > 0) {
      const active = activeRows[0];
      const activeHours = active.hour_target_hours != null ? parseInt(active.hour_target_hours, 10) : null;
      const activeStart = active.hour_target_start_date ? String(active.hour_target_start_date) : null;
      const activeEnd = active.hour_target_end_date ? String(active.hour_target_end_date) : null;

      const matchesActive =
        deletedHours != null &&
        activeHours != null &&
        String(activeStart ?? '') === String(deletedStart ?? '') &&
        String(activeEnd ?? '') === String(deletedEnd ?? '');

      if (matchesActive) {
        await db.promise.execute(
          'UPDATE users SET hour_target_type = ?, hour_target_hours = ?, hour_target_start_date = ?, hour_target_end_date = ? WHERE id = ?',
          [null, null, null, null, userId]
        );
      }
    }

    res.json({ success: true, message: 'Target deleted' });
  } catch (error) {
    console.error('Delete hour target row error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users
// @desc    Get all users (Permission based)
// @access  Private (Requires user_management permission)
router.get('/', authenticate, checkPermission('user_management'), async (req, res) => {
  try {
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Users can only view their own profile unless they're admin
    if (req.user.id !== userId && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', authenticate, async (req, res) => {
  try {
    const {
      name,
      phone,
      hour_target_type,
      hour_target_hours,
      hour_target_start_date,
      hour_target_end_date
    } = req.body;
    const userId = req.user.id;
    
    // Capture previous target so we can log changes
    let prevTarget = null;
    if (
      hour_target_type !== undefined ||
      hour_target_hours !== undefined ||
      hour_target_start_date !== undefined ||
      hour_target_end_date !== undefined
    ) {
      const [prevRows] = await db.promise.execute(
        'SELECT hour_target_type, hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
        [userId]
      );
      if (prevRows.length > 0) prevTarget = prevRows[0];
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    
    if (hour_target_type !== undefined) {
      if (hour_target_type !== null && hour_target_type !== 'weekly' && hour_target_type !== 'monthly') {
        return res.status(400).json({
          success: false,
          message: 'hour_target_type must be "weekly", "monthly", or null'
        });
      }
      updates.push('hour_target_type = ?');
      values.push(hour_target_type);
    }
    
    if (hour_target_hours !== undefined) {
      const num = hour_target_hours === null || hour_target_hours === '' ? null : parseInt(hour_target_hours, 10);
      if (num !== null && (isNaN(num) || num < 0)) {
        return res.status(400).json({
          success: false,
          message: 'hour_target_hours must be a non-negative number or null'
        });
      }
      updates.push('hour_target_hours = ?');
      values.push(num);
    }

    // Date-range target (preferred). When start/end are provided, we clear legacy type.
    if (hour_target_start_date !== undefined || hour_target_end_date !== undefined) {
      const startValRaw = hour_target_start_date === '' ? null : hour_target_start_date;
      const endValRaw = hour_target_end_date === '' ? null : hour_target_end_date;

      // Allow clearing the target by passing both null/empty.
      const startVal = startValRaw === undefined ? null : startValRaw;
      const endVal = endValRaw === undefined ? null : endValRaw;

      const startProvided = hour_target_start_date !== undefined;
      const endProvided = hour_target_end_date !== undefined;

      if (startProvided !== endProvided) {
        return res.status(400).json({
          success: false,
          message: 'Provide both hour_target_start_date and hour_target_end_date together (or both null).'
        });
      }

      if (startVal && endVal) {
        const startDate = new Date(`${String(startVal)}T00:00:00Z`);
        const endDate = new Date(`${String(endVal)}T00:00:00Z`);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'hour_target_start_date and hour_target_end_date must be valid dates (YYYY-MM-DD).'
          });
        }
        if (startDate > endDate) {
          return res.status(400).json({
            success: false,
            message: 'hour_target_start_date must be before or equal to hour_target_end_date.'
          });
        }
        updates.push('hour_target_start_date = ?');
        values.push(String(startVal));
        updates.push('hour_target_end_date = ?');
        values.push(String(endVal));
        updates.push('hour_target_type = ?');
        values.push(null);
      } else {
        // Clear date range (set both to null)
        updates.push('hour_target_start_date = ?');
        values.push(null);
        updates.push('hour_target_end_date = ?');
        values.push(null);
        updates.push('hour_target_type = ?');
        values.push(null);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    values.push(userId);
    
    await db.promise.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // If target is set (not cleared) and it changed, log to history table
    if (
      hour_target_type !== undefined ||
      hour_target_hours !== undefined ||
      hour_target_start_date !== undefined ||
      hour_target_end_date !== undefined
    ) {
      const [currRows] = await db.promise.execute(
        'SELECT hour_target_type, hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
        [userId]
      );
      const curr = currRows[0] || {};
      const currType = curr.hour_target_type;
      const currHours = curr.hour_target_hours;
      const currStart = curr.hour_target_start_date;
      const currEnd = curr.hour_target_end_date;
      const prevType = prevTarget?.hour_target_type;
      const prevHours = prevTarget?.hour_target_hours;
      const prevStart = prevTarget?.hour_target_start_date;
      const prevEnd = prevTarget?.hour_target_end_date;

      const changed =
        (currType !== prevType) ||
        (Number(currHours ?? null) !== Number(prevHours ?? null)) ||
        (String(currStart ?? '') !== String(prevStart ?? '')) ||
        (String(currEnd ?? '') !== String(prevEnd ?? ''));

      if (changed && currHours != null && (currType || currStart)) {
        await db.promise.execute(
          'INSERT INTO user_hour_targets (user_id, target_type, target_hours, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
          [userId, currType || 'weekly', parseInt(currHours, 10), currStart, currEnd]
        );
      }
    }
    
    // Get updated user
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, profile_image, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at, hour_target_type, hour_target_hours, hour_target_start_date, hour_target_end_date FROM users WHERE id = ?',
      [userId]
    );
    
    const userData = users[0];
    // Add image field for compatibility with frontend
    if (userData.profile_image) {
      userData.image = userData.profile_image;
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/me/upload-image
// @desc    Upload profile image
// @access  Private
router.post('/me/upload-image', authenticate, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image file is too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file type. Only image files are allowed.'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const userId = req.user.id;
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user profile_image in database
    await db.promise.execute(
      'UPDATE users SET profile_image = ? WHERE id = ?',
      [imageUrl, userId]
    );

    // Get updated user
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, profile_image, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at, hour_target_type, hour_target_hours FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        ...users[0],
        image: imageUrl,
        profile_image: imageUrl
      }
    });
  } catch (error) {
    // Delete uploaded file if database update fails
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change password with current password confirmation
// @access  Private (requires authentication)
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both current password and new password' 
      });
    }
    
    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }
    
    // Get user ID from authenticated user
    const userId = req.user.id;
    
    // Get user's current password hash from database
    const [users] = await db.promise.execute(
      'SELECT id, password FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = users[0];
    
    // Verify current password exists
    if (!user.password) {
      return res.status(500).json({ 
        success: false, 
        message: 'User password not set. Contact admin.' 
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be different from current password' 
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    await db.promise.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, userId]
    );
    
    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private (Admin)
router.put('/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const roleId = parseInt(req.body.role);
    
    // Validate role ID
    if (req.body.role === undefined || isNaN(roleId) || roleId < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid role ID is required'
      });
    }
    
    // Check if role exists in roles table
    const [roles] = await db.promise.execute(
      'SELECT id, name, is_active, is_system_role FROM roles WHERE id = ?',
      [roleId]
    );
    
    if (roles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Role does not exist in the database'
      });
    }
    
    const role = roles[0];
    
    // Check if role is active
    if (!role.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign inactive role. Please activate the role first.'
      });
    }
    
    // Prevent admin from removing their own admin role (check if role ID is 0 or role name is "Admin")
    const isAdminRole = roleId === 0 || role.name.toLowerCase() === 'admin';
    if (req.user.id === userId && !isAdminRole) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin role'
      });
    }
    
    // Update user role
    await db.promise.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [roleId, userId]
    );
    
    // Get updated user
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: users[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Toggle user active/inactive status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_active } = req.body;
    
    // Validate is_active
    if (is_active === undefined || typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value'
      });
    }
    
    // Prevent admin from deactivating themselves
    if (req.user.id === userId && !is_active) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    // Update user status
    await db.promise.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, userId]
    );
    
    // Get updated user
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user details (Admin only)
// @access  Private (Admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, phone } = req.body;
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (name !== undefined && name.trim() !== '') {
      updates.push('name = ?');
      values.push(name.trim());
    }
    
    if (email !== undefined && email.trim() !== '') {
      // Check if email already exists (excluding current user)
      const [existingUsers] = await db.promise.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      
      updates.push('email = ?');
      values.push(email.trim());
    }
    
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone ? phone.trim() : null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    values.push(userId);
    
    await db.promise.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Get updated user
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Validate user ID
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    // Check if user exists
    const [users] = await db.promise.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userToDelete = users[0];
    console.log(`Attempting to delete user: ID=${userId}, Name=${userToDelete.name}, Email=${userToDelete.email}`);
    
    // Delete user
    const [result] = await db.promise.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    
    console.log(`Delete result - affectedRows: ${result.affectedRows}`);
    
    // Check if deletion was successful
    if (result.affectedRows === 0) {
      console.error(`Delete failed: No rows affected for user ID ${userId}`);
      return res.status(500).json({
        success: false,
        message: 'User could not be deleted. No rows were affected.'
      });
    }
    
    // Verify deletion by checking if user still exists
    const [verifyUsers] = await db.promise.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (verifyUsers.length > 0) {
      console.error(`Delete verification failed: User still exists after deletion attempt`);
      return res.status(500).json({
        success: false,
        message: 'Delete operation completed but user still exists in database'
      });
    }
    
    console.log(`User ${userId} successfully deleted`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedId: userId,
      deletedUser: {
        id: userToDelete.id,
        name: userToDelete.name,
        email: userToDelete.email
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Log registered routes for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log('User routes registered:', {
    'PUT /api/users/:id/role': 'Active',
    'PUT /api/users/:id/status': 'Active',
    'PUT /api/users/:id': 'Active',
    'DELETE /api/users/:id': 'Active'
  });
}

module.exports = router;
module.exports.hourTargetProgressHandler = hourTargetProgressHandler;

