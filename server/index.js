require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const User = require('./models/User');
const Weight = require('./models/Weight');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const stravaRoutes = require('./routes/strava');
const auth = require('./middleware/auth');
const { validateRequest, validations } = require('./middleware/validation');
const { errorHandler, notFoundHandler, asyncHandler, sendSuccess, sendError } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_REDIRECT_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please create a .env file in the server directory with these variables.');
  console.error('   Example:');
  console.error('   JWT_SECRET=your-secret-key-here');
  console.error('   STRAVA_CLIENT_ID=your-strava-client-id');
  console.error('   STRAVA_CLIENT_SECRET=your-strava-client-secret');
  console.error('   STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback\n');
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Associations
User.hasMany(Weight, { foreignKey: 'userId', onDelete: 'CASCADE' });
Weight.belongsTo(User, { foreignKey: 'userId' });

// Sync Database
sequelize.sync({ alter: true })
  .then(() => {
    logger.info('Database synced successfully');
  })
  .catch((error) => {
    logger.error('Database sync failed', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/strava', stravaRoutes);

// Weight Routes
app.get('/api/weight', 
  auth, 
  asyncHandler(async (req, res) => {
    const weights = await Weight.findAll({ 
      where: { userId: req.userId },
      order: [['date', 'ASC']] 
    });
    sendSuccess(res, weights);
  })
);

app.post('/api/weight', 
  auth,
  validateRequest(validations.addWeight),
  asyncHandler(async (req, res) => {
    const { weight, date } = req.body;
    const newWeight = await Weight.create({ 
      weight, 
      date, 
      userId: req.userId 
    });
    sendSuccess(res, newWeight, 'Weight added successfully', 201);
  })
);

app.delete('/api/weight/:id', 
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await Weight.destroy({ 
      where: { 
        id,
        userId: req.userId // Ensure user can only delete their own weights
      } 
    });
    
    if (deleted === 0) {
      return sendError(res, 'Weight entry not found', 404);
    }
    
    sendSuccess(res, null, 'Weight deleted successfully');
  })
);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler (must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

