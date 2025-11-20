require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const User = require('./models/User');
const Weight = require('./models/Weight');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Associations
User.hasMany(Weight, { foreignKey: 'userId' });
Weight.belongsTo(User, { foreignKey: 'userId' });

// Sync Database (alter: true updates schema without data loss)
sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced (schema updated)');
});

// Auth Routes (public)
app.use('/api/auth', authRoutes);
app.use('/api/strava', require('./routes/strava'));

// Protected Routes
app.use('/api/user', require('./routes/user'));

// Get Weights
app.get('/api/weight', auth, async (req, res) => {
  try {
    const weights = await Weight.findAll({ 
      where: { userId: req.userId },
      order: [['date', 'ASC']] 
    });
    res.json(weights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Weight
app.post('/api/weight', auth, async (req, res) => {
  try {
    const { weight, date } = req.body;
    const newWeight = await Weight.create({ 
      weight, 
      date, 
      userId: req.userId 
    });
    res.json(newWeight);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Weight
app.delete('/api/weight/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await Weight.destroy({ 
      where: { 
        id,
        userId: req.userId // Ensure user can only delete their own weights
      } 
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
