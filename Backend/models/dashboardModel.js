const db = require("../config/db.js");
const { getKeywordRules } = require("./settingsModel.js");

const monthMap = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
};

const matchMonthDate = (tDate, monthStr) => {
    if (!monthStr || monthStr === "All Months") return true;
    const dateLower = String(tDate || '').toLowerCase().trim();
    if (!dateLower) return false;

    const parts = monthStr.trim().split(' ');
    const mPart = parts[0].toLowerCase();
    const mShort = mPart.slice(0, 3);
    const yPart = parts[1];

    const matchesMonthName = dateLower.includes(mPart) || dateLower.includes(mShort);

    const mNum = monthMap[mPart];
    let matchesMonthNum = false;
    if (mNum) {
        const numStr = String(mNum);
        const padNumStr = mNum < 10 ? `0${mNum}` : numStr;

        matchesMonthNum = dateLower.startsWith(`${numStr}/`) || 
                          dateLower.startsWith(`${padNumStr}/`) || 
                          dateLower.startsWith(`${numStr}-`) || 
                          dateLower.startsWith(`${padNumStr}-`) || 
                          dateLower.includes(`/${numStr}/`) || 
                          dateLower.includes(`/${padNumStr}/`);
    }

    const matchesMonth = matchesMonthName || matchesMonthNum;

    let matchesYear = true;
    if (yPart) {
        const shortYear = yPart.slice(2);
        matchesYear = dateLower.includes(yPart) || dateLower.includes(`/${shortYear}`) || dateLower.includes(`-${shortYear}`);
    }

    return matchesMonth && matchesYear;
};

const getFinancialOverview = async (monthStr = "All Months") => {
    let keywordRules = [];
    try {
        keywordRules = await getKeywordRules();
    } catch (e) {}

    let masterRows = [];
    try {
        const [jM] = await db.execute(`SELECT * FROM jeenweb_master_accounts`);
        const [sM] = await db.execute(`SELECT * FROM satvaweb_master_accounts`);
        masterRows = [...jM, ...sM];

        if (masterRows.length === 0) {
            const [lM] = await db.execute(`SELECT * FROM master_accounts`);
            masterRows = lM;
        }
    } catch (e) {}

    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT * FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT * FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];

        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT * FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    const allUniqueDomainsSet = new Set();
    let activeAccounts = 0;
    let suspendedAccounts = 0;
    let assignedLicenses = 0;
    let purchasedLicenses = 0;
    const skuMap = new Map();

    masterRows.forEach(m => {
        if (!m.domain_name || m.domain_name === 'N/A') return;
        const d = String(m.domain_name).trim().toLowerCase();
        allUniqueDomainsSet.add(d);

        const status = String(m.status || 'ACTIVE').toUpperCase();
        if (status.includes("SUSPEND")) suspendedAccounts++;
        else activeAccounts++;

        assignedLicenses += parseInt(m.assigned_seats) || 0;
        purchasedLicenses += parseInt(m.total_seats) || 0;

        const sku = m.sku_plan || m.product || 'Google Workspace Business Starter';
        skuMap.set(sku, (skuMap.get(sku) || 0) + 1);
    });

    let totalBilling = 0;
    const uniqueCustomerSet = new Set();
    let committedSeatsActive = 0;

    let newAccountsCount = 0;
    let renewalsCount = 0;
    let newCommitmentsCount = 0;
    let commitmentsCount = 0;
    let commitmentIncreasesCount = 0;

    const activityTypeBilling = new Map();

    let flexyAmount = 0, flexySeats = 0, flexyTxns = 0;
    let monthlyCommitAmount = 0, monthlyCommitSeats = 0, monthlyCommitTxns = 0;
    let yearlyCommitAmount = 0, yearlyCommitSeats = 0, yearlyCommitTxns = 0;

    const accountAggMap = new Map();

    actRows.forEach(a => {
        const rawDesc = String(a.description || '').toLowerCase();
        if (rawDesc.includes('starting balance') || rawDesc.includes('ending balance')) {
            return;
        }

        if (!matchMonthDate(a.transaction_date, monthStr)) {
            return;
        }

        const amt = parseFloat(a.amount) || 0;
        const seats = parseInt(a.seats) || 0;
        const dName = a.domain_name && a.domain_name !== 'N/A' ? String(a.domain_name).trim() : null;
        const dKey = dName ? dName.toLowerCase() : `txn_${a.id}`;
        const customerId = a.customer_id && a.customer_id !== 'N/A' ? String(a.customer_id).trim() : 'N/A';
        const fullDesc = (a.description + " " + (a.commitment_type || "")).toLowerCase().trim();

        totalBilling += amt;
        if (dName) {
            uniqueCustomerSet.add(dKey);
            allUniqueDomainsSet.add(dKey);
        }
        committedSeatsActive += seats;

        let matchedCat = null;
        if (keywordRules && keywordRules.length > 0) {
            for (const r of keywordRules) {
                if ((r.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && r.keyword_match) {
                    const k = r.keyword_match.toLowerCase().trim();
                    if (k && fullDesc.includes(k)) {
                        matchedCat = r.activity_classification.toLowerCase().trim();
                        break;
                    }
                }
            }
        }

        let catLabel = 'Other';
        if (matchedCat) {
            if (matchedCat.includes('new account')) {
                newAccountsCount++;
                catLabel = 'New Accounts';
            } else if (matchedCat.includes('renewal')) {
                renewalsCount++;
                catLabel = 'Commitment Renewals';
            } else if (matchedCat.includes('new commitment')) {
                newCommitmentsCount++;
                catLabel = 'New Commitments';
            } else if (matchedCat.includes('increase')) {
                commitmentIncreasesCount++;
                catLabel = 'Commitment Increases';
            } else if (matchedCat.includes('commitment')) {
                commitmentsCount++;
                catLabel = 'Commitments';
            } else if (matchedCat.includes('usage') || matchedCat.includes('flex')) {
                catLabel = 'Usage Billing';
            } else {
                catLabel = matchedCat.charAt(0).toUpperCase() + matchedCat.slice(1);
            }
        } else {
            if (fullDesc.includes('renewal')) {
                renewalsCount++;
                catLabel = 'Commitment Renewals';
            } else if (fullDesc.includes('increase')) {
                commitmentIncreasesCount++;
                catLabel = 'Commitment Increases';
            } else if (fullDesc.includes('new commitment')) {
                newCommitmentsCount++;
                catLabel = 'New Commitments';
            } else if (fullDesc.includes('commitment')) {
                commitmentsCount++;
                catLabel = 'Commitments';
            } else {
                catLabel = 'Usage Billing';
            }
        }

        activityTypeBilling.set(catLabel, (activityTypeBilling.get(catLabel) || 0) + amt);

        if (fullDesc.includes('flex') || fullDesc.includes('usage')) {
            flexyAmount += amt;
            flexySeats += seats;
            flexyTxns++;
        } else if (fullDesc.includes('yearly') || fullDesc.includes('annual')) {
            yearlyCommitAmount += amt;
            yearlyCommitSeats += seats;
            yearlyCommitTxns++;
        } else {
            monthlyCommitAmount += amt;
            monthlyCommitSeats += seats;
            monthlyCommitTxns++;
        }

        if (dName) {
            if (!accountAggMap.has(dKey)) {
                accountAggMap.set(dKey, {
                    domain_name: dName,
                    customer_id: customerId,
                    txns: 1,
                    active_seats: seats,
                    total_billing: amt,
                    activities: new Set([catLabel.toLowerCase()])
                });
            } else {
                const existing = accountAggMap.get(dKey);
                existing.txns += 1;
                existing.total_billing += amt;
                if (seats > existing.active_seats) existing.active_seats = seats;
                if (existing.customer_id === 'N/A' && customerId !== 'N/A') existing.customer_id = customerId;
                existing.activities.add(catLabel.toLowerCase());
            }
        }
    });

    const topAccountsAll = Array.from(accountAggMap.values()).map(acc => ({
        ...acc,
        primary_activities: Array.from(acc.activities).join(', ')
    })).sort((a, b) => b.total_billing - a.total_billing);

    const totalAccounts = allUniqueDomainsSet.size;
    const skuDistribution = Array.from(skuMap.entries()).map(([sku, count]) => ({ sku, count }));

    return {
        selected_month: monthStr,
        portfolio_overview: {
            total_accounts: totalAccounts,
            active_accounts: activeAccounts > 0 ? activeAccounts : totalAccounts,
            suspended_accounts: suspendedAccounts,
            assigned_licenses: assignedLicenses > 0 ? assignedLicenses : committedSeatsActive,
            purchased_licenses: purchasedLicenses > 0 ? purchasedLicenses : committedSeatsActive,
            sku_distribution: skuDistribution.length > 0 ? skuDistribution : [
                { sku: "Google Workspace Business Starter", count: totalAccounts }
            ]
        },
        growth_metrics: {
            total_billing: totalBilling,
            unique_customer_accounts: uniqueCustomerSet.size,
            committed_seats_active: committedSeatsActive,
            new_accounts_count: newAccountsCount,
            renewals_count: renewalsCount,
            new_commitments_count: newCommitmentsCount,
            commitments_count: commitmentsCount,
            commitment_increases_count: commitmentIncreasesCount,
            has_prior_month_data: false
        },
        activity_type_billing: Array.from(activityTypeBilling.entries()).map(([type, amount]) => ({ type, amount })),
        contract_plans: {
            flexy_plan: { amount: flexyAmount, seats: flexySeats, txns: flexyTxns },
            monthly_commit: { amount: monthlyCommitAmount, seats: monthlyCommitSeats, txns: monthlyCommitTxns },
            yearly_commit: { amount: yearlyCommitAmount, seats: yearlyCommitSeats, txns: yearlyCommitTxns }
        },
        top_accounts: topAccountsAll
    };
};

const getActivityBreakdownData = async (monthStr = "All Months") => {
    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT id, 'JeenWeb' as seller_company, domain_name, customer_id, description, commitment_type, seats, amount, transaction_date FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT id, 'SatvaWeb' as seller_company, domain_name, customer_id, description, commitment_type, seats, amount, transaction_date FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];

        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT id, 'JeenWeb' as seller_company, domain_name, customer_id, description, commitment_type, seats, amount, transaction_date FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    const categorizeRow = (r) => {
        const fullDesc = (String(r.description || '') + ' ' + String(r.commitment_type || '')).toLowerCase().trim();
        if (fullDesc.includes('renewal')) return 'Commitment Renewals';
        if (fullDesc.includes('increase')) return 'Commitment Increases';
        if (fullDesc.includes('new commitment')) return 'New Commitments';
        if (fullDesc.includes('commitment')) return 'Commitments';
        return 'Usage-Based Billing';
    };

    const result = actRows
        .filter(r => {
            const desc = String(r.description || '').toLowerCase();
            if (desc.includes('starting balance') || desc.includes('ending balance')) return false;
            return matchMonthDate(r.transaction_date, monthStr);
        })
        .map(r => ({
            id: r.id,
            seller_company: r.seller_company,
            domain_name: r.domain_name || 'N/A',
            customer_id: r.customer_id || 'N/A',
            description: r.description || 'N/A',
            commitment_type: r.commitment_type || 'N/A',
            seats: parseInt(r.seats) || 1,
            amount: parseFloat(r.amount) || 0.00,
            transaction_date: r.transaction_date,
            classification: categorizeRow(r)
        }));

    return result;
};

const getAnnualFinancialMatrix = async (year = 2026) => {
    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT * FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT * FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];

        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT * FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const matrixMap = new Map();

    actRows.forEach(a => {
        const desc = String(a.description || '').toLowerCase();
        if (desc.includes('starting balance') || desc.includes('ending balance')) return;

        const dName = a.domain_name && a.domain_name !== 'N/A' ? String(a.domain_name).trim() : null;
        if (!dName) return;

        const dKey = dName.toLowerCase();
        const amt = parseFloat(a.amount) || 0;
        
        let plan = a.sku_plan || a.product || 'Google Workspace Business Starter';
        if (plan.toLowerCase().includes('starter')) plan = 'Google Workspace Business Starter';
        else if (plan.toLowerCase().includes('standard')) plan = 'Google Workspace Business Standard';

        const dateStr = String(a.transaction_date || '');
        let mIdx = 7;
        for (let i = 0; i < monthNames.length; i++) {
            if (dateStr.toLowerCase().includes(monthNames[i].toLowerCase())) {
                mIdx = i;
                break;
            }
        }

        if (!matrixMap.has(dKey)) {
            matrixMap.set(dKey, {
                domain_name: dName,
                customer_id: a.customer_id || 'N/A',
                plans: new Map()
            });
        }

        const domainObj = matrixMap.get(dKey);
        if (!domainObj.plans.has(plan)) {
            domainObj.plans.set(plan, {
                plan_name: plan,
                months: Array.from({ length: 12 }, () => ({ amount: 0, paid: false })),
                total: 0
            });
        }

        const planObj = domainObj.plans.get(plan);
        planObj.months[mIdx].amount += amt;
        if (amt > 0) planObj.months[mIdx].paid = true;
        planObj.total += amt;
    });

    const rows = [];
    const monthTotals = Array(12).fill(0);
    let grandTotal = 0;

    matrixMap.forEach((domainObj) => {
        domainObj.plans.forEach((planObj, pName) => {
            rows.push({
                domain_name: domainObj.domain_name,
                customer_id: domainObj.customer_id,
                plan_name: pName,
                months: planObj.months,
                total: planObj.total
            });

            planObj.months.forEach((m, idx) => {
                monthTotals[idx] += m.amount;
            });
            grandTotal += planObj.total;
        });
    });

    return {
        month_names: monthNames,
        rows,
        month_totals: monthTotals,
        grand_total: grandTotal
    };
};

const getCompareMonthData = async (monthA = "August 2026", monthB = "August 2026") => {
    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT * FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT * FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];

        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT * FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    const filterRowsByMonth = (rows, monthStr) => {
        return rows.filter(r => {
            const desc = String(r.description || '').toLowerCase();
            if (desc.includes('starting balance') || desc.includes('ending balance')) return false;

            return matchMonthDate(r.transaction_date, monthStr);
        });
    };

    const computeMetrics = (rows) => {
        let totalBilling = 0;
        let committedSeats = 0;
        const uniqueDomains = new Set();
        let newAccounts = 0;
        let renewals = 0;
        let newCommitments = 0;
        let generalCommitments = 0;
        let increases = 0;
        let usageTxns = 0;

        rows.forEach(r => {
            const amt = parseFloat(r.amount) || 0;
            const seats = parseInt(r.seats) || 0;
            const desc = (r.description + " " + (r.commitment_type || "")).toLowerCase();
            const dName = r.domain_name && r.domain_name !== 'N/A' ? String(r.domain_name).trim().toLowerCase() : null;

            totalBilling += amt;
            committedSeats += seats;
            if (dName) uniqueDomains.add(dName);

            if (desc.includes('new account')) newAccounts++;
            else if (desc.includes('renewal')) renewals++;
            else if (desc.includes('new commitment')) newCommitments++;
            else if (desc.includes('increase')) increases++;
            else if (desc.includes('commitment')) generalCommitments++;
            else if (desc.includes('usage') || desc.includes('flex')) usageTxns++;
        });

        return {
            total_billing: totalBilling,
            committed_seats: committedSeats,
            unique_domains: uniqueDomains.size,
            new_accounts: newAccounts,
            renewals: renewals,
            new_commitments: newCommitments,
            general_commitments: generalCommitments,
            increases: increases,
            usage_txns: usageTxns,
            total_txns: rows.length
        };
    };

    const rowsA = filterRowsByMonth(actRows, monthA);
    const rowsB = filterRowsByMonth(actRows, monthB);

    const mA = computeMetrics(rowsA);
    const mB = computeMetrics(rowsB);

    const buildMetricRow = (label, key, isCurrency = false) => {
        const valA = mA[key];
        const valB = mB[key];
        const netChange = valB - valA;
        let pct = 0;
        if (valA === 0) {
            pct = valB > 0 ? 100 : 0;
        } else {
            pct = ((valB - valA) / Math.abs(valA)) * 100;
        }

        return {
            label,
            valA,
            valB,
            netChange,
            pct: parseFloat(pct.toFixed(2)),
            isCurrency
        };
    };

    const comparisonTable = [
        buildMetricRow("Total Invoiced Billing", "total_billing", true),
        buildMetricRow("Committed Seats Active", "committed_seats"),
        buildMetricRow("Unique Active Accounts", "unique_domains"),
        buildMetricRow("New Customer Accounts Added", "new_accounts"),
        buildMetricRow("Commitment Renewals Volume", "renewals"),
        buildMetricRow("New Commitments Volume", "new_commitments"),
        buildMetricRow("General Commitments Volume", "general_commitments"),
        buildMetricRow("Commitment Increase Events", "increases"),
        buildMetricRow("Usage Billing Transactions", "usage_txns"),
        buildMetricRow("Total Statement Transactions", "total_txns")
    ];

    return {
        monthA,
        monthB,
        metricsA: mA,
        metricsB: mB,
        comparisonTable
    };
};

const getClientPerformanceData = async (monthStr = "August 2026") => {
    let clients = [];
    try {
        const [cRows] = await db.execute(`SELECT id, client_name FROM clients ORDER BY client_name ASC`);
        clients = cRows;
    } catch (e) {}

    let mappings = [];
    try {
        const [mRows] = await db.execute(`
            SELECT dm.domain_name, dm.client_id, c.client_name 
            FROM domain_mappings dm 
            JOIN clients c ON dm.client_id = c.id
        `);
        mappings = mRows;
    } catch (e) {}

    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT * FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT * FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];

        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT * FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    const clientsList = [];
    let totalSeatsSum = 0;
    let totalDomainsSum = 0;
    let totalMonthInvoicedSum = 0;

    clients.forEach(c => {
        const mappedDomainsList = mappings
            .filter(m => m.client_id === c.id)
            .map(m => String(m.domain_name).trim());

        const mappedDomainsLower = mappedDomainsList.map(d => d.toLowerCase());

        let activeSeats = 0;
        let selectedMonthInvoiced = 0;
        let lifetimeBilling = 0;

        actRows.forEach(r => {
            const desc = String(r.description || '').toLowerCase();
            if (desc.includes('starting balance') || desc.includes('ending balance')) return;

            const dName = r.domain_name && r.domain_name !== 'N/A' ? String(r.domain_name).trim().toLowerCase() : null;
            if (!dName || !mappedDomainsLower.includes(dName)) return;

            const amt = parseFloat(r.amount) || 0;
            const seats = parseInt(r.seats) || 0;

            lifetimeBilling += amt;

            if (matchMonthDate(r.transaction_date, monthStr)) {
                selectedMonthInvoiced += amt;
                activeSeats += seats;
            }
        });

        clientsList.push({
            client_name: c.client_name,
            linked_domains: mappedDomainsList,
            linked_domains_count: mappedDomainsList.length,
            active_seats: activeSeats,
            selected_month_invoiced: selectedMonthInvoiced,
            lifetime_billing: lifetimeBilling
        });

        totalSeatsSum += activeSeats;
        totalDomainsSum += mappedDomainsList.length;
        totalMonthInvoicedSum += selectedMonthInvoiced;
    });

    clientsList.sort((a, b) => b.selected_month_invoiced - a.selected_month_invoiced || b.lifetime_billing - a.lifetime_billing);

    return {
        selected_month: monthStr,
        managed_clients_count: clientsList.length,
        associated_domains_count: totalDomainsSum,
        committed_seats_count: totalSeatsSum,
        total_month_invoiced: totalMonthInvoicedSum,
        clients: clientsList
    };
};

const getAvailableBillingMonths = async () => {
    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT DISTINCT transaction_date FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT DISTINCT transaction_date FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];

        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT DISTINCT transaction_date FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShorts = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const detectedMonthsSet = new Set();

    actRows.forEach(r => {
        const dStr = String(r.transaction_date || '');
        monthShorts.forEach((short, idx) => {
            if (dStr.toLowerCase().includes(short.toLowerCase())) {
                const yearMatch = dStr.match(/\b(20\d\d)\b/);
                const yearStr = yearMatch ? yearMatch[1] : "2026";
                detectedMonthsSet.add(`${monthNames[idx]} ${yearStr}`);
            }
        });
    });

    const monthsArray = Array.from(detectedMonthsSet);
    if (monthsArray.length > 1) {
        monthsArray.unshift("All Months");
    }

    return monthsArray.length > 0 ? monthsArray : ["August 2026"];
};

module.exports = {
    getFinancialOverview,
    getActivityBreakdownData,
    getAnnualFinancialMatrix,
    getCompareMonthData,
    getClientPerformanceData,
    getAvailableBillingMonths
};
