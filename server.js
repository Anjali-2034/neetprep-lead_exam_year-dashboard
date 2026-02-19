const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const HUBSPOT_URL = 'https://api.hubapi.com/crm/v3/objects/contacts/search';

const HEADERS = {
  Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

/* =====================================================
   PAID (UNCHANGED — WORKING LOGIC)
===================================================== */
function getPaidFilterGroups() {
  return [
    { filters: [{ propertyName: 'gclid', operator: 'HAS_PROPERTY' }] },
    { filters: [{ propertyName: 'hs_google_click_id', operator: 'HAS_PROPERTY' }] },
    {
      filters: [
        { propertyName: 'utm_medium', operator: 'IN', values: ['cpc', 'ppc'] }
      ]
    }
  ];
}

/* =====================================================
   CONTENT (UNCHANGED — VERIFIED)
===================================================== */
function getContentFilterGroups() {
  return [
    {
      filters: [
        {
          propertyName: 'google_sheet_leads_overall',
          operator: 'IN',
          values: [
            'New Calling sheet for NEET  2026',
            'DRARS 2026 Google Sheet Leads'
          ]
        }
      ]
    }
  ];
}

/* =====================================================
   ORGANIC (FIXED — NO FORM FILTERS)
===================================================== */
function getOrganicFilterGroups() {
  const allowedPages = [
    'https://www.neetprep.com/home',
    'https://www.neetprep.com/questions',
    'https://www.neetprep.com/papers-test-series'
  ];

  return [
    {
      filters: [
        { propertyName: 'utm_campaign', operator: 'NOT_HAS_PROPERTY' },
        { propertyName: 'first_page_seen', operator: 'IN', values: allowedPages }
      ]
    },
    {
      filters: [
        { propertyName: 'gclid', operator: 'NOT_HAS_PROPERTY' },
        { propertyName: 'first_page_seen', operator: 'IN', values: allowedPages }
      ]
    },
    {
      filters: [
        { propertyName: 'hs_google_click_id', operator: 'NOT_HAS_PROPERTY' }
      ]
    }
  ];
}

/* =====================================================
   CORE COUNT FUNCTION
===================================================== */
async function fetchCount({ lifecycleValue, start, end, segment, examYear }) {

  const baseFilters = [
    ...(examYear !== 'overall'
      ? [{ propertyName: 'lead_exam_year', operator: 'EQ', value: String(examYear) }]
      : []),
    {
      propertyName: 'createdate',
      operator: 'BETWEEN',
      value: start,
      highValue: end
    }
  ];

  if (lifecycleValue) {
    baseFilters.push({
      propertyName: 'lifecyclestage',
      operator: 'EQ',
      value: lifecycleValue
    });
  }

  let filterGroups = [{ filters: baseFilters }];

  if (segment === 'paid') {
    filterGroups = getPaidFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'content') {
    filterGroups = getContentFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'organic') {
    filterGroups = getOrganicFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  const res = await axios.post(
    HUBSPOT_URL,
    { filterGroups, limit: 1 },
    { headers: HEADERS }
  );

  return res.data.total || 0;
}



/* =====================================================
   CALLS CONNECTED
===================================================== */
async function fetchCallsConnected({ start, end, segment, examYear }) {

  const baseFilters = [
    ...(examYear !== 'overall'
      ? [{ propertyName: 'lead_exam_year', operator: 'EQ', value: String(examYear) }]
      : []),
    { propertyName: 'lifecyclestage', operator: 'EQ', value: 'lead' },
    { propertyName: 'notes_last_contacted', operator: 'HAS_PROPERTY' },
    {
      propertyName: 'createdate',
      operator: 'BETWEEN',
      value: start,
      highValue: end
    }
  ];

  let filterGroups = [{ filters: baseFilters }];

  if (segment === 'paid') {
    filterGroups = getPaidFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'content') {
    filterGroups = getContentFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'organic') {
    filterGroups = getOrganicFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }


  const res = await axios.post(
    HUBSPOT_URL,
    { filterGroups, limit: 1 },
    { headers: HEADERS }
  );

  return res.data.total || 0;
}

/* =====================================================
   FETCH IDS (FOR OTHERS — PAGINATED, HUBSPOT SAFE)
===================================================== */
async function fetchIds({ lifecycleValue, start, end, segment, examYear }) {

  const baseFilters = [
    ...(examYear !== 'overall'
      ? [{ propertyName: 'lead_exam_year', operator: 'EQ', value: String(examYear) }]
      : []),
    {
      propertyName: 'createdate',
      operator: 'BETWEEN',
      value: start,
      highValue: end
    }
  ];

  if (lifecycleValue) {
    baseFilters.push({
      propertyName: 'lifecyclestage',
      operator: 'EQ',
      value: lifecycleValue
    });
  }

  let filterGroups = [{ filters: baseFilters }];

  if (segment === 'paid') {
    filterGroups = getPaidFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'content') {
    filterGroups = getContentFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'organic') {
    filterGroups = getOrganicFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  const ids = new Set();
  let after;

  do {
    const res = await axios.post(
      HUBSPOT_URL,
      {
        filterGroups,
        properties: [],
        limit: 200,
        after
      },
      { headers: HEADERS }
    );

    res.data.results.forEach(r => ids.add(r.id));
    after = res.data.paging?.next?.after;

  } while (after);

  return ids;
}


/* =====================================================
   FETCH CALL IDS (FOR OTHERS — EXACT CALLS CONNECTED)
===================================================== */
async function fetchCallIds({ start, end, segment, examYear }) {

  const baseFilters = [
    ...(examYear !== 'overall'
      ? [{ propertyName: 'lead_exam_year', operator: 'EQ', value: String(examYear) }]
      : []),
    { propertyName: 'lifecyclestage', operator: 'EQ', value: 'lead' },
    { propertyName: 'notes_last_contacted', operator: 'HAS_PROPERTY' },
    {
      propertyName: 'createdate',
      operator: 'BETWEEN',
      value: start,
      highValue: end
    }
  ];

  let filterGroups = [{ filters: baseFilters }];

  if (segment === 'paid') {
    filterGroups = getPaidFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'content') {
    filterGroups = getContentFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  if (segment === 'organic') {
    filterGroups = getOrganicFilterGroups().map(g => ({
      filters: [...baseFilters, ...g.filters]
    }));
  }

  const ids = new Set();
  let after;

  do {
    const res = await axios.post(
      HUBSPOT_URL,
      { filterGroups, limit: 200, after },
      { headers: HEADERS }
    );

    res.data.results.forEach(r => ids.add(r.id));
    after = res.data.paging?.next?.after;

  } while (after);

  return ids;
}


/* =====================================================
   DASHBOARD ROUTE (RELIABILITY FIX)
===================================================== */
app.post('/api/dashboard', async (req, res) => {

  const { start, end, segment, examYear = '2027' } = req.body;

  try {

    /* ========== OTHERS (ALL − PAID − CONTENT − ORGANIC) — CORRECT LOGIC ========== */
if (segment === 'others') {

  console.log('🔥 ENTERED OTHERS BLOCK', { start, end, examYear });

  // ---- LEADS ----
  
  const allLeads = await fetchIds({ start, end, examYear });
  console.log('📊 ALL LEADS COUNT:', allLeads.size);
  const paidLeads = await fetchIds({ start, end, segment: 'paid', examYear });
  console.log('📊 PAID LEADS:', paidLeads.size);
  const contentLeads = await fetchIds({ start, end, segment: 'content', examYear });
  console.log('📊 CONTENT LEADS:', contentLeads.size);
  const organicLeads = await fetchIds({ start, end, segment: 'organic', examYear });
  console.log('📊 ORGANIC LEADS:', organicLeads.size);

  const excludedLeads = new Set([...paidLeads, ...contentLeads, ...organicLeads]);
  const totalLeads = [...allLeads].filter(id => !excludedLeads.has(id)).length;
  console.log('📊 OTHERS LEADS (AFTER SUBTRACTION):', totalLeads);

  // ---- CALLS CONNECTED ----
  const allCalls = await fetchCallIds({ start, end, examYear });
  console.log('📞 ALL CALL IDS:', allCalls.size);
  const paidCalls = await fetchCallIds({ start, end, segment: 'paid', examYear });
  const contentCalls = await fetchCallIds({ start, end, segment: 'content', examYear });
  const organicCalls = await fetchCallIds({ start, end, segment: 'organic', examYear });

  const excludedCalls = new Set([...paidCalls, ...contentCalls, ...organicCalls]);
  const callsConnected = [...allCalls].filter(id => !excludedCalls.has(id)).length;

  // ---- MQLs ----
  const allMqlsSet = await fetchIds({ lifecycleValue: 'marketingqualifiedlead', start, end, examYear });
  const paidMqls = await fetchIds({ lifecycleValue: 'marketingqualifiedlead', start, end, segment: 'paid', examYear });
  const contentMqls = await fetchIds({ lifecycleValue: 'marketingqualifiedlead', start, end, segment: 'content', examYear });
  const organicMqls = await fetchIds({ lifecycleValue: 'marketingqualifiedlead', start, end, segment: 'organic', examYear });

  const excludedMqls = new Set([...paidMqls, ...contentMqls, ...organicMqls]);
  const totalMqls = [...allMqlsSet].filter(id => !excludedMqls.has(id)).length;

  // ---- OPPORTUNITIES ----
  const allOpps = await fetchIds({ lifecycleValue: 'opportunity', start, end, examYear });
  const paidOpps = await fetchIds({ lifecycleValue: 'opportunity', start, end, segment: 'paid', examYear });
  const contentOpps = await fetchIds({ lifecycleValue: 'opportunity', start, end, segment: 'content', examYear });
  const organicOpps = await fetchIds({ lifecycleValue: 'opportunity', start, end, segment: 'organic', examYear });

  const excludedOpps = new Set([...paidOpps, ...contentOpps, ...organicOpps]);
  const totalOpps = [...allOpps].filter(id => !excludedOpps.has(id)).length;

  // ---- CUSTOMERS ----
  const allCustomers = await fetchIds({ lifecycleValue: 'customer', start, end, examYear });
  const paidCustomers = await fetchIds({ lifecycleValue: 'customer', start, end, segment: 'paid', examYear });
  const contentCustomers = await fetchIds({ lifecycleValue: 'customer', start, end, segment: 'content', examYear });
  const organicCustomers = await fetchIds({ lifecycleValue: 'customer', start, end, segment: 'organic', examYear });

  const excludedCustomers = new Set([...paidCustomers, ...contentCustomers, ...organicCustomers]);
  const totalCustomers = [...allCustomers].filter(id => !excludedCustomers.has(id)).length;

  const conversionRate =
    totalLeads > 0
      ? ((totalCustomers / totalLeads) * 100).toFixed(2) + '%'
      : '0.00%';

  return res.json({
    totalLeads,
    callsConnected,
    totalMqls,
    totalOpps,
    totalCustomers,
    conversionRate
  });
}

    // SERIAL execution — avoids HubSpot rate limits
    const leads = await fetchCount({ start, end, segment, examYear });
    const callsConnected = await fetchCallsConnected({ start, end, segment, examYear });
    const mqls = await fetchCount({ lifecycleValue: 'marketingqualifiedlead', start, end, segment, examYear });
    const opps = await fetchCount({ lifecycleValue: 'opportunity', start, end, segment, examYear });
    const customers = await fetchCount({ lifecycleValue: 'customer', start, end, segment, examYear });

    const conversionRate =
      leads > 0
        ? ((customers / leads) * 100).toFixed(2) + '%'
        : '0.00%';

    res.json({
      totalLeads: leads,
      callsConnected,
      totalMqls: mqls,
      totalOpps: opps,
      totalCustomers: customers,
      conversionRate
    });

  } catch (err) {
    console.error('HubSpot API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.listen(3001, () => {
  console.log('✅ Backend running — ALL / PAID / CONTENT / ORGANIC (stable)');
});
