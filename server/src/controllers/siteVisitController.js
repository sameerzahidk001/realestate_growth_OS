import SiteVisit from '../models/SiteVisit.js';
import Lead from '../models/Lead.js';

export const getSiteVisits = async (req, res) => {
  const filter = { builder: req.user.builder._id || req.user.builder };
  if (req.user.role === 'sales_executive') filter.assignedTo = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const visits = await SiteVisit.find(filter)
    .populate('lead', 'name phone')
    .populate('project', 'name location')
    .populate('assignedTo', 'name')
    .sort({ scheduledAt: -1 });

  res.json(visits);
};

export const createSiteVisit = async (req, res) => {
  const visit = await SiteVisit.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
    assignedTo: req.body.assignedTo || req.user._id,
  });

  await Lead.findByIdAndUpdate(req.body.lead, {
    status: 'interested',
    lastContactedAt: new Date(),
  });

  const populated = await SiteVisit.findById(visit._id)
    .populate('lead', 'name phone')
    .populate('project', 'name');

  res.status(201).json(populated);
};

export const updateSiteVisit = async (req, res) => {
  const visit = await SiteVisit.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    req.body,
    { new: true }
  )
    .populate('lead', 'name')
    .populate('project', 'name');

  if (!visit) return res.status(404).json({ message: 'Site visit not found' });

  if (req.body.status === 'completed' && visit.lead) {
    await Lead.findByIdAndUpdate(visit.lead._id, { status: 'site_visit_done' });
  }

  res.json(visit);
};
