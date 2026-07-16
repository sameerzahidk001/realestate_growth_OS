import prisma from '../lib/prisma.js';
import { generateCampaignSuggestion, generateMarketingContent } from '../services/aiService.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

export const getLandingPages = async (req, res) => {
  const pages = await prisma.landingPage.findMany({ where: { builderId: getBuilderId(req.user) } });
  res.json(formatId(pages));
};

export const createLandingPage = async (req, res) => {
  const slug = req.body.slug || req.body.title.toLowerCase().replace(/\s+/g, '-');
  const page = await prisma.landingPage.create({
    data: {
      builderId: getBuilderId(req.user),
      projectId: req.body.project,
      title: req.body.title,
      slug,
      blocks: req.body.blocks,
      isPublished: req.body.isPublished,
      theme: req.body.theme,
    },
  });
  res.status(201).json(formatId(page));
};

export const updateLandingPage = async (req, res) => {
  const result = await prisma.landingPage.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: req.body,
  });
  if (!result.count) return res.status(404).json({ message: 'Page not found' });
  const page = await prisma.landingPage.findUnique({ where: { id: req.params.id } });
  res.json(formatId(page));
};

export const getPublicLandingPage = async (req, res) => {
  const page = await prisma.landingPage.findFirst({
    where: { slug: req.params.slug, isPublished: true },
    include: { project: { select: { id: true, name: true, location: true, amenities: true } } },
  });
  if (!page) return res.status(404).json({ message: 'Page not found' });
  res.json(formatId(page));
};

export const captureLeadFromLanding = async (req, res) => {
  const page = await prisma.landingPage.findFirst({ where: { slug: req.params.slug } });
  if (!page) return res.status(404).json({ message: 'Page not found' });

  const lead = await prisma.lead.create({
    data: {
      builderId: page.builderId,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      source: 'landing_page',
      projectId: page.projectId,
      status: 'new',
    },
  });

  await prisma.landingPage.update({
    where: { id: page.id },
    data: { leadsCaptured: { increment: 1 } },
  });

  res.status(201).json({ message: 'Thank you! We will contact you soon.', leadId: lead.id });
};

export const getCampaigns = async (req, res) => {
  const campaigns = await prisma.campaign.findMany({ where: { builderId: getBuilderId(req.user) } });
  res.json(formatId(campaigns));
};

export const createCampaign = async (req, res) => {
  const campaign = await prisma.campaign.create({
    data: { builderId: getBuilderId(req.user), ...req.body, budget: req.body.budget ? Number(req.body.budget) : null },
  });
  res.status(201).json(formatId(campaign));
};

export const aiCampaignSuggestion = async (req, res) => {
  const suggestions = await generateCampaignSuggestion(req.body.description);
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
    const lead = await prisma.lead.create({
      data: {
        builderId: getBuilderId(req.user),
        name: item.name,
        phone: item.phone,
        email: item.email,
        source: sourceMap[portal] || portal,
        status: 'new',
        notes: item.notes,
      },
    });
    created.push(formatId(lead));
  }

  res.status(201).json({ imported: created.length, leads: created });
};

export const getMarketingCampaigns = async (req, res) => {
  const campaigns = await prisma.marketingCampaign.findMany({ where: { builderId: getBuilderId(req.user) } });
  res.json(formatId(campaigns));
};

export const createMarketingCampaign = async (req, res) => {
  let content = req.body.content;
  if (req.body.generateWithAi) {
    const generated = await generateMarketingContent(req.body.channels?.[0] || 'email', req.body.name);
    content = { body: generated, aiGenerated: true };
  }

  const campaign = await prisma.marketingCampaign.create({
    data: {
      builderId: getBuilderId(req.user),
      name: req.body.name,
      type: req.body.type,
      channels: req.body.channels || [],
      segment: req.body.segment,
      content,
      schedule: req.body.schedule,
      status: req.body.status || 'draft',
    },
  });
  res.status(201).json(formatId(campaign));
};

export const getCompetitors = async (req, res) => {
  const competitors = await prisma.competitor.findMany({ where: { builderId: getBuilderId(req.user) } });
  res.json(formatId(competitors));
};

export const trackCompetitor = async (req, res) => {
  const competitor = await prisma.competitor.create({
    data: {
      builderId: getBuilderId(req.user),
      name: req.body.name,
      location: req.body.location,
      projectName: req.body.projectName,
      priceMin: req.body.priceRange?.min,
      priceMax: req.body.priceRange?.max,
      offers: req.body.offers || [],
      lastTrackedAt: new Date(),
    },
  });
  res.status(201).json(formatId(competitor));
};

export const submitPilotFeedback = async (req, res) => {
  const feedback = await prisma.pilotFeedback.create({
    data: {
      builderId: getBuilderId(req.user),
      submittedById: getUserId(req.user),
      week: req.body.week,
      rating: req.body.rating,
      featuresUsed: req.body.featuresUsed || [],
      featuresNotUsed: req.body.featuresNotUsed || [],
      missedFollowUpCause: req.body.missedFollowUpCause,
      painPoints: req.body.painPoints || [],
      suggestions: req.body.suggestions,
      wouldRecommend: req.body.wouldRecommend,
    },
  });
  res.status(201).json(formatId(feedback));
};

export const getPilotFeedback = async (req, res) => {
  const feedback = await prisma.pilotFeedback.findMany({
    where: { builderId: getBuilderId(req.user) },
    include: { submittedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(formatId(feedback));
};

export const logUsage = async (req, res) => {
  await prisma.usageLog.create({
    data: {
      builderId: getBuilderId(req.user),
      userId: getUserId(req.user),
      feature: req.body.feature,
      action: req.body.action,
      metadata: req.body.metadata,
    },
  });
  res.json({ success: true });
};

export const getUsageStats = async (req, res) => {
  const logs = await prisma.usageLog.groupBy({
    by: ['feature'],
    where: { builderId: getBuilderId(req.user) },
    _count: { _all: true },
  });
  res.json(logs.map((l) => ({ _id: l.feature, count: l._count._all })));
};
