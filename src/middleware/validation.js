const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Validation failed', details);
    }

    req.body = value;
    next();
  };
};

// Authentication schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  }),
  full_name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Full name must be at least 2 characters',
    'string.max': 'Full name cannot exceed 255 characters',
    'any.required': 'Full name is required',
  }),
  username: Joi.string().alphanum().min(3).max(100).optional().messages({
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 100 characters',
  }),
  // Optional onboarding fields
  age: Joi.number().integer().min(13).max(120).optional().messages({
    'number.min': 'Age must be at least 13',
    'number.max': 'Age cannot exceed 120',
    'number.base': 'Age must be a valid number',
  }),
  location_city: Joi.string().max(100).optional().messages({
    'string.max': 'City name cannot exceed 100 characters',
  }),
  location_state: Joi.string().max(50).optional().messages({
    'string.max': 'State name cannot exceed 50 characters',
  }),
  location_country: Joi.string().max(50).optional().messages({
    'string.max': 'Country name cannot exceed 50 characters',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
});

// Profile schemas
const updateProfileSchema = Joi.object({
  bio: Joi.string().max(500).optional(),
  location: Joi.string().max(255).optional(),
  age: Joi.number().integer().min(13).max(120).optional().messages({
    'number.min': 'Age must be at least 13',
    'number.max': 'Age cannot exceed 120',
    'number.base': 'Age must be a valid number',
  }),
  location_city: Joi.string().max(100).optional().messages({
    'string.max': 'City name cannot exceed 100 characters',
  }),
  location_state: Joi.string().max(50).optional().messages({
    'string.max': 'State name cannot exceed 50 characters',
  }),
  location_country: Joi.string().max(50).optional().messages({
    'string.max': 'Country name cannot exceed 50 characters',
  }),
  style_preferences: Joi.object().optional(),
  size_preferences: Joi.object().optional(),
  budget_range: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional(),
  }).optional(),
  privacy_settings: Joi.object().optional(),
  notification_settings: Joi.object().optional(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(100).optional(),
  full_name: Joi.string().min(2).max(255).optional(),
  profile_image_url: Joi.string().uri().optional(),
});

// Brand following schema
const followBrandSchema = Joi.object({
  brand_id: Joi.number().integer().positive().required(),
  notification_enabled: Joi.boolean().optional().default(true),
});

// Fashion preferences schema
const updatePreferencesSchema = Joi.object({
  preferred_colors: Joi.array().items(Joi.string()).optional(),
  preferred_styles: Joi.array().items(Joi.string()).optional(),
  preferred_categories: Joi.array().items(Joi.string()).optional(),
  avoided_materials: Joi.array().items(Joi.string()).optional(),
  fit_preferences: Joi.object().optional(),
  occasions: Joi.array().items(Joi.string()).optional(),
});

// Onboarding schema - for multi-step onboarding flow
const onboardingSchema = Joi.object({
  age: Joi.number().integer().min(13).max(120).optional().messages({
    'number.min': 'Age must be at least 13',
    'number.max': 'Age cannot exceed 120',
    'number.base': 'Age must be a valid number',
  }),
  age_range: Joi.string().valid('18-24', '25-34', '35-44', '45-54', '55-64', '65+').optional().messages({
    'any.only': 'Please select a valid age range',
  }),
  location_city: Joi.string().max(100).optional().messages({
    'string.max': 'City name cannot exceed 100 characters',
  }),
  location_state: Joi.string().max(50).optional().messages({
    'string.max': 'State name cannot exceed 50 characters',
  }),
  location_country: Joi.string().max(50).optional().messages({
    'string.max': 'Country name cannot exceed 50 characters',
  }),
  bio: Joi.string().max(500).optional(),
  style_preferences: Joi.object().optional(),
  size_preferences: Joi.object().optional(),
  budget_range: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional(),
  }).optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateUserSchema,
  followBrandSchema,
  updatePreferencesSchema,
  onboardingSchema,
};
