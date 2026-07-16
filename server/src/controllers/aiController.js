import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma.js';
import {
  aiComplete,
  summarizeCall,
  generateProposalContent,
  generateWhatsAppMessage,
  generateMarketingContent,
  generateCampaignSuggestion,
  analyzeMarket,
  priceRecommendation,
  naturalLanguageAnalytics,
  calculateLeadScore,
} from '../services/aiService.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

export const getAlerts = async (req, res) => {
  const alerts = await prisma.aIAlert.findMany({
    where: { builderId: getBuilderId(req.user) },
    include: { lead: { select: { id: true, name: true, phone: true, aiScore: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(formatId(alerts));
};

export const markAlertRead = async (req, res) => {
  await prisma.aIAlert.updateMany({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ success: true });
};

export const salesAssistant = async (req, res) => {
  const { question } = req.body;
  const builderId = getBuilderId(req.user);

  const [dueLeads, highScoreLeads] = await Promise.all([
    prisma.lead.findMany({
      where: { builderId, status: { notIn: ['booked', 'lost'] } },
      orderBy: { nextFollowUpAt: 'asc' },
      take: 5,
    }),
    prisma.lead.findMany({
      where: { builderId, aiScore: { gte: 70 } },
      orderBy: { aiScore: 'desc' },
      take: 5,
    }),
  ]);

  const context = `Due follow-ups: ${dueLeads.map((l) => l.name).join(', ')}. High score leads: ${highScoreLeads.map((l) => `${l.name}(${l.aiScore})`).join(', ')}`;
  const answer = await aiComplete(question, 'You are a sales assistant for real estate executives.', context);

  await prisma.aIConversation.create({
    data: {
      builderId,
      userId: getUserId(req.user),
      type: 'assistant',
      messages: [
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ],
    },
  });

  res.json({ answer });
};

export const callSummary = async (req, res) => {
  const { transcript, leadId } = req.body;
  const summary = await summarizeCall(transcript);

  if (leadId) {
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'call',
        description: summary,
        createdById: getUserId(req.user),
      },
    });
  }

  res.json({ summary });
};

export const generateProposal = async (req, res) => {
  const { leadId, unitId } = req.body;
  const [lead, unit] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.unit.findUnique({ where: { id: unitId }, include: { project: true } }),
  ]);

  if (!lead || !unit) return res.status(404).json({ message: 'Lead or unit not found' });

  const content = await generateProposalContent(formatId(lead), formatId(unit), formatId(unit.project));

  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  doc.fontSize(20).text('Property Proposal', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Customer: ${content.customerName}`);
  doc.text(`Project: ${content.projectName}`);
  doc.text(`Unit: ${content.unitNumber} (${content.unitType})`);
  doc.text(`Floor: ${content.floor} | Area: ${content.area}`);
  doc.text(`Price: ₹${content.price.toLocaleString('en-IN')}`);
  doc.text(`Booking Amount: ₹${content.bookingAmount.toLocaleString('en-IN')}`);
  doc.text(`Valid Until: ${content.validUntil.toDateString()}`);
  doc.moveDown();
  doc.text(content.terms);
  doc.end();

  await new Promise((resolve) => doc.on('end', resolve));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=proposal-${lead.name.replace(/\s+/g, '-')}.pdf`);
  res.send(Buffer.concat(chunks));
};

export const whatsappFollowUp = async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.leadId },
    include: { project: { select: { name: true } } },
  });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const message = await generateWhatsAppMessage(formatId(lead), lead.project?.name);

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'ai_message',
      description: message,
      createdById: getUserId(req.user),
      metadata: { channel: 'whatsapp' },
    },
  });

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { lastContactedAt: new Date() },
    include: { project: { select: { id: true, name: true } } },
  });

  res.json({ message, lead: formatId(updated) });
};

export const negotiationAssist = async (req, res) => {
  const { leadId, requestedDiscount } = req.body;
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { unit: true },
  });
  const prompt = `Customer ${lead?.name} wants ${requestedDiscount}% discount on unit priced ₹${lead?.unit?.price || 'unknown'}. Suggest alternative offer.`;
  const suggestion = await aiComplete(prompt, 'Suggest alternatives to discount for Indian real estate.', '');
  res.json({ suggestion });
};

export const voiceBot = async (req, res) => {
  const { question } = req.body;
  const answer = await aiComplete(
    question,
    'You are a voice bot for a real estate project. Answer common questions about price, amenities, location, EMI. Keep answers under 50 words.',
    ''
  );
  res.json({ answer });
};

export const recalculateScores = async (req, res) => {
  const builderId = getBuilderId(req.user);
  const leads = await prisma.lead.findMany({ where: { builderId, status: { not: 'lost' } } });
  let updated = 0;

  for (const lead of leads) {
    const score = calculateLeadScore(formatId(lead));
    if (score !== lead.aiScore) {
      await prisma.lead.update({ where: { id: lead.id }, data: { aiScore: score } });
      updated++;
    }
  }

  res.json({ updated, total: leads.length });
};

export const analyticsQuery = async (req, res) => {
  const builderId = getBuilderId(req.user);
  const grouped = await prisma.lead.groupBy({
    by: ['status'],
    where: { builderId },
    _count: { _all: true },
    _avg: { aiScore: true },
  });

  const stats = grouped.map((g) => ({
    _id: g.status,
    count: g._count._all,
    avgScore: g._avg.aiScore,
  }));

  const answer = await naturalLanguageAnalytics(req.body.question, JSON.stringify(stats));
  res.json({ answer, data: stats });
};

export const marketIntelligence = async (req, res) => {
  const insight = await analyzeMarket(req.query.city || 'Patna', req.query.bhk || '2BHK');
  res.json({ insight });
};

export const getPriceRecommendation = async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  const competitors = await prisma.competitor.findMany({ where: { builderId: getBuilderId(req.user) } });
  const recommendation = await priceRecommendation(project, competitors);
  res.json({ recommendation });
};

export const leadHunter = async (req, res) => {
  const { city, budget, count } = req.body;
  const campaign = await generateCampaignSuggestion(`Need ${count || 100} leads in ${city}, budget ${budget}`);
  res.json({ campaign });
};

export const generateContent = async (req, res) => {
  const content = await generateMarketingContent(req.body.platform, req.body.topic);
  res.json({ content });
};

export const planSiteVisits = async (req, res) => {
  const { leadId } = req.body;
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  const city = lead?.preferredLocation?.split('-')[0]?.trim();
  const projects = await prisma.project.findMany({
    where: { builderId: getBuilderId(req.user), ...(city ? { city } : {}) },
    take: 3,
  });

  res.json({
    suggestion: `Schedule visits for ${lead?.name} at: ${projects.map((p) => p.name).join(', ') || 'nearest available projects'}`,
    projects: formatId(projects),
  });
};
