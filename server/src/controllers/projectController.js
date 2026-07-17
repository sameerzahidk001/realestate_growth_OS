import { getSql } from '../lib/neonSql.js';
import { cuid } from '../lib/neonLeadHelpers.js';
import { formatId, getBuilderId } from '../utils/apiFormat.js';

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const mapProject = (row) => {
  let priceList = row.priceList;
  if (typeof priceList === 'string') {
    try {
      priceList = JSON.parse(priceList);
    } catch {
      priceList = null;
    }
  }
  return formatId({
    ...row,
    id: row.id,
    _id: row.id,
    amenities: asArray(row.amenities),
    priceList,
  });
};

const mapUnit = (row) =>
  formatId({
    id: row.id,
    _id: row.id,
    projectId: row.projectId,
    builderId: row.builderId,
    unitNumber: row.unitNumber,
    type: row.type,
    floor: row.floor,
    area: row.area,
    price: row.price,
    facing: row.facing,
    status: row.status,
    createdAt: row.createdAt,
    project: row.project_id
      ? { id: row.project_id, _id: row.project_id, name: row.project_name, location: row.project_location }
      : undefined,
  });

export const getProjects = async (req, res) => {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM "Project"
      WHERE "builderId" = ${getBuilderId(req.user)} AND "isActive" = true
      ORDER BY "createdAt" DESC
    `;
    res.json(rows.map(mapProject));
  } catch (err) {
    console.error('getProjects:', err);
    res.status(500).json({ message: err.message || 'Failed to load projects' });
  }
};

export const getProject = async (req, res) => {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM "Project"
      WHERE id = ${req.params.id} AND "builderId" = ${getBuilderId(req.user)}
      LIMIT 1
    `;
    if (!rows.length) return res.status(404).json({ message: 'Project not found' });
    res.json(mapProject(rows[0]));
  } catch (err) {
    console.error('getProject:', err);
    res.status(500).json({ message: err.message || 'Failed to load project' });
  }
};

export const createProject = async (req, res) => {
  try {
    const sql = getSql();
    const id = cuid();
    const now = new Date();
    const amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [];

    await sql`
      INSERT INTO "Project" (
        id, "builderId", name, location, city, "totalUnits", description, amenities,
        "priceList", brochure, images, status, "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${getBuilderId(req.user)}, ${req.body.name}, ${req.body.location},
        ${req.body.city || null}, ${Number(req.body.totalUnits) || 0}, ${req.body.description || null},
        ${amenities}, ${req.body.priceList ? JSON.stringify(req.body.priceList) : null},
        ${req.body.brochure || null}, ${[]},
        ${req.body.status || 'under_construction'}, true, ${now}, ${now}
      )
    `;

    const rows = await sql`SELECT * FROM "Project" WHERE id = ${id} LIMIT 1`;
    res.status(201).json(mapProject(rows[0]));
  } catch (err) {
    console.error('createProject:', err);
    res.status(500).json({ message: err.message || 'Failed to create project' });
  }
};

export const updateProject = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();

    const existing = await sql`
      SELECT id FROM "Project" WHERE id = ${req.params.id} AND "builderId" = ${builderId} LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Project not found' });

    const amenities = Array.isArray(req.body.amenities)
      ? req.body.amenities
      : typeof req.body.amenities === 'string'
        ? req.body.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : null;
    const totalUnits = req.body.totalUnits != null && req.body.totalUnits !== ''
      ? Number(req.body.totalUnits)
      : null;

    await sql`
      UPDATE "Project"
      SET
        name = COALESCE(${req.body.name ?? null}, name),
        location = COALESCE(${req.body.location ?? null}, location),
        city = COALESCE(${req.body.city ?? null}, city),
        "totalUnits" = COALESCE(${totalUnits}, "totalUnits"),
        description = COALESCE(${req.body.description ?? null}, description),
        status = COALESCE(${req.body.status ?? null}, status),
        amenities = COALESCE(${amenities}, amenities),
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    const rows = await sql`SELECT * FROM "Project" WHERE id = ${req.params.id} LIMIT 1`;
    res.json(mapProject(rows[0]));
  } catch (err) {
    console.error('updateProject:', err);
    res.status(500).json({ message: err.message || 'Failed to update project' });
  }
};

export const getUnits = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const projectId = req.params.projectId;
    const status = req.query.status;

    const rows = await sql`
      SELECT
        u.*,
        p.id AS project_id, p.name AS project_name, p.location AS project_location
      FROM "Unit" u
      LEFT JOIN "Project" p ON p.id = u."projectId"
      WHERE u."builderId" = ${builderId}
      ${projectId ? sql`AND u."projectId" = ${projectId}` : sql``}
      ${status ? sql`AND u.status = ${status}` : sql``}
      ORDER BY u."unitNumber" ASC
    `;
    res.json(rows.map(mapUnit));
  } catch (err) {
    console.error('getUnits:', err);
    res.status(500).json({ message: err.message || 'Failed to load units' });
  }
};

export const createUnit = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const projectId = req.body.project || req.params.projectId;
    const id = cuid();
    const now = new Date();

    await sql`
      INSERT INTO "Unit" (
        id, "projectId", "builderId", "unitNumber", type, floor, area, price, facing, status, "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${projectId}, ${builderId}, ${req.body.unitNumber}, ${req.body.type},
        ${req.body.floor ?? null}, ${req.body.area || null}, ${Number(req.body.price)},
        ${req.body.facing || null}, ${req.body.status || 'available'}, ${now}, ${now}
      )
    `;

    await sql`
      UPDATE "Project"
      SET "totalUnits" = "totalUnits" + 1, "updatedAt" = ${now}
      WHERE id = ${projectId}
    `;

    const rows = await sql`
      SELECT u.*, p.id AS project_id, p.name AS project_name, p.location AS project_location
      FROM "Unit" u
      LEFT JOIN "Project" p ON p.id = u."projectId"
      WHERE u.id = ${id}
      LIMIT 1
    `;
    res.status(201).json(mapUnit(rows[0]));
  } catch (err) {
    console.error('createUnit:', err);
    res.status(500).json({ message: err.message || 'Failed to create unit' });
  }
};

export const updateUnit = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();

    const existing = await sql`
      SELECT id FROM "Unit" WHERE id = ${req.params.id} AND "builderId" = ${builderId} LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Unit not found' });

    await sql`
      UPDATE "Unit"
      SET
        "unitNumber" = COALESCE(${req.body.unitNumber ?? null}, "unitNumber"),
        type = COALESCE(${req.body.type ?? null}, type),
        floor = COALESCE(${req.body.floor ?? null}, floor),
        area = COALESCE(${req.body.area ?? null}, area),
        price = COALESCE(${req.body.price ?? null}, price),
        status = COALESCE(${req.body.status ?? null}, status),
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    const rows = await sql`
      SELECT u.*, p.id AS project_id, p.name AS project_name, p.location AS project_location
      FROM "Unit" u
      LEFT JOIN "Project" p ON p.id = u."projectId"
      WHERE u.id = ${req.params.id}
      LIMIT 1
    `;
    res.json(mapUnit(rows[0]));
  } catch (err) {
    console.error('updateUnit:', err);
    res.status(500).json({ message: err.message || 'Failed to update unit' });
  }
};

export const linkUnitToLead = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const { leadId } = req.body;
    const now = new Date();

    const existing = await sql`
      SELECT id FROM "Unit" WHERE id = ${req.params.id} AND "builderId" = ${builderId} LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Unit not found' });

    await sql`
      UPDATE "Unit"
      SET "linkedLeadId" = ${leadId}, status = 'held', "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;

    const rows = await sql`
      SELECT u.*, p.id AS project_id, p.name AS project_name, p.location AS project_location
      FROM "Unit" u
      LEFT JOIN "Project" p ON p.id = u."projectId"
      WHERE u.id = ${req.params.id}
      LIMIT 1
    `;
    res.json(mapUnit(rows[0]));
  } catch (err) {
    console.error('linkUnitToLead:', err);
    res.status(500).json({ message: err.message || 'Failed to link unit' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();
    const existing = await sql`
      SELECT id FROM "Project"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existing.length) return res.status(404).json({ message: 'Project not found' });

    await sql`
      UPDATE "Project"
      SET "isActive" = false, "updatedAt" = ${now}
      WHERE id = ${req.params.id}
    `;
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('deleteProject:', err);
    res.status(500).json({ message: err.message || 'Failed to delete project' });
  }
};

export const deleteUnit = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const now = new Date();
    const existingRows = await sql`
      SELECT id, "projectId"
      FROM "Unit"
      WHERE id = ${req.params.id} AND "builderId" = ${builderId}
      LIMIT 1
    `;
    if (!existingRows.length) return res.status(404).json({ message: 'Unit not found' });

    const unit = existingRows[0];
    await sql`DELETE FROM "Unit" WHERE id = ${unit.id} AND "builderId" = ${builderId}`;
    await sql`
      UPDATE "Project"
      SET "totalUnits" = GREATEST("totalUnits" - 1, 0), "updatedAt" = ${now}
      WHERE id = ${unit.projectId}
    `;

    res.json({ message: 'Unit deleted' });
  } catch (err) {
    console.error('deleteUnit:', err);
    res.status(500).json({ message: err.message || 'Failed to delete unit' });
  }
};
