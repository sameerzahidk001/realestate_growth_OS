import { Router } from 'express';
import {
  getAlerts,
  markAlertRead,
  salesAssistant,
  callSummary,
  generateProposal,
  whatsappFollowUp,
  negotiationAssist,
  voiceBot,
  recalculateScores,
  analyticsQuery,
  marketIntelligence,
  getPriceRecommendation,
  leadHunter,
  generateContent,
  planSiteVisits,
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/alerts', getAlerts);
router.patch('/alerts/:id/read', markAlertRead);
router.post('/assistant', salesAssistant);
router.post('/call-summary', callSummary);
router.post('/proposal', generateProposal);
router.post('/whatsapp/:leadId', whatsappFollowUp);
router.post('/negotiation', negotiationAssist);
router.post('/voice-bot', voiceBot);
router.post('/recalculate-scores', recalculateScores);
router.post('/analytics', analyticsQuery);
router.get('/market', marketIntelligence);
router.get('/price/:projectId', getPriceRecommendation);
router.post('/lead-hunter', leadHunter);
router.post('/content', generateContent);
router.post('/plan-visits', planSiteVisits);

export default router;
