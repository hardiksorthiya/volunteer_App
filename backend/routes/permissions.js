const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Test endpoint to verify route is working (remove in production)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Permissions route is working!',
    timestamp: new Date().toISOString()
  });
});

// @route   GET /api/permissions/debug/role/:roleId
// @desc    Debug endpoint to check all permissions for a role (Admin only)
// @access  Private (Admin)
router.get('/debug/role/:roleId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.roleId);
    
    // Get role info
    const [roles] = await db.promise.execute(
      'SELECT * FROM roles WHERE id = ?',
      [roleId]
    );
    
    if (roles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    // Get all permissions
    const [allPermissions] = await db.promise.execute(
      'SELECT * FROM role_permissions ORDER BY permission_key'
    );
    
    // Get all mappings for this role
    const [mappings] = await db.promise.execute(
      'SELECT permission_key, has_access FROM role_permission_mappings WHERE role_id = ?',
      [roleId]
    );
    
    // Create a map of permission_key -> has_access
    const mappingMap = {};
    mappings.forEach(m => {
      mappingMap[m.permission_key] = m.has_access === 1 || m.has_access === true || m.has_access === '1';
    });
    
    // Combine permissions with their access status
    const permissionsWithAccess = allPermissions.map(perm => ({
      permission_key: perm.permission_key,
      permission_name: perm.permission_name,
      description: perm.description,
      has_mapping: perm.permission_key in mappingMap,
      has_access: mappingMap[perm.permission_key] || false
    }));
    
    res.json({
      success: true,
      role: roles[0],
      total_permissions: allPermissions.length,
      total_mappings: mappings.length,
      permissions: permissionsWithAccess
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/permissions
// @desc    Get all permissions (Admin only)
// @access  Private (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [permissions] = await db.promise.execute(
      'SELECT * FROM role_permissions ORDER BY permission_name ASC'
    );
    
    res.json({
      success: true,
      count: permissions.length,
      data: permissions
    });
  } catch (error) {
    // Handle case where table doesn't exist yet
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.status(500).json({ 
        success: false, 
        message: 'Permissions table not found. Please run database migration: npx knex migrate:latest' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/permissions/:key
// @desc    Delete a permission (Admin only) - Fixed permissions cannot be deleted
// @access  Private (Admin)
router.delete('/:key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    
    // Don't treat "check" as a permission key
    if (key === 'check') {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    // Check if permission exists and if it's fixed
    const [permissions] = await db.promise.execute(
      'SELECT * FROM role_permissions WHERE permission_key = ?',
      [key]
    );
    
    if (permissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }
    
    const permission = permissions[0];
    
    // Prevent deletion of fixed permissions
    if (permission.is_fixed === true || permission.is_fixed === 1) {
      return res.status(400).json({
        success: false,
        message: 'Fixed permissions cannot be deleted. They are managed by the system.'
      });
    }
    
    // Delete permission mappings first
    await db.promise.execute(
      'DELETE FROM role_permission_mappings WHERE permission_key = ?',
      [key]
    );
    
    // Delete permission
    await db.promise.execute(
      'DELETE FROM role_permissions WHERE permission_key = ?',
      [key]
    );
    
    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    // Handle case where table doesn't exist yet
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.status(500).json({ 
        success: false, 
        message: 'Permissions table not found. Please run database migration: npx knex migrate:latest' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Note: POST endpoint for creating permissions is intentionally not provided
// Permissions can only be created through database migrations/seeds from backend

// @route   GET /api/permissions/check/:key
// @desc    Check if current user has access to a permission
// @access  Private
// NOTE: This route must come BEFORE /:key to avoid route conflicts
router.get('/check/:key', authenticate, async (req, res) => {
  try {
    const { key } = req.params;
    
    // Get user role
    let userRole = req.user.role;
    if (typeof userRole === 'bigint') {
      userRole = Number(userRole);
    } else if (typeof userRole === 'string') {
      userRole = parseInt(userRole, 10);
    } else {
      userRole = Number(userRole);
    }
    
    if (isNaN(userRole)) {
      userRole = req.user.user_type === 'admin' ? 0 : 1;
    }
    
    // Ensure userRole is an integer
    const roleId = parseInt(userRole, 10);
    
    // Verify user's role from database to ensure it matches
    const [userCheck] = await db.promise.execute(
      'SELECT role, user_type FROM users WHERE id = ?',
      [req.user.id]
    );
    
    let actualRoleId = roleId;
    if (userCheck.length > 0) {
      const dbRole = userCheck[0].role;
      if (dbRole !== null && dbRole !== undefined) {
        actualRoleId = typeof dbRole === 'bigint' ? Number(dbRole) : parseInt(dbRole, 10);
      } else {
        // If role is null, derive from user_type
        actualRoleId = userCheck[0].user_type === 'admin' ? 0 : 1;
      }
    }
    
    console.log(`[PERMISSION CHECK] user_id=${req.user.id}, user_type=${req.user.user_type}, role_from_req=${userRole} (parsed: ${roleId}), role_from_db=${actualRoleId}, permission=${key}`);
    
    // Use the actual role from database
    const finalRoleId = actualRoleId;
    
    // Check if permission exists
    const [permissions] = await db.promise.execute(
      'SELECT * FROM role_permissions WHERE permission_key = ?',
      [key]
    );
    
    if (permissions.length === 0) {
      console.log(`[PERMISSION CHECK] Permission ${key} not found in role_permissions table`);
      return res.json({
        success: true,
        hasAccess: false,
        message: 'Permission not found'
      });
    }
    
    const permission = permissions[0];
    
    // Check role_permission_mappings table to see if this role has access
    let hasAccess = false;
    try {
      // Query the role_permission_mappings table using the actual role from database
      const [mappings] = await db.promise.execute(
        'SELECT has_access FROM role_permission_mappings WHERE role_id = ? AND permission_key = ?',
        [finalRoleId, key]
      );
      
      console.log(`[PERMISSION CHECK] Query: role_id=${finalRoleId}, permission_key=${key}, found ${mappings.length} mapping(s)`);
      
      // Debug: Also check what mappings exist for this role
      const [allRoleMappings] = await db.promise.execute(
        'SELECT permission_key, has_access FROM role_permission_mappings WHERE role_id = ?',
        [finalRoleId]
      );
      console.log(`[PERMISSION CHECK] All mappings for role_id=${finalRoleId}:`, allRoleMappings.map(m => `${m.permission_key}=${m.has_access}`).join(', '));
      
      if (mappings.length > 0) {
        // Check if has_access is true (could be 1, true, or '1')
        const accessValue = mappings[0].has_access;
        // MySQL returns TINYINT(1) as 0 or 1, so check for both
        hasAccess = accessValue === true || accessValue === 1 || accessValue === '1' || Number(accessValue) === 1;
        console.log(`[PERMISSION CHECK] Result: role_id=${finalRoleId}, permission=${key}, has_access=${accessValue} (type: ${typeof accessValue}, raw: ${JSON.stringify(accessValue)}), result=${hasAccess}`);
      } else {
        // If no mapping exists, user doesn't have access
        hasAccess = false;
        console.log(`[PERMISSION CHECK] No mapping found: role_id=${finalRoleId}, permission=${key}, result=false`);
        console.log(`[PERMISSION CHECK] Available permissions for this role:`, allRoleMappings.map(m => m.permission_key).join(', ') || 'NONE');
      }
    } catch (mappingError) {
      // If role_permission_mappings table doesn't exist, user doesn't have access
      if (mappingError.code === 'ER_NO_SUCH_TABLE' || mappingError.message.includes("doesn't exist")) {
        hasAccess = false;
        console.log(`[PERMISSION CHECK] role_permission_mappings table missing, result=false`);
      } else {
        console.error('[PERMISSION CHECK] Error checking permission mapping:', mappingError);
        throw mappingError;
      }
    }
    
    res.json({
      success: true,
      hasAccess: hasAccess,
      permission: permission,
      debug: {
        user_id: req.user.id,
        role_id: finalRoleId,
        permission_key: key
      }
    });
  } catch (error) {
    // Handle case where table doesn't exist yet
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.json({
        success: true,
        hasAccess: false,
        message: 'Permissions table not found. Please run database migration.'
      });
    }
    console.error('[PERMISSION CHECK] Unexpected error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/permissions/:key
// @desc    Get permission by key
// @access  Private (Admin)
router.get('/:key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    
    // Don't treat "check" as a permission key
    if (key === 'check') {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    const [permissions] = await db.promise.execute(
      'SELECT * FROM role_permissions WHERE permission_key = ?',
      [key]
    );
    
    if (permissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }
    
    res.json({
      success: true,
      data: permissions[0]
    });
  } catch (error) {
    // Handle case where table doesn't exist yet
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.status(500).json({ 
        success: false, 
        message: 'Permissions table not found. Please run database migration: npx knex migrate:latest' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/permissions/:key
// @desc    Update permission (Admin only) - Note: Permission access is now managed through roles
// @access  Private (Admin)
// NOTE: This endpoint is deprecated. Permission access should be managed through role management.
// Permissions can only be updated (name, description), not role access.
router.put('/:key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { permission_name, description } = req.body;
    
    // Check if permission exists
    const [permissions] = await db.promise.execute(
      'SELECT * FROM role_permissions WHERE permission_key = ?',
      [key]
    );
    
    if (permissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (permission_name !== undefined && permission_name.trim() !== '') {
      updates.push('permission_name = ?');
      values.push(permission_name.trim());
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update. Permission access is managed through roles.'
      });
    }
    
    values.push(key);
    
    await db.promise.execute(
      `UPDATE role_permissions SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE permission_key = ?`,
      values
    );
    
    // Get updated permission
    const [updatedPermissions] = await db.promise.execute(
      'SELECT * FROM role_permissions WHERE permission_key = ?',
      [key]
    );
    
    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedPermissions[0]
    });
  } catch (error) {
    // Handle case where table doesn't exist yet
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes("doesn't exist")) {
      return res.status(500).json({ 
        success: false, 
        message: 'Permissions table not found. Please run database migration: npx knex migrate:latest' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

