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
import Lead from '../models/Lead.js';
import Unit from '../models/Unit.js';
import Project from '../models/Project.js';
import { AIAlert, AIConversation } from '../models/Support.js';
import { Competitor } from '../models/Marketing.js';
import PDFDocument from 'pdfkit';

export const getAlerts = async (req, res) => {
  const alerts = await AIAlert.find({ builder: req.user.builder._id || req.user.builder })
    .populate('lead', 'name phone aiScore')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(alerts);
};

export const markAlertRead = async (req, res) => {
  await AIAlert.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
};

export const salesAssistant = async (req, res) => {
  const { question } = req.body;
  const builderId = req.user.builder._id || req.user.builder;

  const [dueLeads, highScoreLeads] = await Promise.all([
    Lead.find({ builder: builderId, status: { $nin: ['booked', 'lost'] } })
      .sort({ nextFollowUpAt: 1 })
      .limit(5),
    Lead.find({ builder: builderId, aiScore: { $gte: 70 } })
      .sort({ aiScore: -1 })
      .limit(5),
  ]);

  const context = `Due follow-ups: ${dueLeads.map((l) => l.name).join(', ')}. High score leads: ${highScoreLeads.map((l) => `${l.name}(${l.aiScore})`).join(', ')}`;
  const answer = await aiComplete(question, 'You are a sales assistant for real estate executives.', context);

  await AIConversation.create({
    builder: builderId,
    user: req.user._id,
    type: 'assistant',
    messages: [
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ],
  });

  res.json({ answer });
};

export const callSummary = async (req, res) => {
  const { transcript, leadId } = req.body;
  const summary = await summarizeCall(transcript);

  if (leadId) {
    const lead = await Lead.findById(leadId);
    if (lead) {
      lead.activities.push({
        type: 'call',
        description: summary,
        createdBy: req.user._id,
      });
      await lead.save();
    }
  }

  res.json({ summary });
};

export const generateProposal = async (req, res) => {
  const { leadId, unitId } = req.body;
  const [lead, unit] = await Promise.all([
    Lead.findById(leadId),
    Unit.findById(unitId).populate('project'),
  ]);

  if (!lead || !unit) return res.status(404).json({ message: 'Lead or unit not found' });

  const content = await generateProposalContent(lead, unit, unit.project);

  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => {});

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
  const pdfBuffer = Buffer.concat(chunks);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=proposal-${lead.name.replace(/\s+/g, '-')}.pdf`);
  res.send(pdfBuffer);
};

export const whatsappFollowUp = async (req, res) => {
  const lead = await Lead.findById(req.params.leadId).populate('project', 'name');
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const message = await generateWhatsAppMessage(lead, lead.project?.name);
  lead.activities.push({
    type: 'ai_message',
    description: message,
    createdBy: req.user._id,
    metadata: { channel: 'whatsapp' },
  });
  lead.lastContactedAt = new Date();
  await lead.save();

  res.json({ message, lead });
};

export const negotiationAssist = async (req, res) => {
  const { leadId, requestedDiscount } = req.body;
  const lead = await Lead.findById(leadId).populate('unit');
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
  const builderId = req.user.builder._id || req.user.builder;
  const leads = await Lead.find({ builder: builderId, status: { $ne: 'lost' } });
  let updated = 0;

  for (const lead of leads) {
    const score = calculateLeadScore(lead);
    if (score !== lead.aiScore) {
      lead.aiScore = score;
      await lead.save();
      updated++;
    }
  }

  res.json({ updated, total: leads.length });
};

export const analyticsQuery = async (req, res) => {
  const { question } = req.body;
  const builderId = req.user.builder._id || req.user.builder;

  const stats = await Lead.aggregate([
    { $match: { builder: builderId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$aiScore' },
      },
    },
  ]);

  const answer = await naturalLanguageAnalytics(question, JSON.stringify(stats));
  res.json({ answer, data: stats });
};

export const marketIntelligence = async (req, res) => {
  const { city, bhk } = req.query;
  const insight = await analyzeMarket(city || 'Patna', bhk || '2BHK');
  res.json({ insight });
};

export const getPriceRecommendation = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  const competitors = await Competitor.find({ builder: req.user.builder._id || req.user.builder });
  const recommendation = await priceRecommendation(project, competitors);
  res.json({ recommendation });
};

export const leadHunter = async (req, res) => {
  const { city, budget, count } = req.body;
  const campaign = await generateCampaignSuggestion(
    `Need ${count || 100} leads in ${city}, budget ${budget}`
  );
  res.json({ campaign });
};

export const generateContent = async (req, res) => {
  const { platform, topic } = req.body;
  const content = await generateMarketingContent(platform, topic);
  res.json({ content });
};

export const planSiteVisits = async (req, res) => {
  const { leadId } = req.body;
  const lead = await Lead.findById(leadId);
  const projects = await Project.find({
    builder: req.user.builder._id || req.user.builder,
    city: lead?.preferredLocation?.split('-')[0]?.trim(),
  }).limit(3);

  res.json({
    suggestion: `Schedule visits for ${lead?.name} at: ${projects.map((p) => p.name).join(', ') || 'nearest available projects'}`,
    projects,
  });
};
