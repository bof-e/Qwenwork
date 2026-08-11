import * as Joi from 'joi';

/**
 * Validation stricte au démarrage (via ConfigModule.forRoot({ validationSchema }))
 * plutôt que de laisser chaque service échouer individuellement à la première
 * utilisation réelle — un DATABASE_URL manquant se voit maintenant en 2 secondes
 * au lancement, pas après 10 minutes de test manuel sur le mauvais endpoint.
 *
 * Les clés marquées .optional() ont un comportement de repli documenté dans
 * leur service respectif (ex. SMTP_HOST absent -> mode dev console).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  // Optionnelle ici : utilisée par docker-compose.prod.yml pour construire DATABASE_URL,
  // pas lue directement par l'application (qui ne connaît que DATABASE_URL déjà assemblée).
  APP_RUNTIME_PASSWORD: Joi.string().optional(),

  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  GEMINI_API_KEY: Joi.string().optional(),
  ANTHROPIC_API_KEY: Joi.string().optional(),
  KOBOTOOLBOX_API_KEY: Joi.string().optional(),
  WEBHOOK_SHARED_SECRET: Joi.string().optional(),

  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_SECURE: Joi.boolean().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),
}).unknown(true); // n'échoue pas sur des variables additionnelles non listées ici
