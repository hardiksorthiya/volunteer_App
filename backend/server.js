const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes and auth
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const { authenticate, authorize } = require('./middleware/auth');
const activitiesRoutes = require('./routes/activities');
const volunteersRoutes = require('./routes/volunteers');
const rolesRoutes = require('./routes/roles');
const permissionsRoutes = require('./routes/permissions');
const organizationsRoutes = require('./routes/organizations');
const chatRoutes = require('./routes/chat');

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public directory (for API docs)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve static files from uploads directory (profile images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes - must come before frontend serving
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
// Register hour-target-progress on main app so path is matched before users router (avoids 404)
app.get('/api/users/me/hour-target-progress', authenticate, usersRoutes.hourTargetProgressHandler);
app.get('/api/users/hour-target-progress', authenticate, usersRoutes.hourTargetProgressHandler);
app.use('/api/users', usersRoutes);
// Register import-csv on main app so path is matched before activities router (avoids 404)
app.post('/api/activities/import-csv', authenticate, authorize('admin'), activitiesRoutes.uploadCsv.single('file'), activitiesRoutes.importCsvHandler);
app.use('/api/activities', activitiesRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/chat', chatRoutes);

// Serve API documentation
app.get('/api/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

// Serve frontend build files (static assets)
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// Serve frontend React app for all non-API routes
// This handles React Router client-side routing
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Skip files with extensions (static assets)
  if (req.path.includes('.')) {
    return next();
  }
  
  // Serve React app index.html for all other routes
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
