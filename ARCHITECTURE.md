# 🏗️ Project Architecture Guide

## Directory Structure

```
server/
├── config/
│   └── config.json           # Database configuration
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   ├── validation.js         # Input validation middleware ✨ NEW
│   └── errorHandler.js       # Error handling & responses ✨ NEW
├── models/
│   ├── User.js               # User model with password hashing
│   └── Weight.js             # Weight tracking model
├── routes/
│   ├── auth.js               # Authentication routes (login, register)
│   ├── user.js               # User profile & calorie calculation
│   └── strava.js             # Strava OAuth & activities
├── utils/
│   ├── logger.js             # Centralized logging ✨ NEW
│   └── stravaHelpers.js      # Shared Strava utilities ✨ NEW
├── scripts/
│   └── update_tokens.js      # Manual token update script
├── .env                      # Environment variables
├── database.js               # Sequelize configuration
├── database.sqlite           # SQLite database file
├── index.js                  # Main server file
└── package.json

client/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx     # Main dashboard with charts
│   │   ├── KcalCalculator.jsx # Calorie calculator
│   │   ├── Layout.jsx        # App layout with header
│   │   ├── ProtectedRoute.jsx # Route protection
│   │   ├── StatsCard.jsx     # Reusable stats card
│   │   ├── UserProfile.jsx   # User profile form
│   │   └── WeightForm.jsx    # Weight logging form
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── pages/
│   │   ├── Login.jsx         # Login page
│   │   ├── Register.jsx      # Registration page
│   │   ├── StravaConnect.jsx # Strava connection page
│   │   └── StravaStats.jsx   # Strava statistics page
│   ├── utils/
│   │   └── toast.js          # Toast notifications ✨ NEW
│   ├── api.js                # Axios instance with interceptors
│   ├── App.jsx               # Main app component
│   ├── index.css             # Global styles
│   └── main.jsx              # React entry point
└── package.json
```

---

## 🔄 Request Flow

### Authentication Flow
```
Client → POST /api/auth/login
  ↓
validation.js (validate email/password)
  ↓
auth.js route handler
  ↓
User.findOne() + comparePassword()
  ↓
Generate JWT token
  ↓
errorHandler.js (sendSuccess)
  ↓
Client receives { success: true, data: { user, token } }
```

### Protected Route Flow
```
Client → GET /api/user (with Authorization header)
  ↓
auth.js middleware (verify JWT)
  ↓
req.userId set
  ↓
user.js route handler
  ↓
User.findByPk(req.userId)
  ↓
errorHandler.js (sendSuccess)
  ↓
Client receives user data
```

### Calorie Calculation Flow
```
Client → POST /api/user/calculate-calories
  ↓
auth.js middleware
  ↓
validation.js (validate gender, goal)
  ↓
user.js route handler
  ↓
Fetch latest weight from Weight table
  ↓
calculateBMR() → Calculate base metabolic rate
  ↓
stravaHelpers.getValidStravaToken() → Get/refresh token
  ↓
stravaHelpers.fetchStravaActivities() → Get activity history
  ↓
calculateActivityFactor() → Determine activity level
  ↓
calculateCalorieAdjustment() → Apply goal-based adjustment
  ↓
Save consoKcal & weeksToGoal to User
  ↓
errorHandler.js (sendSuccess)
  ↓
Client receives calculation results
```

---

## 🔑 Key Components

### Server

#### **Middleware Stack**
1. `cors()` - Enable cross-origin requests
2. `express.json()` - Parse JSON bodies
3. `auth` - Verify JWT token (protected routes only)
4. `validateRequest()` - Validate input data
5. `asyncHandler()` - Catch async errors
6. `errorHandler()` - Global error handler (last)

#### **Utility Functions**

**logger.js**
- `logger.info()` - Log info messages
- `logger.error()` - Log errors
- `logger.warn()` - Log warnings
- `logger.debug()` - Log debug info (dev only)

**stravaHelpers.js**
- `getStravaCredentials(userId)` - Get client ID/secret for user
- `getValidStravaToken(user)` - Get valid token, refresh if needed
- `fetchStravaActivities(token, params)` - Fetch activities from Strava

**errorHandler.js**
- `asyncHandler(fn)` - Wrap async route handlers
- `sendSuccess(res, data, message, statusCode)` - Send success response
- `sendError(res, message, statusCode, details)` - Send error response
- `errorHandler(err, req, res, next)` - Global error handler
- `notFoundHandler(req, res)` - 404 handler

#### **Business Logic Functions**

**user.js**
- `calculateBMR(weight, height, age, gender)` - Mifflin-St Jeor equation
- `calculateActivityFactor(avgHoursPerWeek)` - Activity level from hours
- `calculateCalorieAdjustment(goal, delta)` - Calorie adjustment logic

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### User Profile
- `GET /api/user` - Get user profile (protected)
- `POST /api/user` - Update user profile (protected)
- `POST /api/user/calculate-calories` - Calculate daily calories (protected)

### Weight Tracking
- `GET /api/weight` - Get all weight entries (protected)
- `POST /api/weight` - Add weight entry (protected)
- `DELETE /api/weight/:id` - Delete weight entry (protected)

### Strava Integration
- `GET /api/strava/auth` - Get Strava OAuth URL (protected)
- `GET /api/strava/callback` - OAuth callback (public)
- `POST /api/strava/connect` - Exchange code for tokens (protected)
- `GET /api/strava/activities` - Get Strava activities (protected)

---

## 🔐 Environment Variables

### Required
```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Strava API (Default User)
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret
STRAVA_REDIRECT_URI=http://localhost:3001/api/strava/callback

# Strava API (User ID 2 - Victor)
VICTOR_STRAVA_CLIENT_ID=victor-client-id
VICTOR_STRAVA_CLIENT_SECRET=victor-client-secret

# Database (SQLite - auto-configured)
# No additional config needed for SQLite

# Server
PORT=3001
NODE_ENV=development
```

---

## 🧪 Testing Guide

### Manual Testing

1. **Start Server**
   ```bash
   cd server
   npm start
   ```

2. **Start Client**
   ```bash
   cd client
   npm run dev
   ```

3. **Test Authentication**
   - Register new user
   - Login with credentials
   - Verify token in localStorage
   - Access protected routes

4. **Test Weight Tracking**
   - Add weight entry
   - View weight chart
   - Delete weight entry

5. **Test Strava Integration**
   - Connect Strava account
   - View activities
   - Verify token refresh

6. **Test Calorie Calculator**
   - Set user profile (height, age, gender)
   - Log weight data
   - Calculate calories
   - Verify results displayed

### API Testing with cURL

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","pseudo":"TestUser"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get User (replace TOKEN)
curl http://localhost:3001/api/user \
  -H "Authorization: Bearer TOKEN"

# Add Weight
curl -X POST http://localhost:3001/api/weight \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weight":75.5,"date":"2025-11-20"}'
```

---

## 🐛 Debugging

### Server Logs
All logs now use the logger utility:
```javascript
logger.info('Message', { metadata });
logger.error('Error message', error);
logger.warn('Warning', { data });
logger.debug('Debug info', { details });
```

### Common Issues

**"Missing required environment variables"**
- Check `.env` file exists in `/server`
- Verify all required variables are set
- Restart server after changing `.env`

**"Database synced failed"**
- Check database file permissions
- Delete `database.sqlite` and restart (will recreate)
- Check Sequelize configuration in `config/config.json`

**"Failed to refresh Strava token"**
- Check Strava credentials in `.env`
- Verify refresh token is valid
- Reconnect Strava account from UI

**"Validation failed"**
- Check request body matches validation rules
- See `middleware/validation.js` for rules
- Ensure all required fields are provided

---

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (32+ characters)
3. Configure production database (PostgreSQL/MySQL)
4. Set up SSL/TLS certificates
5. Configure CORS for production domain
6. Enable rate limiting
7. Set up error tracking (Sentry)
8. Configure logging to file/service
9. Set up database backups
10. Add health check endpoint

### Recommended Hosting
- **Server**: Heroku, Railway, Render, DigitalOcean
- **Client**: Vercel, Netlify, Cloudflare Pages
- **Database**: Heroku Postgres, PlanetScale, Supabase

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [React Documentation](https://react.dev/)
- [Strava API Documentation](https://developers.strava.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: 2025-11-20
**Maintained By**: Development Team
