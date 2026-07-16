import 'dotenv/config';
import { connectDB } from '../config/db.js';
import Builder from '../models/Builder.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Unit from '../models/Unit.js';
import Lead from '../models/Lead.js';
import FollowUp from '../models/FollowUp.js';
import SiteVisit from '../models/SiteVisit.js';
import { calculateLeadScore } from '../services/aiService.js';

const seed = async () => {
  await connectDB();

  await Promise.all([
    Lead.deleteMany({}),
    FollowUp.deleteMany({}),
    SiteVisit.deleteMany({}),
    Unit.deleteMany({}),
    Project.deleteMany({}),
    User.deleteMany({}),
    Builder.deleteMany({}),
  ]);

  const builder = await Builder.create({
    name: 'Skyline Developers',
    email: 'owner@skyline.com',
    phone: '+91 9876543210',
    city: 'Patna',
    plan: 'pilot',
  });

  const owner = await User.create({
    name: 'Rajesh Kumar',
    email: 'owner@skyline.com',
    password: 'password123',
    role: 'owner',
    builder: builder._id,
    phone: '+91 9876543210',
  });

  const manager = await User.create({
    name: 'Priya Sharma',
    email: 'manager@skyline.com',
    password: 'password123',
    role: 'sales_manager',
    builder: builder._id,
  });

  const exec1 = await User.create({
    name: 'Amit Singh',
    email: 'amit@skyline.com',
    password: 'password123',
    role: 'sales_executive',
    builder: builder._id,
  });

  const exec2 = await User.create({
    name: 'Sneha Patel',
    email: 'sneha@skyline.com',
    password: 'password123',
    role: 'sales_executive',
    builder: builder._id,
  });

  const project1 = await Project.create({
    builder: builder._id,
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
  });

  const project2 = await Project.create({
    builder: builder._id,
    name: 'Green Valley Residency',
    location: 'Bailey Road, Patna',
    city: 'Patna',
    totalUnits: 80,
    amenities: ['Garden', 'Kids Play Area', 'Covered Parking'],
    status: 'ready',
  });

  const units = [];
  for (let i = 1; i <= 10; i++) {
    units.push({
      project: project1._id,
      builder: builder._id,
      unitNumber: `A-${100 + i}`,
      type: i % 2 === 0 ? '2BHK' : '3BHK',
      floor: Math.ceil(i / 2),
      area: i % 2 === 0 ? '1050 sqft' : '1450 sqft',
      price: i % 2 === 0 ? 4500000 : 6500000,
      status: i <= 3 ? 'sold' : i <= 5 ? 'held' : 'available',
    });
  }
  await Unit.insertMany(units);

  const leadData = [
    { name: 'Rahul Kumar', phone: '9876500001', source: 'facebook', status: 'negotiation', assignedTo: exec1._id, budget: { min: 5000000, max: 7000000 }, bhkPreference: '3BHK', timeline: '1-3 months' },
    { name: 'Anita Verma', phone: '9876500002', source: 'walk_in', status: 'interested', assignedTo: exec2._id, budget: { min: 4000000, max: 5000000 }, bhkPreference: '2BHK' },
    { name: 'Vikram Singh', phone: '9876500003', source: 'referral', status: 'site_visit_done', assignedTo: exec1._id, budget: { min: 6000000, max: 8000000 }, bhkPreference: '3BHK' },
    { name: 'Meera Joshi', phone: '9876500004', source: 'google', status: 'new', assignedTo: exec2._id },
    { name: 'Deepak Yadav', phone: '9876500005', source: 'magicbricks', status: 'contacted', assignedTo: exec1._id, budget: { min: 4500000, max: 5500000 } },
    { name: 'Kavita Reddy', phone: '9876500006', source: 'website', status: 'booked', assignedTo: exec1._id },
    { name: 'Sanjay Mehta', phone: '9876500007', source: '99acres', status: 'lost', assignedTo: exec2._id },
    { name: 'Pooja Nair', phone: '9876500008', source: 'whatsapp', status: 'interested', assignedTo: exec2._id, budget: { min: 5000000, max: 6500000 } },
  ];

  for (const data of leadData) {
    const lead = await Lead.create({
      ...data,
      builder: builder._id,
      project: project1._id,
      lastContactedAt: data.status !== 'new' ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
    });
    lead.aiScore = calculateLeadScore(lead);
    lead.activities.push({ type: 'note', description: 'Lead imported during seed', createdBy: owner._id });
    await lead.save();

    if (['interested', 'negotiation'].includes(data.status)) {
      await FollowUp.create({
        lead: lead._id,
        builder: builder._id,
        assignedTo: data.assignedTo,
        scheduledAt: new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000),
        type: 'call',
        status: 'pending',
      });
    }

    if (data.status === 'site_visit_done') {
      await SiteVisit.create({
        lead: lead._id,
        builder: builder._id,
        project: project1._id,
        assignedTo: data.assignedTo,
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'completed',
        feedback: 'Liked the 3BHK unit on 5th floor. Concerned about parking.',
        interestLevel: 'high',
        completedAt: new Date(),
      });
    }
  }

  console.log('Seed completed!');
  console.log('Login: owner@skyline.com / password123');
  console.log('Manager: manager@skyline.com / password123');
  console.log('Executive: amit@skyline.com / password123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
