import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { calculateLeadScore } from '../services/aiService.js';
import { connectDB } from '../config/db.js';

const seed = async () => {
  await connectDB();

  const existing = await prisma.builder.count();
  if (existing > 0) {
    console.log('Database already seeded — skipping.');
    process.exit(0);
  }

  console.log('Seeding database...');

  await prisma.leadActivity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.possession.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.builder.deleteMany();

  const builder = await prisma.builder.create({
    data: {
      name: 'Skyline Developers',
      email: 'owner@skyline.com',
      phone: '+91 9876543210',
      city: 'Patna',
      plan: 'pilot',
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'owner@skyline.com',
      password: await hashPassword('password123'),
      role: 'owner',
      builderId: builder.id,
      phone: '+91 9876543210',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'manager@skyline.com',
      password: await hashPassword('password123'),
      role: 'sales_manager',
      builderId: builder.id,
    },
  });

  const exec1 = await prisma.user.create({
    data: {
      name: 'Amit Singh',
      email: 'amit@skyline.com',
      password: await hashPassword('password123'),
      role: 'sales_executive',
      builderId: builder.id,
    },
  });

  const exec2 = await prisma.user.create({
    data: {
      name: 'Sneha Patel',
      email: 'sneha@skyline.com',
      password: await hashPassword('password123'),
      role: 'sales_executive',
      builderId: builder.id,
    },
  });

  const project1 = await prisma.project.create({
    data: {
      builderId: builder.id,
      name: 'Skyline Heights',
      location: 'Boring Road, Patna',
      city: 'Patna',
      totalUnits: 120,
      amenities: ['Swimming Pool', 'Gym', 'Club House', '24x7 Security', 'Power Backup'],
      priceList: [
        { bhkType: '2BHK', price: 4500000, area: '1050 sqft' },
        { bhkType: '3BHK', price: 6500000, area: '1450 sqft' },
      ],
      status: 'under_construction',
    },
  });

  await prisma.project.create({
    data: {
      builderId: builder.id,
      name: 'Green Valley Residency',
      location: 'Bailey Road, Patna',
      city: 'Patna',
      totalUnits: 80,
      amenities: ['Garden', 'Kids Play Area', 'Covered Parking'],
      status: 'ready',
    },
  });

  for (let i = 1; i <= 10; i++) {
    await prisma.unit.create({
      data: {
        projectId: project1.id,
        builderId: builder.id,
        unitNumber: `A-${100 + i}`,
        type: i % 2 === 0 ? '2BHK' : '3BHK',
        floor: Math.ceil(i / 2),
        area: i % 2 === 0 ? '1050 sqft' : '1450 sqft',
        price: i % 2 === 0 ? 4500000 : 6500000,
        status: i <= 3 ? 'sold' : i <= 5 ? 'held' : 'available',
      },
    });
  }

  const leadData = [
    { name: 'Rahul Kumar', phone: '9876500001', source: 'facebook', status: 'negotiation', assignedToId: exec1.id, budgetMin: 5000000, budgetMax: 7000000, bhkPreference: '3BHK', timeline: '1-3 months' },
    { name: 'Anita Verma', phone: '9876500002', source: 'walk_in', status: 'interested', assignedToId: exec2.id, budgetMin: 4000000, budgetMax: 5000000, bhkPreference: '2BHK' },
    { name: 'Vikram Singh', phone: '9876500003', source: 'referral', status: 'site_visit_done', assignedToId: exec1.id, budgetMin: 6000000, budgetMax: 8000000, bhkPreference: '3BHK' },
    { name: 'Meera Joshi', phone: '9876500004', source: 'google', status: 'new', assignedToId: exec2.id },
    { name: 'Deepak Yadav', phone: '9876500005', source: 'magicbricks', status: 'contacted', assignedToId: exec1.id, budgetMin: 4500000, budgetMax: 5500000 },
    { name: 'Kavita Reddy', phone: '9876500006', source: 'website', status: 'booked', assignedToId: exec1.id },
    { name: 'Sanjay Mehta', phone: '9876500007', source: '99acres', status: 'lost', assignedToId: exec2.id },
    { name: 'Pooja Nair', phone: '9876500008', source: 'whatsapp', status: 'interested', assignedToId: exec2.id, budgetMin: 5000000, budgetMax: 6500000 },
  ];

  for (const data of leadData) {
    const lead = await prisma.lead.create({
      data: {
        ...data,
        builderId: builder.id,
        projectId: project1.id,
        lastContactedAt: data.status !== 'new' ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
      },
    });

    const score = calculateLeadScore({ ...lead, budget: { min: lead.budgetMin, max: lead.budgetMax } });
    await prisma.lead.update({ where: { id: lead.id }, data: { aiScore: score } });
    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: 'note', description: 'Lead imported during seed', createdById: owner.id },
    });

    if (['interested', 'negotiation'].includes(data.status)) {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          builderId: builder.id,
          assignedToId: data.assignedToId,
          scheduledAt: new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000),
          type: 'call',
          status: 'pending',
        },
      });
    }

    if (data.status === 'site_visit_done') {
      await prisma.siteVisit.create({
        data: {
          leadId: lead.id,
          builderId: builder.id,
          projectId: project1.id,
          assignedToId: data.assignedToId,
          scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'completed',
          feedback: 'Liked the 3BHK unit on 5th floor. Concerned about parking.',
          interestLevel: 'high',
          completedAt: new Date(),
        },
      });
    }
  }

  console.log('PostgreSQL seed completed!');
  console.log('Login: owner@skyline.com / password123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
