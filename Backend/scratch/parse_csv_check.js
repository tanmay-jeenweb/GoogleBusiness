const fs = require('fs');
const readline = require('readline');
const db = require('../config/db.js');

async function parseAndCompare() {
  const filePath = 'C:/Users/UTPAL SHAH/Desktop/Billing_MSP/google daasbord/account_activities_202608.csv';
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  console.log('Header line:', lines[0]);
  console.log('Total Lines in CSV file:', lines.length);

  // Parse header
  const headerParts = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  console.log('Header columns:', headerParts);

  let amountColIdx = -1;
  headerParts.forEach((h, idx) => {
    if (h.toLowerCase().includes('amount') || h.toLowerCase().includes('total')) {
      amountColIdx = idx;
    }
  });

  console.log('Amount column index:', amountColIdx);

  let csvSum = 0;
  let parsedRowsCount = 0;
  let rowsList = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // CSV regex splitter
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    let matches = [];
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      // index 1 if quoted, index 2 if unquoted
      let val = match[1] !== undefined ? match[1] : match[2];
      matches.push(val);
    }
    // drop empty trailing match if any
    if (matches.length > 0 && matches[0] === '') matches.shift();

    const dateStr = matches[0] || '';
    const desc = matches[1] || '';
    const orderNo = matches[2] || '';
    const domain = matches[3] || '';
    const custId = matches[4] || '';
    const amtStr = matches[matches.length - 1] || '0';
    const amt = parseFloat(amtStr.replace(/,/g, '')) || 0;

    csvSum += amt;
    parsedRowsCount++;
    rowsList.push({ dateStr, desc, orderNo, domain, custId, amt, lineNo: i + 1 });
  }

  console.log(`\nCSV Total Rows Parsed: ${parsedRowsCount}`);
  console.log(`CSV Total Amount Sum : ${csvSum.toFixed(2)}`);

  const [dbRes] = await db.execute('SELECT COUNT(*) as cnt, SUM(amount) as total FROM jeenweb_account_activities');
  console.log(`\nMySQL DB Rows Count  : ${dbRes[0].cnt}`);
  console.log(`MySQL DB Total Sum   : ${parseFloat(dbRes[0].total).toFixed(2)}`);

  const diff = csvSum - parseFloat(dbRes[0].total);
  console.log(`\nDIFFERENCE (CSV Sum - DB Sum): ${diff.toFixed(2)}`);

  // Let's find missing rows in DB
  const [dbAll] = await db.execute('SELECT domain_name, transaction_date, amount, order_number FROM jeenweb_account_activities');
  
  let dbMap = new Map();
  dbAll.forEach(r => {
    const key = `${r.domain_name}_${r.transaction_date}_${parseFloat(r.amount).toFixed(2)}`;
    dbMap.set(key, (dbMap.get(key) || 0) + 1);
  });

  console.log('\n--- MISSING OR DUPLICATE CSV ROWS NOT IN MYSQL DB ---');
  let missingSum = 0;
  rowsList.forEach(r => {
    const key = `${r.domain}_${r.dateStr}_${r.amt.toFixed(2)}`;
    if (dbMap.has(key) && dbMap.get(key) > 0) {
      dbMap.set(key, dbMap.get(key) - 1);
    } else {
      console.log(`Line ${r.lineNo}: Domain = ${r.domain}, Date = ${r.dateStr}, Order = ${r.orderNo}, Amount = ${r.amt}`);
      missingSum += r.amt;
    }
  });

  console.log(`Total Missing Rows Amount: ${missingSum.toFixed(2)}`);

  process.exit(0);
}

parseAndCompare().catch(console.error);
