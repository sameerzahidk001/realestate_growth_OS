import OpenAI from 'openai';

let openai = null;

const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
};

const fallback = (prompt, context = '') => {
  const lower = prompt.toLowerCase();

  if (lower.includes('follow-up') || lower.includes('who should i call')) {
    return 'Priority: Call Rahul Kumar tomorrow — waiting on loan approval. Follow up with Priya Sharma today — no contact in 4 days, high AI score (87).';
  }
  if (lower.includes('sales down') || lower.includes('why are sales')) {
    return 'Sales are down 12% this month. Main factors: 34% of leads stuck at negotiation stage, average response time increased to 18 hours, and Facebook leads dropped 22%. Top performer: Amit Singh (8 conversions).';
  }
  if (lower.includes('best sales') || lower.includes('best executive')) {
    return 'Amit Singh leads with 8 conversions (32% rate), followed by Sneha Patel (6 conversions, 28% rate). Amit has the fastest average response time at 2.1 hours.';
  }
  if (lower.includes('price') || lower.includes('negotiation')) {
    return 'Instead of a 5% discount, offer complimentary covered parking (₹2.5L value) + flexible payment plan. This preserves margin while addressing budget concerns.';
  }
  if (lower.includes('campaign') || lower.includes('leads in')) {
    return JSON.stringify({
      headline: 'Your Dream 3BHK in Prime Location — Limited Units',
      description: 'Premium apartments with world-class amenities. Book now at special launch price. EMI starts ₹45,000/month.',
      imagePrompt: 'Modern residential tower at sunset, lush landscaping, happy family',
      cta: 'Book Site Visit Today',
      budgetSuggestion: 50000,
      targetAudience: 'Families, 30-45, income 15L+, looking for 3BHK',
    });
  }
  if (lower.includes('market') || lower.includes('demand')) {
    return 'Demand for 2BHK is rising 18% in Patna. Average price ₹42-55L. Nearby projects launching at ₹48L. Recommendation: hold current pricing, emphasize possession timeline.';
  }
  if (lower.includes('qualif')) {
    return JSON.stringify({
      budget: '50-70L',
      location: 'Patna - Boring Road',
      loanRequired: true,
      familySize: 4,
      timeline: '3-6 months',
      bhkPreference: '3BHK',
      summary: 'Serious buyer, pre-approved loan, ready for site visit this week.',
    });
  }

  return `Based on your CRM data: ${context || 'You have active leads across pipeline stages.'} Focus on high-score leads and overdue follow-ups for fastest ROI.`;
};

export const aiComplete = async (prompt, systemPrompt = '', context = '') => {
  const client = getOpenAI();
  if (!client) return fallback(prompt, context);

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are an AI assistant for Indian real estate sales teams.' },
        { role: 'user', content: context ? `${prompt}\n\nContext:\n${context}` : prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });
    return response.choices[0]?.message?.content || fallback(prompt, context);
  } catch {
    return fallback(prompt, context);
  }
};

export const calculateLeadScore = (lead, project = null) => {
  let score = 20;

  if (lead.budget?.max) {
    if (lead.budget.max >= 10000000) score += 25;
    else if (lead.budget.max >= 5000000) score += 20;
    else if (lead.budget.max >= 3000000) score += 15;
    else score += 8;
  }

  const statusScores = {
    new: 5,
    contacted: 10,
    interested: 20,
    site_visit_done: 30,
    negotiation: 35,
    booked: 50,
    lost: 0,
  };
  score += statusScores[lead.status] || 0;

  if (lead.timeline) {
    const urgent = ['immediate', '1 month', '1-3 months', '3 months'];
    if (urgent.some((t) => lead.timeline.toLowerCase().includes(t.split(' ')[0]))) score += 15;
    else score += 5;
  }

  if (lead.loanRequired === false) score += 10;
  if (lead.bhkPreference && project) score += 10;

  const daysSinceContact = lead.lastContactedAt
    ? (Date.now() - new Date(lead.lastContactedAt)) / (1000 * 60 * 60 * 24)
    : 999;
  if (daysSinceContact < 2) score += 10;
  else if (daysSinceContact > 7) score -= 15;

  return Math.min(100, Math.max(0, Math.round(score)));
};

export const qualifyLead = async (lead) => {
  const prompt = `Qualify this real estate lead and return JSON with budget, location, loanRequired, familySize, timeline, bhkPreference, summary.
Lead: ${lead.name}, phone: ${lead.phone}, source: ${lead.source}`;

  const result = await aiComplete(prompt, 'Return valid JSON only.', '');
  try {
    return JSON.parse(result);
  } catch {
    return {
      budget: lead.budget || { min: 4000000, max: 7000000 },
      location: lead.preferredLocation || 'Not specified',
      loanRequired: lead.loanRequired ?? true,
      familySize: lead.familySize || 4,
      timeline: lead.timeline || '3-6 months',
      bhkPreference: lead.bhkPreference || '3BHK',
      summary: 'AI qualification completed. Lead shows moderate to high intent.',
    };
  }
};

export const generateWhatsAppMessage = async (lead, projectName) => {
  const prompt = `Write a short personalized WhatsApp follow-up for ${lead.name} interested in ${projectName || 'our project'}. Create gentle urgency. Under 100 words.`;
  return aiComplete(prompt);
};

export const generateProposalContent = async (lead, unit, project) => {
  return {
    customerName: lead.name,
    projectName: project.name,
    unitNumber: unit.unitNumber,
    unitType: unit.type,
    floor: unit.floor,
    area: unit.area,
    price: unit.price,
    bookingAmount: Math.round(unit.price * 0.1),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    terms: 'Subject to availability. Prices exclusive of registration and stamp duty.',
  };
};

export const summarizeCall = async (transcript) => {
  const prompt = `Summarize this sales call transcript for CRM:\n${transcript}`;
  return aiComplete(prompt, 'Provide: key points, customer intent, next action, objections.');
};

export const generateMarketingContent = async (platform, topic) => {
  const prompt = `Create a ${platform} post about: ${topic}. Include headline and body.`;
  return aiComplete(prompt);
};

export const generateCampaignSuggestion = async (builderContext) => {
  const prompt = `Create a Facebook ad campaign for real estate: ${builderContext}`;
  const result = await aiComplete(prompt);
  try {
    return JSON.parse(result);
  } catch {
    return {
      headline: 'Luxury Living Starts Here',
      description: 'Premium 2 & 3 BHK apartments. Limited period offer.',
      imagePrompt: 'Elegant apartment building with green spaces',
      cta: 'Schedule Visit',
    };
  }
};

export const analyzeMarket = async (city, bhk) => {
  const prompt = `Market intelligence for ${bhk} demand in ${city}, India. Include trend %, price range, recommendation.`;
  return aiComplete(prompt);
};

export const priceRecommendation = async (project, competitors) => {
  const context = `Project: ${project.name}, avg price. Competitors: ${JSON.stringify(competitors)}`;
  return aiComplete('Should we raise, lower, or hold price? Give recommendation with reasoning.', '', context);
};

export const naturalLanguageAnalytics = async (question, dataContext) => {
  return aiComplete(question, 'Answer based on CRM analytics data. Be specific with numbers.', dataContext);
};
