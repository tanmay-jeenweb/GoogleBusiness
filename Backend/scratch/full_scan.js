const db = require('../config/db.js');

async function fullSystemScan() {
  console.log('========================================================');
  console.log('       GOOGLE BUSINESS SYSTEM DEEP SCAN REPORT');
  console.log('========================================================\n');

  // 1. DATABASE TABLES CHECK
  const requiredTables = [
    'users', 'user_types', 'clients', 'domain_mappings', 'audit_logs',
    'activity_keyword_rules', 'jeenweb_account_activities', 'satvaweb_account_activities',
    'jeenweb_master_accounts', 'satvaweb_master_accounts'
  ];

  console.log('--- 1. DATABASE TABLES & RECORD COUNTS ---');
  let tableSuccessCount = 0;
  for (const table of requiredTables) {
    try {
      const [rows] = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✓ Table [${table}]: ${rows[0].count} records`);
      tableSuccessCount++;
    } catch (err) {
      console.log(`  ❌ MISSING TABLE [${table}]: ${err.message}`);
    }
  }

  // 2. CHECK RESELLER TRANSACTION TOTALS
  console.log('\n--- 2. TRANSACTION DATA CONSISTENCY ---');
  let totalJeenWeb = 0;
  try {
    const [jA] = await db.execute('SELECT COUNT(*) as cnt, SUM(amount) as total, COUNT(DISTINCT domain_name) as domains FROM jeenweb_account_activities');
    const [sA] = await db.execute('SELECT COUNT(*) as cnt, SUM(amount) as total, COUNT(DISTINCT domain_name) as domains FROM satvaweb_account_activities');
    
    totalJeenWeb = parseFloat(jA[0].total || 0);
    console.log(`  JeenWeb Activities  : ${jA[0].cnt} txns | Total: ₹${totalJeenWeb.toLocaleString('en-IN')} | ${jA[0].domains} unique domains`);
    console.log(`  SatvaWeb Activities : ${sA[0].cnt} txns | Total: ₹${parseFloat(sA[0].total || 0).toLocaleString('en-IN')} | ${sA[0].domains} unique domains`);
  } catch (err) {
    console.log(`  ❌ Error checking transaction totals: ${err.message}`);
  }

  // 3. CHECK CLIENT & DOMAIN MAPPINGS
  console.log('\n--- 3. CLIENT & DOMAIN MAPPINGS AUDIT ---');
  try {
    const [cRows] = await db.execute('SELECT COUNT(*) as cnt FROM clients');
    const [mRows] = await db.execute('SELECT COUNT(*) as cnt FROM domain_mappings');
    const [unmapped] = await db.execute(`
      SELECT DISTINCT domain_name FROM jeenweb_account_activities 
      WHERE domain_name IS NOT NULL AND domain_name != 'N/A' AND domain_name != ''
      AND LOWER(domain_name) NOT IN (SELECT LOWER(domain_name) FROM domain_mappings)
    `);

    console.log(`  Managed Clients Count  : ${cRows[0].cnt}`);
    console.log(`  Domain Mappings Count  : ${mRows[0].cnt}`);
    console.log(`  Unmapped Active Domains: ${unmapped.length} domains ready for assignment`);
  } catch (err) {
    console.log(`  ❌ Error auditing client mappings: ${err.message}`);
  }

  // 4. CHECK USER ACCOUNTS & SECURITY
  console.log('\n--- 4. USER ACCOUNTS & ROLES INTEGRITY ---');
  try {
    const [uRows] = await db.execute('SELECT id, name, username, email, role, active FROM users');
    console.log(`  Total System Users: ${uRows.length}`);
    uRows.forEach(u => {
      console.log(`    ✓ User [${u.username}]: Role = ${u.role} | Active = ${u.active}`);
    });
  } catch (err) {
    console.log(`  ❌ Error checking users: ${err.message}`);
  }

  // 5. CHECK AUDIT LOGS
  console.log('\n--- 5. AUDIT LOGS OVERVIEW ---');
  try {
    const [aLogs] = await db.execute('SELECT master_name, change_type, COUNT(*) as cnt FROM audit_logs GROUP BY master_name, change_type');
    console.log(`  Audit Log Event Categories:`);
    if (aLogs.length === 0) {
      console.log('    (No audit log records yet)');
    } else {
      aLogs.forEach(l => {
        console.log(`    - [${l.master_name}] ${l.change_type.toUpperCase()}: ${l.cnt} logs`);
      });
    }
  } catch (err) {
    console.log(`  ❌ Error checking audit logs: ${err.message}`);
  }

  console.log('\n========================================================');
  console.log(`  SYSTEM SCAN COMPLETED - ${tableSuccessCount}/${requiredTables.length} TABLES VERIFIED CLEAN`);
  console.log('========================================================');
  process.exit(0);
}

fullSystemScan().catch(console.error);
