import { pool } from './database/index';

async function checkEmails() {
  try {
    const colEmail1 = await pool.query("SELECT COUNT(*) FROM \"empresas_leads_colombia\" WHERE email_1_sent_at::date = '2026-07-03'");
    const colEmail2 = await pool.query("SELECT COUNT(*) FROM \"empresas_leads_colombia\" WHERE email_2_sent_at::date = '2026-07-03'");
    
    console.log('Colombia Email 1 sent on July 3:', colEmail1.rows[0].count);
    console.log('Colombia Email 2 sent on July 3:', colEmail2.rows[0].count);

    const mexEmail1 = await pool.query("SELECT COUNT(*) FROM \"leads-al-por-mayor-mexico\" WHERE email_1_sent_at::date = '2026-07-03'");
    const mexEmail2 = await pool.query("SELECT COUNT(*) FROM \"leads-al-por-mayor-mexico\" WHERE email_2_sent_at::date = '2026-07-03'");
    
    console.log('Mexico Email 1 sent on July 3:', mexEmail1.rows[0].count);
    console.log('Mexico Email 2 sent on July 3:', mexEmail2.rows[0].count);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkEmails();
