import cron from 'node-cron';
import Lead from '../models/Lead.js';
import FollowUp from '../models/FollowUp.js';
import { AIAlert } from '../models/Support.js';
import { calculateLeadScore, generateWhatsAppMessage } from './aiService.js';

const DAYS_SILENT_THRESHOLD = 4;
const DAYS_NO_FOLLOWUP_THRESHOLD = 3;

export const startCronJobs = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily AI jobs...');
    await checkOverdueFollowUps();
    await checkSilentLeads();
    await recalculateLeadScores();
  });

  cron.schedule('0 */6 * * *', async () => {
    await sendAiWhatsAppFollowUps();
  });

  console.log('Cron jobs scheduled');
};

const checkOverdueFollowUps = async () => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - DAYS_NO_FOLLOWUP_THRESHOLD);

  const leads = await Lead.find({
    status: { $nin: ['booked', 'lost'] },
    $or: [{ lastContactedAt: { $lt: threshold } }, { lastContactedAt: null }],
  }).populate('assignedTo', 'name');

  for (const lead of leads) {
    const daysSince = lead.lastContactedAt
      ? Math.floor((Date.now() - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24))
      : Math.floor((Date.now() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24));

    const existing = await AIAlert.findOne({
      lead: lead._id,
      type: 'follow_up_risk',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (!existing && daysSince >= DAYS_NO_FOLLOWUP_THRESHOLD) {
      await AIAlert.create({
        builder: lead.builder,
        lead: lead._id,
        type: 'follow_up_risk',
        message: `${lead.name} — no follow-up in ${daysSince} days, risk of losing the lead`,
        priority: daysSince >= 7 ? 'critical' : 'high',
      });
    }
  }
};

const checkSilentLeads = async () => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - DAYS_SILENT_THRESHOLD);

  await Lead.updateMany(
    {
      status: { $nin: ['booked', 'lost'] },
      lastContactedAt: { $lt: threshold },
      isSilent: false,
    },
    { isSilent: true, silentSince: new Date() }
  );
};

const sendAiWhatsAppFollowUps = async () => {
  const silentLeads = await Lead.find({
    isSilent: true,
    status: { $nin: ['booked', 'lost'] },
  }).populate('project', 'name');

  for (const lead of silentLeads.slice(0, 10)) {
    const message = await generateWhatsAppMessage(lead, lead.project?.name);
    lead.activities.push({
      type: 'ai_message',
      description: `AI WhatsApp follow-up sent: ${message.substring(0, 100)}...`,
      metadata: { channel: 'whatsapp', message },
    });
    lead.lastContactedAt = new Date();
    await lead.save();
  }
};

const recalculateLeadScores = async () => {
  const leads = await Lead.find({ status: { $nin: ['lost'] } }).populate('project');
  for (const lead of leads) {
    const newScore = calculateLeadScore(lead, lead.project);
    if (newScore !== lead.aiScore) {
      const oldScore = lead.aiScore;
      lead.aiScore = newScore;
      if (newScore >= 80 && oldScore < 80) {
        await AIAlert.create({
          builder: lead.builder,
          lead: lead._id,
          type: 'high_priority',
          message: `${lead.name} scored ${newScore}/100 — high priority lead`,
          priority: 'high',
        });
      }
      await lead.save();
    }
  }
};
