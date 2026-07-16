import { LandingPage, Campaign, MarketingCampaign, Competitor } from '../models/Marketing.js';
import Lead from '../models/Lead.js';
import { generateCampaignSuggestion, generateMarketingContent } from '../services/aiService.js';
import { PilotFeedback, UsageLog } from '../models/Support.js';

export const getLandingPages = async (req, res) => {
  const pages = await LandingPage.find({ builder: req.user.builder._id || req.user.builder });
  res.json(pages);
};

export const createLandingPage = async (req, res) => {
  const slug = req.body.slug || req.body.title.toLowerCase().replace(/\s+/g, '-');
  const page = await LandingPage.create({
    ...req.body,
    slug,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(page);
};

export const updateLandingPage = async (req, res) => {
  const page = await LandingPage.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    req.body,
    { new: true }
  );
  res.json(page);
};

export const getPublicLandingPage = async (req, res) => {
  const page = await LandingPage.findOne({ slug: req.params.slug, isPublished: true })
    .populate('project', 'name location amenities');
  if (!page) return res.status(404).json({ message: 'Page not found' });
  res.json(page);
};

export const captureLeadFromLanding = async (req, res) => {
  const page = await LandingPage.findOne({ slug: req.params.slug });
  if (!page) return res.status(404).json({ message: 'Page not found' });

  const lead = await Lead.create({
    builder: page.builder,
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    source: 'landing_page',
    project: page.project,
    status: 'new',
  });

  page.leadsCaptured += 1;
  await page.save();

  res.status(201).json({ message: 'Thank you! We will contact you soon.', leadId: lead._id });
};

export const getCampaigns = async (req, res) => {
  const campaigns = await Campaign.find({ builder: req.user.builder._id || req.user.builder });
  res.json(campaigns);
};

export const createCampaign = async (req, res) => {
  const campaign = await Campaign.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(campaign);
};

export const aiCampaignSuggestion = async (req, res) => {
  const { description } = req.body;
  const suggestions = await generateCampaignSuggestion(description);
  res.json(suggestions);
};

export const importPortalLeads = async (req, res) => {
  const { portal, leads } = req.body;
  const sourceMap = {
    magicbricks: 'magicbricks',
    '99acres': '99acres',
    housing: 'housing',
    facebook: 'facebook',
    google: 'google',
    whatsapp: 'whatsapp',
  };

  const created = [];
  for (const item of leads) {
    const lead = await Lead.create({
      builder: req.user.builder._id || req.user.builder,
      name: item.name,
      phone: item.phone,
      email: item.email,
      source: sourceMap[portal] || portal,
      status: 'new',
      notes: item.notes,
    });
    created.push(lead);
  }

  res.status(201).json({ imported: created.length, leads: created });
};

export const getMarketingCampaigns = async (req, res) => {
  const campaigns = await MarketingCampaign.find({ builder: req.user.builder._id || req.user.builder });
  res.json(campaigns);
};

export const createMarketingCampaign = async (req, res) => {
  let content = req.body.content;
  if (req.body.generateWithAi) {
    const generated = await generateMarketingContent(
      req.body.channels?.[0] || 'email',
      req.body.name
    );
    content = { body: generated, aiGenerated: true };
  }

  const campaign = await MarketingCampaign.create({
    ...req.body,
    content,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(campaign);
};

export const getCompetitors = async (req, res) => {
  const competitors = await Competitor.find({ builder: req.user.builder._id || req.user.builder });
  res.json(competitors);
};

export const trackCompetitor = async (req, res) => {
  const competitor = await Competitor.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
    lastTrackedAt: new Date(),
  });
  res.status(201).json(competitor);
};

export const submitPilotFeedback = async (req, res) => {
  const feedback = await PilotFeedback.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
    submittedBy: req.user._id,
  });
  res.status(201).json(feedback);
};

export const getPilotFeedback = async (req, res) => {
  const feedback = await PilotFeedback.find({ builder: req.user.builder._id || req.user.builder })
    .populate('submittedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(feedback);
};

export const logUsage = async (req, res) => {
  await UsageLog.create({
    builder: req.user.builder._id || req.user.builder,
    user: req.user._id,
    feature: req.body.feature,
    action: req.body.action,
    metadata: req.body.metadata,
  });
  res.json({ success: true });
};

export const getUsageStats = async (req, res) => {
  const stats = await UsageLog.aggregate([
    { $match: { builder: req.user.builder._id || req.user.builder } },
    { $group: { _id: '$feature', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json(stats);
};
