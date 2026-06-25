import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const country = (process.env.CAMPAIGN_COUNTRY || 'mexico').toLowerCase();

async function runCampaign() {
  if (country === 'colombia') {
    console.log("👉 Redireccionando a campaña de Colombia...");
    await import('./index_colombia');
  } else {
    console.log("👉 Redireccionando a campaña de México...");
    await import('./index_mexico');
  }
}

runCampaign().catch(console.error);
