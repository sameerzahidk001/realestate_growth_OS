import { getSql } from '../lib/neonSql.js';
import { cuid } from '../lib/neonLeadHelpers.js';
import { formatId, getBuilderId, getUserId } from '../utils/apiFormat.js';

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const mapFeedback = (row) =>
  formatId({
    id: row.id,
    _id: row.id,
    builderId: row.builderId,
    week: row.week,
    rating: row.rating,
    featuresUsed: asArray(row.featuresUsed),
    featuresNotUsed: asArray(row.featuresNotUsed),
    missedFollowUpCause: row.missedFollowUpCause,
    painPoints: asArray(row.painPoints),
    suggestions: row.suggestions,
    wouldRecommend: row.wouldRecommend,
    createdAt: row.createdAt,
    submittedBy: row.submitter_id
      ? { id: row.submitter_id, _id: row.submitter_id, name: row.submitter_name }
      : undefined,
  });

export const submitPilotFeedback = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    if (!builderId) return res.status(403).json({ message: 'Company context required' });

    const id = cuid();
    const now = new Date();
    const featuresUsed = asArray(req.body.featuresUsed);
    const featuresNotUsed = asArray(req.body.featuresNotUsed);
    const painPoints = asArray(req.body.painPoints);
    const week = req.body.week != null && req.body.week !== '' ? Number(req.body.week) : null;
    const rating = req.body.rating != null && req.body.rating !== '' ? Number(req.body.rating) : null;

    if (rating != null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    await sql`
      INSERT INTO "PilotFeedback" (
        id, "builderId", "submittedById", week, rating,
        "featuresUsed", "featuresNotUsed", "missedFollowUpCause", "painPoints",
        suggestions, "wouldRecommend", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${builderId}, ${userId}, ${week}, ${rating},
        ${featuresUsed}, ${featuresNotUsed}, ${req.body.missedFollowUpCause || null}, ${painPoints},
        ${req.body.suggestions || null}, ${req.body.wouldRecommend ?? true}, ${now}, ${now}
      )
    `;

    // Also log usage
    await sql`
      INSERT INTO "UsageLog" (id, "builderId", "userId", feature, action, metadata, "createdAt")
      VALUES (
        ${cuid()}, ${builderId}, ${userId}, ${'pilot_feedback'}, ${'submit'},
        ${JSON.stringify({ week, rating })}::jsonb, ${now}
      )
    `;

    const rows = await sql`
      SELECT f.*, u.id AS submitter_id, u.name AS submitter_name
      FROM "PilotFeedback" f
      LEFT JOIN "User" u ON u.id = f."submittedById"
      WHERE f.id = ${id}
      LIMIT 1
    `;
    res.status(201).json(mapFeedback(rows[0]));
  } catch (err) {
    console.error('submitPilotFeedback:', err);
    res.status(500).json({ message: err.message || 'Failed to submit feedback' });
  }
};

export const getPilotFeedback = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    if (!builderId) return res.status(403).json({ message: 'Company context required' });

    const rows = await sql`
      SELECT f.*, u.id AS submitter_id, u.name AS submitter_name
      FROM "PilotFeedback" f
      LEFT JOIN "User" u ON u.id = f."submittedById"
      WHERE f."builderId" = ${builderId}
      ORDER BY f."createdAt" DESC
    `;
    res.json(rows.map(mapFeedback));
  } catch (err) {
    console.error('getPilotFeedback:', err);
    res.status(500).json({ message: err.message || 'Failed to load feedback' });
  }
};

export const logUsage = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    const userId = getUserId(req.user);
    if (!builderId) return res.status(403).json({ message: 'Company context required' });

    const feature = (req.body.feature || '').trim();
    if (!feature) return res.status(400).json({ message: 'Feature is required' });

    const now = new Date();
    await sql`
      INSERT INTO "UsageLog" (id, "builderId", "userId", feature, action, metadata, "createdAt")
      VALUES (
        ${cuid()}, ${builderId}, ${userId}, ${feature}, ${req.body.action || null},
        ${req.body.metadata ? JSON.stringify(req.body.metadata) : null}::jsonb, ${now}
      )
    `;
    res.json({ success: true });
  } catch (err) {
    console.error('logUsage:', err);
    res.status(500).json({ message: err.message || 'Failed to log usage' });
  }
};

export const getUsageStats = async (req, res) => {
  try {
    const sql = getSql();
    const builderId = getBuilderId(req.user);
    if (!builderId) return res.status(403).json({ message: 'Company context required' });

    const rows = await sql`
      SELECT feature AS _id, COUNT(*)::int AS count
      FROM "UsageLog"
      WHERE "builderId" = ${builderId}
      GROUP BY feature
      ORDER BY count DESC
    `;
    res.json(rows.map((r) => ({ _id: r._id, count: r.count })));
  } catch (err) {
    console.error('getUsageStats:', err);
    res.status(500).json({ message: err.message || 'Failed to load usage stats' });
  }
};
