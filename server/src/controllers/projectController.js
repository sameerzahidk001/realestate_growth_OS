import Project from '../models/Project.js';
import Unit from '../models/Unit.js';

export const getProjects = async (req, res) => {
  const projects = await Project.find({ builder: req.user.builder._id || req.user.builder, isActive: true });
  res.json(projects);
};

export const getProject = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    builder: req.user.builder._id || req.user.builder,
  });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
};

export const createProject = async (req, res) => {
  const project = await Project.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
  });
  res.status(201).json(project);
};

export const updateProject = async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    req.body,
    { new: true }
  );
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
};

export const getUnits = async (req, res) => {
  const filter = { builder: req.user.builder._id || req.user.builder };
  if (req.params.projectId) filter.project = req.params.projectId;
  if (req.query.status) filter.status = req.query.status;

  const units = await Unit.find(filter).populate('project', 'name location').sort({ unitNumber: 1 });
  res.json(units);
};

export const createUnit = async (req, res) => {
  const unit = await Unit.create({
    ...req.body,
    builder: req.user.builder._id || req.user.builder,
  });

  await Project.findByIdAndUpdate(req.body.project, { $inc: { totalUnits: 1 } });
  res.status(201).json(unit);
};

export const updateUnit = async (req, res) => {
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    req.body,
    { new: true }
  );
  if (!unit) return res.status(404).json({ message: 'Unit not found' });
  res.json(unit);
};

export const linkUnitToLead = async (req, res) => {
  const { leadId } = req.body;
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, builder: req.user.builder._id || req.user.builder },
    { linkedLead: leadId, status: 'held' },
    { new: true }
  );
  if (!unit) return res.status(404).json({ message: 'Unit not found' });
  res.json(unit);
};
