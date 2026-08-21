const fs = require('fs');
const db = require('../config/db.js');

async function testReImportLogic() {
  const filePath = 'C:/Users/UTPAL SHAH/Desktop/Billing_MSP/google daasbord/account_activities_202608.csv';
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  let insertedCount = 0;
  let skippedCount = 0;
  let seenKeys = new Set();
  let totalSum = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const matches = [];
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      let val = match[1] !== undefined ? match[1] : match[2];
      matches.push(val);
    }
    if (matches.length > 0 && matches[0] === '') matches.shift();

    const dateStr = matches[0] || '';
    const desc = matches[1] || '';
    const amtStr = matches[matches.length - 1] || '0';
    const amt = parseFloat(amtStr.replace(/,/g, '')) || 0;

    const domainMatch = desc.match(/Domain Name:\s*([^\s,]+)/i);
    const domain = domainMatch ? domainMatch[1] : 'N/A';

    const orderMatch = desc.match(/Order Number:\s*([^\s,]+)/i);
    const orderNo = orderMatch ? orderMatch[1] : 'N/A';

    const key = orderNo !== 'N/A' ? `${orderNo}_${dateStr}_${amt}` : `${domain}_${dateStr}_${amt}`;

    if (seenKeys.has(key)) {
      skippedCount++;
    } else {
      seenKeys.add(key);
      insertedCount++;
      totalSum += amt;
    }
  }

  console.log('Unique Records Count :', insertedCount);
  console.log('Duplicate Records    :', skippedCount);
  console.log('Total Records in CSV :', lines.length - 1);
  console.log('Calculated Total Sum :', totalSum.toFixed(2));

  process.exit(0);
}

testReImportLogic().catch(console.error);
