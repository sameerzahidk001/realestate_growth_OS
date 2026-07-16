import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma.js';
import { calculateLeadScore, qualifyLead } from '../services/aiService.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

const leadInclude = {
  assignedTo: { select: { id: true, name: true, email: true, phone: true } },
  project: { select: { id: true, name: true, location: true } },
  unit: { select: { id: true, unitNumber: true, type: true, price: true } },
  activities: { orderBy: { createdAt: 'asc' } },
};

const buildLeadWhere = (user, query = {}) => {
  const where = { builderId: getBuilderId(user) };

  if (user.role === 'sales_executive') {
    where.assignedToId = getUserId(user);
  } else if (query.assignedTo) {
    where.assignedToId = query.assignedTo;
  }

  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
};

const formatLead = (lead) => formatId(lead);

export const getLeads = async (req, res) => {
  const leads = await prisma.lead.findMany({
    where: buildLeadWhere(req.user, req.query),
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, location: true } },
    },
    orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(formatLead(leads));
};

export const getLead = async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, ...buildLeadWhere(req.user) },
    include: leadInclude,
  });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  res.json(formatLead(lead));
};

export const createLead = async (req, res) => {
  const builderId = getBuilderId(req.user);
  const assignedToId = req.body.assignedTo || (req.user.role === 'sales_executive' ? getUserId(req.user) : null);

  const lead = await prisma.lead.create({
    data: {
      builderId,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      source: req.body.source || 'manual',
      status: 'new',
      assignedToId,
      projectId: req.body.project,
      notes: req.body.notes,
      budgetMin: req.body.budget?.min,
      budgetMax: req.body.budget?.max,
      bhkPreference: req.body.bhkPreference,
      timeline: req.body.timeline,
    },
  });

  const aiScore = calculateLeadScore(formatLead(lead));
  await prisma.leadActivity.create({
    data: { leadId: lead.id, type: 'note', description: 'Lead created', createdById: getUserId(req.user) },
  });

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { aiScore },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.status(201).json(formatLead(updated));
};

export const updateLead = async (req, res) => {
  const where = { id: req.params.id, builderId: getBuilderId(req.user) };
  if (req.user.role === 'sales_executive') where.assignedToId = getUserId(req.user);

  const existing = await prisma.lead.findFirst({ where });
  if (!existing) return res.status(404).json({ message: 'Lead not found' });

  if (req.body.status && req.body.status !== existing.status) {
    await prisma.leadActivity.create({
      data: {
        leadId: existing.id,
        type: 'status_change',
        description: `Status changed from ${existing.status} to ${req.body.status}`,
        oldValue: existing.status,
        newValue: req.body.status,
        createdById: getUserId(req.user),
      },
    });
  }

  const data = { ...req.body };
  delete data.budget;
  if (req.body.budget) {
    data.budgetMin = req.body.budget.min;
    data.budgetMax = req.body.budget.max;
  }
  if (req.body.assignedTo) data.assignedToId = req.body.assignedTo;
  if (req.body.project) data.projectId = req.body.project;
  if (req.body.unit) data.unitId = req.body.unit;

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: { ...data, aiScore: calculateLeadScore({ ...existing, ...req.body }) },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(formatLead(lead));
};

export const updateLeadStatus = async (req, res) => {
  const { status } = req.body;
  const where = { id: req.params.id, builderId: getBuilderId(req.user) };
  if (req.user.role === 'sales_executive') where.assignedToId = getUserId(req.user);

  const existing = await prisma.lead.findFirst({ where });
  if (!existing) return res.status(404).json({ message: 'Lead not found' });

  await prisma.leadActivity.create({
    data: {
      leadId: existing.id,
      type: 'status_change',
      description: `Pipeline: ${existing.status} → ${status}`,
      oldValue: existing.status,
      newValue: status,
      createdById: getUserId(req.user),
    },
  });

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: { status, aiScore: calculateLeadScore({ ...existing, status }) },
    include: { assignedTo: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  });

  res.json(formatLead(lead));
};

export const assignLead = async (req, res) => {
  const { assignedTo } = req.body;
  const lead = await prisma.lead.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: { assignedToId: assignedTo },
  });
  if (!lead.count) return res.status(404).json({ message: 'Lead not found' });

  const updated = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: updated.id,
      type: 'assignment',
      description: `Assigned to ${updated.assignedTo?.name}`,
      createdById: getUserId(req.user),
    },
  });

  res.json(formatLead(updated));
};

export const addLeadNote = async (req, res) => {
  const { note, type = 'note' } = req.body;
  const where = { id: req.params.id, builderId: getBuilderId(req.user) };
  if (req.user.role === 'sales_executive') where.assignedToId = getUserId(req.user);

  const lead = await prisma.lead.findFirst({ where, include: leadInclude });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  await prisma.leadActivity.create({
    data: { leadId: lead.id, type, description: note, createdById: getUserId(req.user) },
  });

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { lastContactedAt: new Date() },
    include: leadInclude,
  });

  res.json(formatLead(updated));
};

export const importLeads = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const records = parse(req.file.buffer.toString(), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const created = [];
  for (const row of records) {
    const lead = await prisma.lead.create({
      data: {
        builderId: getBuilderId(req.user),
        name: row.name || row.Name,
        phone: row.phone || row.Phone,
        email: row.email || row.Email,
        source: (row.source || row.Source || 'manual').toLowerCase().replace(/\s+/g, '_'),
        status: 'new',
        assignedToId: req.body.assignedTo || getUserId(req.user),
        notes: row.notes || row.Notes,
        aiScore: 20,
      },
    });
    created.push(formatLead(lead));
  }

  res.status(201).json({ imported: created.length, leads: created });
};

export const getPipeline = async (req, res) => {
  const where = buildLeadWhere(req.user);
  const stages = ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'];
  const pipeline = {};

  for (const stage of stages) {
    const leads = await prisma.lead.findMany({
      where: { ...where, status: stage },
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ aiScore: 'desc' }, { updatedAt: 'desc' }],
    });
    pipeline[stage] = formatLead(leads);
  }

  res.json(pipeline);
};

export const aiQualifyLead = async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    include: leadInclude,
  });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const qualification = await qualifyLead(formatLead(lead));
  let budgetMin = lead.budgetMin;
  let budgetMax = lead.budgetMax;

  if (qualification.budget?.min) {
    budgetMin = qualification.budget.min;
    budgetMax = qualification.budget.max;
  } else if (typeof qualification.budget === 'string') {
    const match = qualification.budget.match(/(\d+)[^\d]+(\d+)/);
    if (match) {
      budgetMin = parseInt(match[1], 10) * 100000;
      budgetMax = parseInt(match[2], 10) * 100000;
    }
  }

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      aiQualificationData: qualification,
      aiQualified: true,
      budgetMin,
      budgetMax,
      preferredLocation: qualification.location || lead.preferredLocation,
      loanRequired: qualification.loanRequired ?? lead.loanRequired,
      familySize: qualification.familySize || lead.familySize,
      timeline: qualification.timeline || lead.timeline,
      bhkPreference: qualification.bhkPreference || lead.bhkPreference,
      aiScore: calculateLeadScore({ ...formatLead(lead), ...qualification, budget: { min: budgetMin, max: budgetMax } }),
    },
    include: leadInclude,
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'ai_qualification',
      description: qualification.summary || 'AI qualification completed',
      createdById: getUserId(req.user),
      metadata: qualification,
    },
  });

  res.json({ lead: formatLead(updated), qualification });
};
