import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { calculateLeadScore, generateWhatsAppMessage } from './aiService.js';
import { formatId } from '../utils/apiFormat.js';

const DAYS_SILENT_THRESHOLD = 4;
const DAYS_NO_FOLLOWUP_THRESHOLD = 3;

export const startCronJobs = () => {
  if (process.env.VERCEL) return;

  cron.schedule('0 9 * * *', async () => {
    await checkOverdueFollowUps();
    await checkSilentLeads();
    await recalculateLeadScores();
  });

  cron.schedule('0 */6 * * *', async () => {
    await sendAiWhatsAppFollowUps();
  });
};

const checkOverdueFollowUps = async () => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - DAYS_NO_FOLLOWUP_THRESHOLD);

  const leads = await prisma.lead.findMany({
    where: {
      status: { notIn: ['booked', 'lost'] },
      OR: [{ lastContactedAt: { lt: threshold } }, { lastContactedAt: null }],
    },
  });

  for (const lead of leads) {
    const daysSince = lead.lastContactedAt
      ? Math.floor((Date.now() - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24))
      : Math.floor((Date.now() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24));

    const existing = await prisma.aIAlert.findFirst({
      where: {
        leadId: lead.id,
        type: 'follow_up_risk',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (!existing && daysSince >= DAYS_NO_FOLLOWUP_THRESHOLD) {
      await prisma.aIAlert.create({
        data: {
          builderId: lead.builderId,
          leadId: lead.id,
          type: 'follow_up_risk',
          message: `${lead.name} — no follow-up in ${daysSince} days, risk of losing the lead`,
          priority: daysSince >= 7 ? 'critical' : 'high',
        },
      });
    }
  }
};

const checkSilentLeads = async () => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - DAYS_SILENT_THRESHOLD);

  await prisma.lead.updateMany({
    where: {
      status: { notIn: ['booked', 'lost'] },
      lastContactedAt: { lt: threshold },
      isSilent: false,
    },
    data: { isSilent: true, silentSince: new Date() },
  });
};

const sendAiWhatsAppFollowUps = async () => {
  const silentLeads = await prisma.lead.findMany({
    where: { isSilent: true, status: { notIn: ['booked', 'lost'] } },
    include: { project: { select: { name: true } } },
    take: 10,
  });

  for (const lead of silentLeads) {
    const message = await generateWhatsAppMessage(formatId(lead), lead.project?.name);
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'ai_message',
        description: `AI WhatsApp follow-up sent: ${message.substring(0, 100)}...`,
        metadata: { channel: 'whatsapp', message },
      },
    });
    await prisma.lead.update({ where: { id: lead.id }, data: { lastContactedAt: new Date() } });
  }
};

const recalculateLeadScores = async () => {
  const leads = await prisma.lead.findMany({ where: { status: { not: 'lost' } } });
  for (const lead of leads) {
    const newScore = calculateLeadScore(formatId(lead));
    if (newScore !== lead.aiScore) {
      const oldScore = lead.aiScore;
      await prisma.lead.update({ where: { id: lead.id }, data: { aiScore: newScore } });
      if (newScore >= 80 && oldScore < 80) {
        await prisma.aIAlert.create({
          data: {
            builderId: lead.builderId,
            leadId: lead.id,
            type: 'high_priority',
            message: `${lead.name} scored ${newScore}/100 — high priority lead`,
            priority: 'high',
          },
        });
      }
    }
  }
};
