import { initApp } from './app.js';
import { startCronJobs } from './services/cronService.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  await initApp();
  startCronJobs();

  const { default: app } = await import('./app.js');
  app.listen(PORT, () => {
    console.log(`Growth OS API running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
