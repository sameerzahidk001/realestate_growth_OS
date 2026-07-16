import { Router } from 'express';
import {
  getLandingPages,
  createLandingPage,
  updateLandingPage,
  getPublicLandingPage,
  captureLeadFromLanding,
  getCampaigns,
  createCampaign,
  aiCampaignSuggestion,
  importPortalLeads,
  getMarketingCampaigns,
  createMarketingCampaign,
  getCompetitors,
  trackCompetitor,
  submitPilotFeedback,
  getPilotFeedback,
  logUsage,
  getUsageStats,
} from '../controllers/marketingController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/landing/:slug', getPublicLandingPage);
router.post('/landing/:slug/capture', captureLeadFromLanding);

router.use(protect);
router.get('/landing-pages', getLandingPages);
router.post('/landing-pages', createLandingPage);
router.put('/landing-pages/:id', updateLandingPage);
router.get('/campaigns', getCampaigns);
router.post('/campaigns', createCampaign);
router.post('/campaigns/ai-suggest', aiCampaignSuggestion);
router.post('/import-leads', importPortalLeads);
router.get('/automation', getMarketingCampaigns);
router.post('/automation', createMarketingCampaign);
router.get('/competitors', getCompetitors);
router.post('/competitors', trackCompetitor);
router.post('/pilot-feedback', submitPilotFeedback);
router.get('/pilot-feedback', getPilotFeedback);
router.post('/usage', logUsage);
router.get('/usage', getUsageStats);

export default router;
