const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/roles
// @desc    Get all roles (Admin only)
// @access  Private (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Check if roles table exists
    const [tableCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles'"
    );
    
    if (tableCheck.length === 0) {
      return res.status(500).json({ 
        success: false, 
        message: 'Roles table not found. Please run database migration: npx knex migrate:latest' 
      });
    }
    
    const [roles] = await db.promise.execute(
      `SELECT * FROM roles 
       ORDER BY 
         CASE 
           WHEN id = 0 THEN 1 
           WHEN id = 1 THEN 2 
           WHEN is_system_role = TRUE THEN 3 
           ELSE 4 
         END,
         name ASC`
    );
    
    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        try {
          // Check if role_permission_mappings table exists
          const [mappingTableCheck] = await db.promise.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permission_mappings'"
          );
          
          if (mappingTableCheck.length > 0) {
            const [permissions] = await db.promise.execute(
              `SELECT rpm.permission_key, rpm.has_access, rp.permission_name, rp.description
               FROM role_permission_mappings rpm
               LEFT JOIN role_permissions rp ON rpm.permission_key = rp.permission_key
               WHERE rpm.role_id = ?`,
              [role.id]
            );
            
            return {
              ...role,
              permissions: permissions
            };
          } else {
            // Fallback: return role without permissions if mapping table doesn't exist
            return {
              ...role,
              permissions: []
            };
          }
        } catch (permError) {
          // If error getting permissions, return role without permissions
          return {
            ...role,
            permissions: []
          };
        }
      })
    );
    
    res.json({
      success: true,
      count: rolesWithPermissions.length,
      data: rolesWithPermissions
    });
  } catch (error) {
    console.error('Error in GET /api/roles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/roles/:id
// @desc    Get role by ID (Admin only)
// @access  Private (Admin)
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    
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
    
    const role = roles[0];
    
    // Get permissions for this role
    const [permissions] = await db.promise.execute(
      `SELECT rpm.permission_key, rpm.has_access, rp.permission_name, rp.description
       FROM role_permission_mappings rpm
       LEFT JOIN role_permissions rp ON rpm.permission_key = rp.permission_key
       WHERE rpm.role_id = ?`,
      [roleId]
    );
    
    res.json({
      success: true,
      data: {
        ...role,
        permissions: permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/roles
// @desc    Create a new role (Admin only)
// @access  Private (Admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }
    
    // Check if role name already exists
    const [existing] = await db.promise.execute(
      'SELECT id FROM roles WHERE name = ?',
      [name.trim()]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }
    
    // Create role
    const [result] = await db.promise.execute(
      'INSERT INTO roles (name, description, is_system_role, is_active) VALUES (?, ?, FALSE, TRUE)',
      [name.trim(), description || null]
    );
    
    const roleId = result.insertId;
    
    // Add permissions if provided
    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        if (perm.permission_key && perm.has_access !== undefined) {
          try {
            await db.promise.execute(
              'INSERT INTO role_permission_mappings (role_id, permission_key, has_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE has_access = ?',
              [roleId, perm.permission_key, perm.has_access ? 1 : 0, perm.has_access ? 1 : 0]
            );
          } catch (insertError) {
            console.error('Error inserting permission mapping:', insertError);
            throw insertError;
          }
        }
      }
    }
    
    // Get created role with permissions
    const [newRole] = await db.promise.execute(
      'SELECT * FROM roles WHERE id = ?',
      [roleId]
    );
    
    const [rolePermissions] = await db.promise.execute(
      `SELECT rpm.permission_key, rpm.has_access, rp.permission_name, rp.description
       FROM role_permission_mappings rpm
       LEFT JOIN role_permissions rp ON rpm.permission_key = rp.permission_key
       WHERE rpm.role_id = ?`,
      [roleId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        ...newRole[0],
        permissions: rolePermissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/roles/:id
// @desc    Update a role (Admin only)
// @access  Private (Admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { name, description, is_active, permissions } = req.body;
    
    // Check if role exists
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
    
    const role = roles[0];
    
    // Admin role (id: 0) cannot be renamed or deactivated, but can edit description and permissions
    // Only check if name is actually being changed (different from current name)
    if (roleId === 0) {
      if (name !== undefined && name.trim() !== role.name) {
        return res.status(400).json({
          success: false,
          message: 'Admin role cannot be renamed, but you can edit its description and permissions'
        });
      }
      if (is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Admin role cannot be deactivated, but you can edit its description and permissions'
        });
      }
    }
    
    // Volunteer role (id: 1) cannot be renamed or deactivated, but can edit description and permissions
    // Only check if name is actually being changed (different from current name)
    if (roleId === 1) {
      if (name !== undefined && name.trim() !== role.name) {
        return res.status(400).json({
          success: false,
          message: 'Volunteer role cannot be renamed, but you can edit its description and permissions'
        });
      }
      if (is_active === false) {
        return res.status(400).json({
          success: false,
          message: 'Volunteer role cannot be deactivated, but you can edit its description and permissions'
        });
      }
    }
    
    // Build update query
    const updates = [];
    const values = [];
    
    // Only allow name change for custom roles (not Admin id:0 or Volunteer id:1)
    if (name !== undefined && name.trim() !== '' && roleId !== 0 && roleId !== 1) {
      // Check if new name conflicts with existing role
      const [existing] = await db.promise.execute(
        'SELECT id FROM roles WHERE name = ? AND id != ?',
        [name.trim(), roleId]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        });
      }
      
      updates.push('name = ?');
      values.push(name.trim());
    }
    
    // Allow description update for all roles (including Volunteer id:1)
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    // Only allow is_active change for custom roles (not Admin id:0 or Volunteer id:1)
    if (is_active !== undefined && roleId !== 0 && roleId !== 1) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    
    if (updates.length > 0) {
      values.push(roleId);
      await db.promise.execute(
        `UPDATE roles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    }
    
    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      console.log(`[ROLE UPDATE] Updating permissions for role_id=${roleId}, received ${permissions.length} permissions`);
      
      // Delete existing permissions for this role
      await db.promise.execute(
        'DELETE FROM role_permission_mappings WHERE role_id = ?',
        [roleId]
      );
      console.log(`[ROLE UPDATE] Deleted existing permissions for role_id=${roleId}`);
      
      // Insert new permissions (save all permissions, including denied ones)
      let savedCount = 0;
      let skippedCount = 0;
      for (const perm of permissions) {
        if (perm.permission_key && perm.has_access !== undefined) {
          // Ensure has_access is converted to boolean/int properly
          const hasAccess = perm.has_access === true || perm.has_access === 1 || perm.has_access === '1' || perm.has_access === 'true';
          try {
            await db.promise.execute(
              'INSERT INTO role_permission_mappings (role_id, permission_key, has_access) VALUES (?, ?, ?)',
              [roleId, perm.permission_key, hasAccess ? 1 : 0]
            );
            savedCount++;
            console.log(`[ROLE UPDATE] Saved permission: role_id=${roleId}, permission=${perm.permission_key}, has_access=${hasAccess ? 1 : 0}`);
          } catch (insertError) {
            // If duplicate key error, update instead
            if (insertError.code === 'ER_DUP_ENTRY' || insertError.message.includes('Duplicate entry')) {
              await db.promise.execute(
                'UPDATE role_permission_mappings SET has_access = ? WHERE role_id = ? AND permission_key = ?',
                [hasAccess ? 1 : 0, roleId, perm.permission_key]
              );
              savedCount++;
              console.log(`[ROLE UPDATE] Updated permission: role_id=${roleId}, permission=${perm.permission_key}, has_access=${hasAccess ? 1 : 0}`);
            } else {
              console.error(`[ROLE UPDATE] Error saving permission ${perm.permission_key}:`, insertError);
              throw insertError;
            }
          }
        } else {
          skippedCount++;
          console.warn(`[ROLE UPDATE] Skipped invalid permission:`, perm);
        }
      }
      
      console.log(`[ROLE UPDATE] Permission save complete: role_id=${roleId}, saved=${savedCount}, skipped=${skippedCount}, total=${permissions.length}`);
      
      // Verify permissions were saved correctly
      const [verifyMappings] = await db.promise.execute(
        'SELECT COUNT(*) as count FROM role_permission_mappings WHERE role_id = ?',
        [roleId]
      );
      console.log(`[ROLE UPDATE] Verification: role_id=${roleId} has ${verifyMappings[0].count} permission mappings in database`);
    }
    
    // Get updated role with permissions
    const [updatedRole] = await db.promise.execute(
      'SELECT * FROM roles WHERE id = ?',
      [roleId]
    );
    
    const [rolePermissions] = await db.promise.execute(
      `SELECT rpm.permission_key, rpm.has_access, rp.permission_name, rp.description
       FROM role_permission_mappings rpm
       LEFT JOIN role_permissions rp ON rpm.permission_key = rp.permission_key
       WHERE rpm.role_id = ?`,
      [roleId]
    );
    
    res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        ...updatedRole[0],
        permissions: rolePermissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/roles/:id
// @desc    Delete a role (Admin only)
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    
    // Check if role exists
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
    
    const role = roles[0];
    
    // Admin role (id: 0) cannot be deleted
    if (roleId === 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin role cannot be deleted'
      });
    }
    
    // Volunteer role (id: 1) cannot be deleted
    if (roleId === 1) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer role cannot be deleted'
      });
    }
    
    // Check if any users have this role
    const [users] = await db.promise.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      [roleId]
    );
    
    if (users[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${users[0].count} user(s) are assigned to this role. Please reassign them first.`
      });
    }
    
    // Delete role permissions
    await db.promise.execute(
      'DELETE FROM role_permission_mappings WHERE role_id = ?',
      [roleId]
    );
    
    // Delete role
    await db.promise.execute(
      'DELETE FROM roles WHERE id = ?',
      [roleId]
    );
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/roles/:id/permissions
// @desc    Get all available permissions for role assignment
// @access  Private (Admin)
router.get('/:id/permissions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    
    // Get all available permissions
    const [allPermissions] = await db.promise.execute(
      'SELECT * FROM role_permissions ORDER BY permission_name ASC'
    );
    
    // Get current role permissions
    const [rolePermissions] = await db.promise.execute(
      'SELECT permission_key, has_access FROM role_permission_mappings WHERE role_id = ?',
      [roleId]
    );
    
    // Map permissions with access status
    const permissionsWithAccess = allPermissions.map(perm => {
      const rolePerm = rolePermissions.find(rp => rp.permission_key === perm.permission_key);
      return {
        ...perm,
        has_access: rolePerm ? rolePerm.has_access : false
      };
    });
    
    res.json({
      success: true,
      data: permissionsWithAccess
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

