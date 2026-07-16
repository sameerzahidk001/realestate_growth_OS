import { parse } from 'csv-parse/sync';
import Lead from '../models/Lead.js';
import { calculateLeadScore, qualifyLead } from '../services/aiService.js';

const buildLeadFilter = (user, query = {}) => {
  const filter = { builder: user.builder._id || user.builder };

  if (user.role === 'sales_executive') {
    filter.assignedTo = user._id;
  } else if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
};

export const getLeads = async (req, res) => {
  const filter = buildLeadFilter(req.user, req.query);
  const leads = await Lead.find(filter)
    .populate('assignedTo', 'name email')
    .populate('project', 'name location')
    .sort({ aiScore: -1, createdAt: -1 });
  res.json(leads);
};

export const getLead = async (req, res) => {
  const filter = { _id: req.params.id, ...buildLeadFilter(req.user) };
  const lead = await Lead.findOne(filter)
    .populate('assignedTo', 'name email phone')
    .populate('project', 'name location')
    .populate('unit', 'unitNumber type price');

  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  res.json(lead);
};

export const createLead = async (req, res) => {
  const data = { ...req.body, builder: req.user.builder._id || req.user.builder };

  if (!data.assignedTo && req.user.role === 'sales_executive') {
    data.assignedTo = req.user._id;
  }

  const lead = await Lead.create(data);
  lead.aiScore = calculateLeadScore(lead);
  lead.activities.push({
    type: 'note',
    description: 'Lead created',
    createdBy: req.user._id,
  });
  await lead.save();

  const populated = await Lead.findById(lead._id).populate('assignedTo', 'name');
  res.status(201).json(populated);
};

export const updateLead = async (req, res) => {
  const filter = { _id: req.params.id, builder: req.user.builder._id || req.user.builder };
  if (req.user.role === 'sales_executive') filter.assignedTo = req.user._id;

  const existing = await Lead.findOne(filter);
  if (!existing) return res.status(404).json({ message: 'Lead not found' });

  if (req.body.status && req.body.status !== existing.status) {
    existing.activities.push({
      type: 'status_change',
      description: `Status changed from ${existing.status} to ${req.body.status}`,
      oldValue: existing.status,
      newValue: req.body.status,
      createdBy: req.user._id,
    });
  }

  Object.assign(existing, req.body);
  existing.aiScore = calculateLeadScore(existing);
  await existing.save();

  const lead = await Lead.findById(existing._id).populate('assignedTo', 'name');
  res.json(lead);
};

export const updateLeadStatus = async (req, res) => {
  const { status } = req.body;
  const filter = { _id: req.params.id, builder: req.user.builder._id || req.user.builder };
  if (req.user.role === 'sales_executive') filter.assignedTo = req.user._id;

  const lead = await Lead.findOne(filter);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  lead.activities.push({
    type: 'status_change',
    description: `Pipeline: ${lead.status} → ${status}`,
    oldValue: lead.status,
    newValue: status,
    createdBy: req.user._id,
  });
  lead.status = status;
  lead.aiScore = calculateLeadScore(lead);
  await lead.save();

  res.json(lead);
};

export const assignLead = async (req, res) => {
  const { assignedTo } = req.body;
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    { assignedTo },
    { new: true }
  ).populate('assignedTo', 'name');

  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  lead.activities.push({
    type: 'assignment',
    description: `Assigned to ${lead.assignedTo?.name}`,
    createdBy: req.user._id,
  });
  await lead.save();

  res.json(lead);
};

export const addLeadNote = async (req, res) => {
  const { note, type = 'note' } = req.body;
  const filter = { _id: req.params.id, builder: req.user.builder._id || req.user.builder };
  if (req.user.role === 'sales_executive') filter.assignedTo = req.user._id;

  const lead = await Lead.findOne(filter);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  lead.activities.push({
    type,
    description: note,
    createdBy: req.user._id,
  });
  lead.lastContactedAt = new Date();
  await lead.save();

  res.json(lead);
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
    const lead = await Lead.create({
      builder: req.user.builder._id || req.user.builder,
      name: row.name || row.Name,
      phone: row.phone || row.Phone,
      email: row.email || row.Email,
      source: (row.source || row.Source || 'manual').toLowerCase().replace(/\s+/g, '_'),
      status: 'new',
      assignedTo: req.body.assignedTo || req.user._id,
      notes: row.notes || row.Notes,
    });
    lead.aiScore = calculateLeadScore(lead);
    await lead.save();
    created.push(lead);
  }

  res.status(201).json({ imported: created.length, leads: created });
};

export const getPipeline = async (req, res) => {
  const filter = buildLeadFilter(req.user);
  const stages = ['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'];
  const pipeline = {};

  for (const stage of stages) {
    pipeline[stage] = await Lead.find({ ...filter, status: stage })
      .populate('assignedTo', 'name')
      .populate('project', 'name')
      .sort({ aiScore: -1, updatedAt: -1 });
  }

  res.json(pipeline);
};

export const aiQualifyLead = async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    builder: req.user.builder._id || req.user.builder,
  });

  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const qualification = await qualifyLead(lead);
  lead.aiQualificationData = qualification;
  lead.aiQualified = true;
  lead.budget = qualification.budget?.min
    ? { min: qualification.budget.min, max: qualification.budget.max }
    : lead.budget;
  if (typeof qualification.budget === 'string') {
    const match = qualification.budget.match(/(\d+)[^\d]+(\d+)/);
    if (match) lead.budget = { min: parseInt(match[1]) * 100000, max: parseInt(match[2]) * 100000 };
  }
  lead.preferredLocation = qualification.location || lead.preferredLocation;
  lead.loanRequired = qualification.loanRequired ?? lead.loanRequired;
  lead.familySize = qualification.familySize || lead.familySize;
  lead.timeline = qualification.timeline || lead.timeline;
  lead.bhkPreference = qualification.bhkPreference || lead.bhkPreference;
  lead.aiScore = calculateLeadScore(lead);
  lead.activities.push({
    type: 'ai_qualification',
    description: qualification.summary || 'AI qualification completed',
    createdBy: req.user._id,
    metadata: qualification,
  });
  await lead.save();

  res.json({ lead, qualification });
};
