const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { sendPasswordResetEmail } = require('../config/email');

// --- added: token authentication helper (usable by new endpoints) ---
function authenticateToken(req, res, next) {
	// try query, Authorization header "Bearer <token>", then body
	// support case-insensitive header key and tolerant formats
	const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
	const bearer = authHeader && authHeader.split ? authHeader.split(' ')[1] : null;
	const token = req.query.token || bearer || (req.body && req.body.token);
	if (!token) {
		return res.status(401).json({ success: false, message: 'Token missing' });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ success: false, message: 'Invalid token' });
	}
}
// --- end added helper ---

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    // Accept params from query for frontend convenience, but fall back to body
    const name = req.query.name || req.body.name;
    const email = req.query.email || req.body.email;
    const mobile = req.query.mobile || req.body.mobile || req.query.phone || req.body.phone; // Accept both mobile and phone
    const password = req.query.password || req.body.password;
    const confirmPassword = req.query.confirmPassword || req.body.confirmPassword;
    
    // Validation
    if (!name || !email || !mobile || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: name, email, mobile, password, confirmPassword' 
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    // Check if user already exists
    const [existingUsers] = await db.promise.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert user into database (store mobile into phone column) and set role default 1 (volunteer)
    let insertId;
    try {
      const [result] = await db.promise.execute(
        // store numeric role: 1 = volunteer, 0 = admin
        'INSERT INTO users (name, email, phone, password, user_type, role) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, mobile, hashedPassword, 'volunteer', 1]
      );
      
      insertId = result.insertId;
    } catch (insertError) {
      console.error('INSERT ERROR:', insertError);
      throw insertError;
    }
    
    // Get the created user (without password); return numeric role (fallback mapping from user_type)
    const [newUserRows] = await db.promise.execute(
      `SELECT id, name, email, phone,
         COALESCE(role,
           CASE
             WHEN user_type = 'admin' THEN 0
             WHEN user_type = 'volunteer' THEN 1
             ELSE 1
           END
         ) AS role,
         created_at
       FROM users WHERE id = ?`,
      [insertId]
    );
    
    const newUser = newUserRows;
    
    if (!newUser || newUser.length === 0) {
      throw new Error('User was inserted but could not be retrieved');
    }
    
    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      data: newUser[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const email = req.query.email || req.body.email;
    const password = req.query.password || req.body.password;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }
    
    // Find user by email and include numeric role (fallback mapping)
    const [users] = await db.promise.execute(
      `SELECT id, name, email, phone, password, user_type,
         COALESCE(role,
           CASE
             WHEN user_type = 'admin' THEN 0
             WHEN user_type = 'volunteer' THEN 1
             ELSE 1
           END
         ) AS role,
         is_active
       FROM users WHERE email = ?`,
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    const user = users[0];

    // Debug hint: log basic user lookup info (no password)
    console.debug(`Login attempt for user id=${user.id}, email=${user.email}, role=${user.role}, is_active=${user.is_active}`);
    
    // Explicit active check: treat is_active === 0 as deactivated
    if (user.is_active !== undefined && Number(user.is_active) === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }
    
    // Ensure password hash exists
    if (!user.password) {
      console.error(`Login failed: no password hash stored for user id=${user.id}`);
      return res.status(500).json({ success: false, message: 'User password not set. Contact admin.' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.warn(`Invalid password for user id=${user.id} (role=${user.role})`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Generate JWT token including numeric role
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: Number(user.role) // ensure numeric in token
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    // Remove password from response
    delete user.password;
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      data: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset - sends email with reset link
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    // Accept email from query for frontend convenience, but fall back to body
    const email = req.query.email || req.body.email;
    
    // Validation
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide your email address' 
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    // Check if user exists
    const [users] = await db.promise.execute(
      'SELECT id, email, name FROM users WHERE email = ?',
      [email]
    );
    
    // Email not in our list (not registered) - tell user clearly
    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'This email address is not registered in Volunteer Connect.'
      });
    }
    
    const user = users[0];
    
    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Invalidate any existing reset tokens for this user
    await db.promise.execute(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = ? AND used = false',
      [user.id]
    );
    
    // Store reset token in database
    try {
      await db.promise.execute(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, ?)',
        [user.id, resetToken, expiresAt, false]
      );
    } catch (dbError) {
      // If table doesn't exist, log error but continue (for development)
      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        console.error('⚠️  password_reset_tokens table does not exist. Run migration: npm run migrate');
        // For development, we can still return success but log the token
        console.log('📧 Reset token (table missing):', resetToken);
        return res.json({ 
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
          token: resetToken // Only in development when table doesn't exist
        });
      }
      throw dbError;
    }
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken, user.name || 'User');
    
    if (!emailSent) {
      // Log detailed error for debugging
      console.warn('⚠️  Password reset token generated but email not sent.');
      console.warn('   Token saved in database:', resetToken);
      console.warn('   Check email configuration in .env file');
      console.warn('   Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL');
      
      // Still return success for security (don't reveal email issues to user)
      // But log the token for development/testing
      if (process.env.NODE_ENV === 'development') {
        console.log('   📧 Development mode - Reset token:', resetToken);
        console.log('   📧 Reset link:', `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`);
      }
    }
    
    res.json({ 
      success: true,
      message: 'A password reset link has been sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/auth/test-email
// @desc    Test email configuration (development only)
// @access  Public (should be protected in production)
router.get('/test-email', async (req, res) => {
  try {
    const { sendPasswordResetEmail } = require('../config/email');
    const testEmail = req.query.email || process.env.SMTP_USER;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address to test'
      });
    }

    // Generate a test token
    const testToken = crypto.randomBytes(32).toString('hex');
    
    // Try to send test email
    const emailSent = await sendPasswordResetEmail(testEmail, testToken, 'Test User');
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Test email sent successfully!',
        email: testEmail,
        note: 'Check your inbox (and spam folder) for the test email'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email. Check server logs for details.',
        email: testEmail,
        checkEnv: [
          'SMTP_HOST',
          'SMTP_PORT',
          'SMTP_USER',
          'SMTP_PASSWORD',
          'SMTP_FROM_EMAIL',
          'SMTP_FROM_NAME'
        ]
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/reset-password-with-token
// @desc    Reset password using token from email link
// @access  Public
router.post('/reset-password-with-token', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide reset token and new password' 
      });
    }
    
    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }
    
    // Find valid reset token
    const [tokens] = await db.promise.execute(
      `SELECT prt.*, u.id as user_id, u.email 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );
    
    if (tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }
    
    const resetTokenData = tokens[0];
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user password
    await db.promise.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, resetTokenData.user_id]
    );
    
    // Mark token as used
    await db.promise.execute(
      'UPDATE password_reset_tokens SET used = true WHERE id = ?',
      [resetTokenData.id]
    );
    
    res.json({ 
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password with token error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with current password confirmation
// @access  Private (requires authentication)
router.post('/reset-password', authenticateToken, async (req, res) => {
  try {
    const currentPassword = req.query.currentPassword || req.body.currentPassword;
    const newPassword = req.query.newPassword || req.body.newPassword;
    
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
    
    // Get user ID from token
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
    
    // Verify current password
    if (!user.password) {
      return res.status(500).json({ 
        success: false, 
        message: 'User password not set. Contact admin.' 
      });
    }
    
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
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// --- new: list all users (requires token + admin (role === 0)) ---
router.get('/users', authenticateToken, async (req, res) => {
	try {
		// restrict listing to admin role (0)
		if (!req.user || Number(req.user.role) !== 0) {
			return res.status(403).json({ success: false, message: 'Forbidden: admin only' });
		}
		const [rows] = await db.promise.execute(
			'SELECT id, name, email, phone AS mobile, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users'
		);
		res.json({ success: true, data: rows });
	} catch (error) {
		console.error('Get users error:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

// --- new: delete user by id (requires token + admin (role === 0)) ---
router.delete('/users/:id', authenticateToken, async (req, res) => {
	try {
		// admin only
		if (!req.user || Number(req.user.role) !== 0) {
			return res.status(403).json({ success: false, message: 'Forbidden: admin only' });
		}
		const userId = req.params.id;
		// soft-delete: set is_active = 0 (safer)
		await db.promise.execute('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
		res.json({ success: true, message: 'User deleted (soft) successfully' });
	} catch (error) {
		console.error('Delete user error:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

// --- new: update user by id (requires token; owner or admin) ---
router.put('/users/:id', authenticateToken, async (req, res) => {
	try {
		const userId = req.params.id;
		const name = req.query.name || req.body.name;
		const email = req.query.email || req.body.email;
		const mobile = req.query.mobile || req.body.mobile || req.body.phone;
		const password = req.query.password || req.body.password;
		const role = (req.query.role !== undefined ? req.query.role : (req.body.role !== undefined ? req.body.role : undefined));
		// role expected as numeric (0 or 1) if provided

		// allow if owner or admin
		const requesterId = req.user && req.user.id;
		const requesterRole = req.user && Number(req.user.role);

		if (requesterId !== undefined && Number(requesterId) !== Number(userId) && requesterRole !== 0) {
			return res.status(403).json({ success: false, message: 'Forbidden: can only update own profile or admin' });
		}

		// if role change requested, only admin may change role
		if (role !== undefined && requesterRole !== 0) {
			return res.status(403).json({ success: false, message: 'Forbidden: only admin may change role' });
		}

		// Build update statement dynamically
		const fields = [];
		const values = [];
		if (name) { fields.push('name = ?'); values.push(name); }
		if (email) { fields.push('email = ?'); values.push(email); }
		if (mobile) { fields.push('phone = ?'); values.push(mobile); }
		if (role !== undefined) { fields.push('role = ?'); values.push(Number(role)); }
		if (password) {
			const saltRounds = 10;
			const hashedPassword = await bcrypt.hash(password, saltRounds);
			fields.push('password = ?');
			values.push(hashedPassword);
		}

		if (fields.length === 0) {
			return res.status(400).json({ success: false, message: 'No update fields provided' });
		}

		values.push(userId);
		const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
		await db.promise.execute(sql, values);

		// Return updated user (without password)
		const [rows] = await db.promise.execute(
			'SELECT id, name, email, phone AS mobile, COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS role, is_active, created_at FROM users WHERE id = ?',
			[userId]
		);

		res.json({ success: true, message: 'User updated successfully', data: rows[0] });
	} catch (error) {
		console.error('Update user error:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;
