const db = require('../config/db.js');

async function insertMissingRowAndCheck() {
  const dateStr = 'Aug 13\u2009\u2013\u200919, 2026';
  const descStr = 'Google Workspace Business Starter: Usage of 2 seats, Order Number: 10245310598-06, Domain Name: reliablelifecureangola.com, Customer ID: C02ot9pcn';
  const orderStr = '10245310598-06';
  const domainStr = 'reliablelifecureangola.com';
  const customerStr = 'C02ot9pcn';
  const amt = 69.87;

  // Check if 69.87 row already exists
  const [existing] = await db.execute(
    'SELECT * FROM jeenweb_account_activities WHERE domain_name = ? AND amount = ?',
    [domainStr, amt]
  );
  
  if (existing.length === 0) {
    const rawDataStr = JSON.stringify({
      Date: dateStr,
      Description: descStr,
      'Amount (INR)': '69.87'
    });

    await db.execute(
      `INSERT INTO jeenweb_account_activities 
      (transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dateStr,
        descStr,
        orderStr,
        domainStr,
        customerStr,
        'Usage Billing',
        2,
        'Google Workspace Business Starter',
        amt,
        'account_activities_202608.csv',
        rawDataStr
      ]
    );

    try {
      await db.execute(
        `INSERT INTO account_activities 
        (transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dateStr,
          descStr,
          orderStr,
          domainStr,
          customerStr,
          'Usage Billing',
          2,
          'Google Workspace Business Starter',
          amt,
          'account_activities_202608.csv',
          rawDataStr
        ]
      );
    } catch (e) {}
    console.log('Successfully inserted missing row (69.87) into MySQL!');
  } else {
    console.log('Row already exists.');
  }

  const [res] = await db.execute('SELECT COUNT(*) as cnt, SUM(amount) as total FROM jeenweb_account_activities');
  console.log('====================================================');
  console.log('  UPDATED MYSQL DATABASE TOTALS');
  console.log('====================================================');
  console.log('  Total Records Count: ' + res[0].cnt);
  console.log('  Total Invoiced Sum : ₹' + parseFloat(res[0].total).toFixed(2));
  console.log('====================================================');

  process.exit(0);
}

insertMissingRowAndCheck().catch(console.error);
