import serverless from 'serverless-http';
import { connectDB } from '../server/src/config/db.js';

let handler;
let appInstance;

const getApp = async () => {
  if (!appInstance) {
    await connectDB();
    const { default: app } = await import('../server/src/app.js');
    appInstance = app;
    handler = serverless(app);
  }
  return handler;
};

export default async function apiHandler(req, res) {
  try {
    const fn = await getApp();
    return fn(req, res);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      message: error.message || 'Server error',
      hint: 'Check MONGODB_URI and JWT_SECRET are set in Vercel Environment Variables',
    });
  }
}
