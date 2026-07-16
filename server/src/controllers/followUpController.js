import FollowUp from '../models/FollowUp.js';
import Lead from '../models/Lead.js';

export const getFollowUps = async (req, res) => {
  const filter = { builder: req.user.builder._id || req.user.builder };
  if (req.user.role === 'sales_executive') filter.assignedTo = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const followUps = await FollowUp.find(filter)
    .populate('lead', 'name phone status aiScore')
    .populate('assignedTo', 'name')
    .sort({ scheduledAt: 1 });

  res.json(followUps);
};

export const getDueFollowUps = async (req, res) => {
  const filter = {
    builder: req.user.builder._id || req.user.builder,
    status: 'pending',
    scheduledAt: { $lte: new Date() },
  };
  if (req.user.role === 'sales_executive') filter.assignedTo = req.user._id;

  const due = await FollowUp.find(filter)
    .populate('lead', 'name phone status aiScore')
    .sort({ scheduledAt: 1 });

  res.json(due);
};

export const createFollowUp = async (req, res) => {
  const followUp = await FollowUp.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
    assignedTo: req.body.assignedTo || req.user._id,
  });

  if (req.body.lead) {
    await Lead.findByIdAndUpdate(req.body.lead, { nextFollowUpAt: req.body.scheduledAt });
  }

  const populated = await FollowUp.findById(followUp._id).populate('lead', 'name phone');
  res.status(201).json(populated);
};

export const completeFollowUp = async (req, res) => {
  const { summary, notes } = req.body;
  const followUp = await FollowUp.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    { status: 'completed', completedAt: new Date(), summary, notes },
    { new: true }
  ).populate('lead', 'name');

  if (!followUp) return res.status(404).json({ message: 'Follow-up not found' });

  if (followUp.lead) {
    const lead = await Lead.findById(followUp.lead._id);
    lead.lastContactedAt = new Date();
    lead.activities.push({
      type: 'follow_up',
      description: summary || notes || 'Follow-up completed',
      createdBy: req.user._id,
    });
    await lead.save();
  }

  res.json(followUp);
};
