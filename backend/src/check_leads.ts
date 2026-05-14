import { getMexicoLeads } from './database';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkLeads() {
  try {
    const leads = await getMexicoLeads(7);
    console.log(`Found ${leads.length} leads with score >= 7`);
    if (leads.length > 0) {
      console.log('Sample lead:', leads[0]);
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
  }
  process.exit(0);
}

checkLeads();
