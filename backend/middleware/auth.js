const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production'
    );
    
    // Get user from database (include role)
    const [users] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, CAST(COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS UNSIGNED) AS role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Ensure role is a number (handle BigInt, string, or null from MySQL)
    if (user.role === null || user.role === undefined) {
      // If role is null, derive from user_type
      user.role = user.user_type === 'admin' ? 0 : 1;
    } else if (typeof user.role === 'bigint') {
      user.role = Number(user.role);
    } else if (typeof user.role === 'string') {
      user.role = parseInt(user.role, 10);
    } else {
      user.role = Number(user.role);
    }
    
    // Final fallback: if role is still not a number, check user_type
    if (isNaN(user.role)) {
      user.role = user.user_type === 'admin' ? 0 : 1;
    }
    
    // CRITICAL: Always use the role from database, not from token
    // This ensures if role changes in DB, it's immediately reflected
    // The token role is only used for initial lookup
    
    // Debug logging
    console.log('Auth middleware - User authenticated:', {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      role_from_db: user.role,
      role_type: typeof user.role,
      token_role: decoded.role,
      note: 'Using role from database, not token'
    });
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Middleware to check user type or role
const authorize = (...userTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Ensure role is a number (handle all possible types from MySQL)
    let userRole = req.user.role;
    if (typeof userRole === 'bigint') {
      userRole = Number(userRole);
    } else if (typeof userRole === 'string') {
      userRole = parseInt(userRole, 10);
    } else {
      userRole = Number(userRole);
    }
    
    // Handle NaN case
    if (isNaN(userRole)) {
      userRole = req.user.user_type === 'admin' ? 0 : 1;
    }
    
    const userType = req.user.user_type;
    
    // Debug logging
    console.log('Authorize middleware - Checking access:', {
      requestedTypes: userTypes,
      user_type: userType,
      role_raw: req.user.role,
      role_converted: userRole,
      role_type: typeof userRole,
      isAdminByType: userType === 'admin',
      isAdminByRole: userRole === 0,
      strictComparison: userRole === 0,
      looseComparison: userRole == 0
    });
    
    // Check both user_type and role for admin access
    // Admin can be identified by: user_type === 'admin' OR role === 0
    // Use strict equality (===) for role comparison
    const isAdmin = userType === 'admin' || userRole === 0;
    
    // If checking for admin, allow if either condition is true
    if (userTypes.includes('admin')) {
      if (isAdmin) {
        console.log('Admin access granted');
        return next();
      } else {
        console.log('Admin access denied');
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
    }
    
    // Otherwise check user_type as before
    if (!userTypes.includes(userType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    
    next();
  };
};

// Middleware to check if user has permission for a specific feature
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
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
      
      // Admin (role 0) always has access to manage permissions
      const isAdmin = req.user.user_type === 'admin' || userRole === 0;
      if (isAdmin) {
        return next();
      }
      
      // Check permission in database
      try {
        // First check if role_permission_mappings table exists (new system)
        const [mappingTables] = await db.promise.execute(
          "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permission_mappings'"
        );
        
        if (mappingTables.length > 0) {
          // Use new role_permission_mappings system
          const [mappings] = await db.promise.execute(
            'SELECT has_access FROM role_permission_mappings WHERE role_id = ? AND permission_key = ?',
            [userRole, permissionKey]
          );
          
          if (mappings.length > 0) {
            const hasAccess = mappings[0].has_access === true || mappings[0].has_access === 1;
            if (hasAccess) {
              return next();
            } else {
              return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to access this resource.'
              });
            }
          } else {
            // Permission mapping not found - check if permission exists
            const [permissions] = await db.promise.execute(
              'SELECT * FROM role_permissions WHERE permission_key = ?',
              [permissionKey]
            );
            
            if (permissions.length === 0) {
              // Permission doesn't exist - allow admin as fallback
              if (isAdmin) {
                console.log(`Permission '${permissionKey}' not found, but user is admin - allowing access`);
                return next();
              }
              return res.status(403).json({
                success: false,
                message: 'Permission not found. Please contact administrator.'
              });
            }
            
            // Permission exists but no mapping - deny access (unless admin)
            if (isAdmin) {
              console.log(`No permission mapping found for role ${userRole}, but user is admin - allowing access`);
              return next();
            }
            return res.status(403).json({
              success: false,
              message: 'Access denied. You do not have permission to access this resource.'
            });
          }
        } else {
          // Fallback to old system (role_permissions table with role_0_access, role_1_access)
          const [permissions] = await db.promise.execute(
            'SELECT * FROM role_permissions WHERE permission_key = ?',
            [permissionKey]
          );
          
          if (permissions.length === 0) {
            // If permission not found and user is admin, allow access (graceful degradation)
            if (isAdmin) {
              console.log(`Permission '${permissionKey}' not found in database, but user is admin - allowing access`);
              return next();
            }
            return res.status(403).json({
              success: false,
              message: 'Permission not found. Please contact administrator.'
            });
          }
          
          const permission = permissions[0];
          const roleAccessField = `role_${userRole}_access`;
          const hasAccess = permission[roleAccessField] === true || permission[roleAccessField] === 1;
          
          if (!hasAccess) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. You do not have permission to access this resource.'
            });
          }
          
          next();
        }
      } catch (dbError) {
        // Handle case where table doesn't exist yet
        if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes("doesn't exist")) {
          console.log(`Permission table not found. Admin access allowed as fallback.`);
          // If admin and table doesn't exist, allow access (graceful degradation)
          if (isAdmin) {
            return next();
          }
          return res.status(500).json({
            success: false,
            message: 'Permissions system not initialized. Please run database migration: npx knex migrate:latest'
          });
        }
        throw dbError; // Re-throw other database errors
      }
    } catch (error) {
      console.error('Permission check error:', error);
      // If it's a database error we haven't handled, and user is admin, allow access
      if (req.user && (req.user.user_type === 'admin' || req.user.role === 0)) {
        console.log('Database error during permission check, but user is admin - allowing access');
        return next();
      }
      res.status(500).json({
        success: false,
        message: 'Server error during permission check'
      });
    }
  };
};

module.exports = { authenticate, authorize, checkPermission };

