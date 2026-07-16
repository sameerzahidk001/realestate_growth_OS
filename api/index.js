import serverless from 'serverless-http';
import { initApp } from '../server/src/app.js';

let handler;

export default async function apiHandler(req, res) {
  if (!handler) {
    const app = await initApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
