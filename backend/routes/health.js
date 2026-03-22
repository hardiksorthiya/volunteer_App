const express = require('express');
const router = express.Router();
const db = require('../config/database');

// @route   GET /api/health
// @desc    Health check endpoint
// @access  Public
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/health/db
// @desc    Database health check
// @access  Public
router.get('/db', (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(503).json({
        status: 'disconnected',
        message: 'Database connection failed',
        error: err.message
      });
    }
    
    connection.ping((pingErr) => {
      connection.release();
      
      if (pingErr) {
        return res.status(503).json({
          status: 'disconnected',
          message: 'Database ping failed',
          error: pingErr.message
        });
      }
      
      res.json({
        status: 'connected',
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    });
  });
});

module.exports = router;

