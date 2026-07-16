import prisma from '../lib/prisma.js';
import { formatId, getBuilderId } from '../utils/apiFormat.js';

export const getProjects = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { builderId: getBuilderId(req.user), isActive: true },
  });
  res.json(formatId(projects));
};

export const getProject = async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
  });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(formatId(project));
};

export const createProject = async (req, res) => {
  const project = await prisma.project.create({
    data: {
      builderId: getBuilderId(req.user),
      name: req.body.name,
      location: req.body.location,
      city: req.body.city,
      totalUnits: Number(req.body.totalUnits) || 0,
      description: req.body.description,
      amenities: req.body.amenities || [],
      priceList: req.body.priceList,
      brochure: req.body.brochure,
      status: req.body.status,
    },
  });
  res.status(201).json(formatId(project));
};

export const updateProject = async (req, res) => {
  const result = await prisma.project.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: req.body,
  });
  if (!result.count) return res.status(404).json({ message: 'Project not found' });
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  res.json(formatId(project));
};

export const getUnits = async (req, res) => {
  const where = { builderId: getBuilderId(req.user) };
  if (req.params.projectId) where.projectId = req.params.projectId;
  if (req.query.status) where.status = req.query.status;

  const units = await prisma.unit.findMany({
    where,
    include: { project: { select: { id: true, name: true, location: true } } },
    orderBy: { unitNumber: 'asc' },
  });
  res.json(formatId(units));
};

export const createUnit = async (req, res) => {
  const unit = await prisma.unit.create({
    data: {
      projectId: req.body.project || req.params.projectId,
      builderId: getBuilderId(req.user),
      unitNumber: req.body.unitNumber,
      type: req.body.type,
      floor: req.body.floor,
      area: req.body.area,
      price: Number(req.body.price),
      facing: req.body.facing,
      status: req.body.status || 'available',
    },
  });

  await prisma.project.update({
    where: { id: unit.projectId },
    data: { totalUnits: { increment: 1 } },
  });

  res.status(201).json(formatId(unit));
};

export const updateUnit = async (req, res) => {
  const result = await prisma.unit.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: req.body,
  });
  if (!result.count) return res.status(404).json({ message: 'Unit not found' });
  const unit = await prisma.unit.findUnique({ where: { id: req.params.id } });
  res.json(formatId(unit));
};

export const linkUnitToLead = async (req, res) => {
  const { leadId } = req.body;
  const result = await prisma.unit.updateMany({
    where: { id: req.params.id, builderId: getBuilderId(req.user) },
    data: { linkedLeadId: leadId, status: 'held' },
  });
  if (!result.count) return res.status(404).json({ message: 'Unit not found' });
  const unit = await prisma.unit.findUnique({ where: { id: req.params.id } });
  res.json(formatId(unit));
};
