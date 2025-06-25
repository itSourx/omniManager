// src/config.ts
import * as dotenv from 'dotenv';
dotenv.config();

export const Config = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  JWT_SECRET: process.env.JWT_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  //SMTP_USER: process.env.SMTP_USER,
  //SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_USER:'support@sourx.com',
  SMTP_PASSWORD:'%cT4D0AXT+!n',
};
// Logs pour vérifier les variables d'environnement
console.log('SMTP_HOST:', Config.SMTP_HOST);
console.log('SMTP_PORT:', Config.SMTP_PORT);
console.log('SMTP_USER:', Config.SMTP_USER);
console.log('SMTP_PASSWORD:', Config.SMTP_PASSWORD);
