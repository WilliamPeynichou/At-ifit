require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const User = require('./models/User');
const Weight = require('./models/Weight');
const RefreshToken = require('./models/RefreshToken');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const stravaRoutes = require('./routes/strava');
const aiCoachRoutes = require('./routes/aiCoach');
const auth = require('./middleware/auth');
const { validateRequest, validations } = require('./middleware/validation');
const { errorHandler, notFoundHandler, asyncHandler, sendSuccess, sendError } = require('./middleware/errorHandler');
const { updateUserIMCAndCalories } = require('./utils/userCalculations');
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
  console.error('   STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback');
  console.error('\n   # MySQL Database (optional - uses config.json if not set)');
  console.error('   DB_HOST=localhost');
  console.error('   DB_PORT=3306');
  console.error('   DB_DATABASE=ecocycle_db');
  console.error('   DB_USERNAME=root');
  console.error('   DB_PASSWORD=  # Vide par défaut sur Mac\n');
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

User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

// Test Database Connection and Sync
sequelize.authenticate()
  .then(() => {
    logger.info('✅ Connexion à MySQL établie avec succès');
    // Sync RefreshToken table separately to avoid issues with existing tables
    return RefreshToken.sync({ alter: true });
  })
  .then(() => {
    logger.info('✅ Table RefreshTokens synchronisée');
    // Sync other tables without alter to avoid "too many keys" error
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    logger.info('✅ Base de données synchronisée avec succès');
  })
  .catch((error) => {
    logger.error('❌ Erreur de connexion/synchronisation MySQL:', error.message);
    logger.warn('⚠️  Le serveur continuera malgré l\'erreur de base de données');
    logger.warn('💡 Vérifiez que MySQL est démarré et que la base de données existe');
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/ai-coach', aiCoachRoutes);

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
    
    // Convertir le poids en nombre flottant pour s'assurer qu'il est bien stocké comme FLOAT
    const weightValue = parseFloat(weight);
    
    if (isNaN(weightValue) || weightValue <= 0) {
      return sendError(res, 'Weight must be a valid number greater than 0', 400);
    }
    
    // Vérifier si un poids existe déjà pour cette date pour cet utilisateur
    const existingWeight = await Weight.findOne({
      where: {
        userId: req.userId,
        date: date
      }
    });
    
    // Récupérer l'utilisateur pour mettre à jour l'IMC
    const user = await User.findByPk(req.userId);
    
    if (existingWeight) {
      // Mettre à jour le poids existant pour cette date
      existingWeight.weight = weightValue;
      await existingWeight.save();
      
      // Mettre à jour l'IMC
      if (user) {
        await updateUserIMCAndCalories(user, { currentWeight: weightValue });
      }
      
      return sendSuccess(res, existingWeight, 'Weight updated successfully', 200);
    }
    
    // Créer un nouvel enregistrement
    const newWeight = await Weight.create({ 
      weight: weightValue, 
      date: date, 
      userId: req.userId 
    });
    
    // Mettre à jour l'IMC
    if (user) {
      await updateUserIMCAndCalories(user, { currentWeight: weightValue });
    }
    
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

