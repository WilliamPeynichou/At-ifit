/**
 * Input validation middleware using express-validator patterns
 * Provides reusable validation rules
 */

const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Simple validation helper
    const errors = [];
    
    for (const [field, rules] of Object.entries(validations)) {
      const value = req.body[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
        
        if (rules.type === 'number' && isNaN(Number(value))) {
          errors.push(`${field} must be a number`);
        }
        
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        
        if (rules.min !== undefined && Number(value) < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        
        if (rules.max !== undefined && Number(value) > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    next();
  };
};

// Common validation rules
const validations = {
  register: {
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
    pseudo: { required: false }
  },
  
  login: {
    email: { required: true, type: 'email' },
    password: { required: true }
  },
  
  updateProfile: {
    height: { required: false, type: 'number', min: 50, max: 300 },
    age: { required: false, type: 'number', min: 1, max: 150 },
    targetWeight: { required: false, type: 'number', min: 20, max: 500 }
  },
  
  addWeight: {
    weight: { required: true, type: 'number', min: 20, max: 500 },
    date: { required: true }
  }
};

module.exports = { validateRequest, validations };
