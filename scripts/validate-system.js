/**
 * System-wide validation script
 * Tests all API endpoints and verifies functionality
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(name) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`  ${name}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

async function testEndpoint(method, url, body = null, expectedStatus = 200) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    const statusOk = response.status === expectedStatus;
    const formatOk = typeof data === 'object' && ('ok' in data);

    if (statusOk && formatOk) {
      log(`  ✓ ${method} ${url} - Status: ${response.status}`, 'green');
      return { success: true, data, status: response.status };
    } else {
      log(`  ✗ ${method} ${url} - Status: ${response.status} (expected ${expectedStatus})`, 'red');
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(`  ✗ ${method} ${url} - Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function validateSystem() {
  log('\n🔍 Starting System-Wide Validation\n', 'blue');
  log(`Base URL: ${BASE_URL}`, 'yellow');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Health Check
  logSection('1. API Health Check');
  const healthResult = await testEndpoint('GET', `${BASE_URL}/api/health`);
  if (healthResult.success) {
    results.passed++;
    results.tests.push({ name: 'GET /api/health', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/health', status: 'FAIL' });
  }

  // Test 2: Metrics Endpoint
  logSection('2. Metrics API');
  const metricsResult = await testEndpoint('GET', `${BASE_URL}/api/metrics`);
  if (metricsResult.success) {
    results.passed++;
    results.tests.push({ name: 'GET /api/metrics', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/metrics', status: 'FAIL' });
  }

  // Test 3: GET /api/incidents
  logSection('3. GET /api/incidents - List Incidents');
  const listResult = await testEndpoint('GET', `${BASE_URL}/api/incidents`);
  if (listResult.success && listResult.data.ok) {
    const count = listResult.data.data?.incidents?.length || 0;
    log(`  Found ${count} incidents`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents', status: 'FAIL' });
  }

  // Test 4: GET /api/incidents with filters
  logSection('4. GET /api/incidents - Filter Testing');
  const filterTests = [
    { name: 'status=open', url: `${BASE_URL}/api/incidents?status=open` },
    { name: 'priority=high', url: `${BASE_URL}/api/incidents?priority=high` },
    { name: 'status=open&priority=high', url: `${BASE_URL}/api/incidents?status=open&priority=high` },
    { name: 'search=test', url: `${BASE_URL}/api/incidents?search=test` },
  ];

  for (const test of filterTests) {
    const result = await testEndpoint('GET', test.url);
    if (result.success) {
      results.passed++;
      results.tests.push({ name: `GET /api/incidents - ${test.name}`, status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: `GET /api/incidents - ${test.name}`, status: 'FAIL' });
    }
  }

  // Test 5: POST /api/incidents - Create
  logSection('5. POST /api/incidents - Create Incident');
  const createBody = {
    service: 'validation-test-service',
    priority: 5,
    status: 'open',
  };
  const createResult = await testEndpoint('POST', `${BASE_URL}/api/incidents`, createBody, 201);
  let createdIncidentId = null;
  if (createResult.success && createResult.data.ok) {
    createdIncidentId = createResult.data.data?.incident?._id;
    log(`  Created incident ID: ${createdIncidentId}`, 'green');
    results.passed++;
    results.tests.push({ name: 'POST /api/incidents', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'POST /api/incidents', status: 'FAIL' });
  }

  // Test 6: GET /api/incidents/[id]
  if (createdIncidentId) {
    logSection('6. GET /api/incidents/[id] - Get Single Incident');
    const getResult = await testEndpoint('GET', `${BASE_URL}/api/incidents/${createdIncidentId}`);
    if (getResult.success && getResult.data.ok) {
      log(`  Retrieved incident: ${getResult.data.data?.incident?.service}`, 'green');
      results.passed++;
      results.tests.push({ name: 'GET /api/incidents/[id]', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'GET /api/incidents/[id]', status: 'FAIL' });
    }

    // Test 7: PATCH /api/incidents/[id] - Resolve
    logSection('7. PATCH /api/incidents/[id] - Resolve Incident');
    const patchResult = await testEndpoint(
      'PATCH',
      `${BASE_URL}/api/incidents/${createdIncidentId}`,
      { status: 'resolved' },
      200
    );
    if (patchResult.success && patchResult.data.ok) {
      const status = patchResult.data.data?.incident?.status;
      if (status === 'resolved') {
        log(`  ✓ Incident resolved successfully`, 'green');
        results.passed++;
        results.tests.push({ name: 'PATCH /api/incidents/[id] - Resolve', status: 'PASS' });
      } else {
        log(`  ✗ Status not updated. Current: ${status}`, 'red');
        results.failed++;
        results.tests.push({ name: 'PATCH /api/incidents/[id] - Resolve', status: 'FAIL' });
      }
    } else {
      results.failed++;
      results.tests.push({ name: 'PATCH /api/incidents/[id] - Resolve', status: 'FAIL' });
    }

    // Test 8: Verify resolved incident appears in filtered list
    logSection('8. GET /api/incidents?status=resolved - Verify Resolved');
    const resolvedListResult = await testEndpoint('GET', `${BASE_URL}/api/incidents?status=resolved`);
    if (resolvedListResult.success && resolvedListResult.data.ok) {
      const resolvedIncidents = resolvedListResult.data.data?.incidents || [];
      const found = resolvedIncidents.find(i => i._id === createdIncidentId);
      if (found) {
        log(`  ✓ Resolved incident found in filtered list`, 'green');
        results.passed++;
        results.tests.push({ name: 'GET /api/incidents?status=resolved', status: 'PASS' });
      } else {
        log(`  ✗ Resolved incident not found in filtered list`, 'red');
        results.failed++;
        results.tests.push({ name: 'GET /api/incidents?status=resolved', status: 'FAIL' });
      }
    } else {
      results.failed++;
      results.tests.push({ name: 'GET /api/incidents?status=resolved', status: 'FAIL' });
    }
  }

  // Test 9: Invalid ObjectID
  logSection('9. Error Handling - Invalid ObjectID');
  const invalidIdResult = await testEndpoint('GET', `${BASE_URL}/api/incidents/invalid-id`, null, 400);
  if (invalidIdResult.success && !invalidIdResult.data.ok) {
    log(`  ✓ Invalid ID rejected: ${invalidIdResult.data.error}`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents/[id] - Invalid ID', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents/[id] - Invalid ID', status: 'FAIL' });
  }

  // Test 10: Invalid filters
  logSection('10. Error Handling - Invalid Filters');
  const invalidStatusResult = await testEndpoint('GET', `${BASE_URL}/api/incidents?status=invalid`, null, 400);
  if (invalidStatusResult.success && !invalidStatusResult.data.ok) {
    log(`  ✓ Invalid status rejected`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents - Invalid status', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents - Invalid status', status: 'FAIL' });
  }

  // Summary
  logSection('VALIDATION SUMMARY');
  log(`Total Tests: ${results.passed + results.failed}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  log('\nDetailed Results:', 'blue');
  results.tests.forEach(test => {
    const color = test.status === 'PASS' ? 'green' : 'red';
    log(`  ${test.status === 'PASS' ? '✓' : '✗'} ${test.name}`, color);
  });

  if (results.failed === 0) {
    log('\n🎉 All validation tests passed!', 'green');
    return true;
  } else {
    log('\n❌ Some validation tests failed', 'red');
    return false;
  }
}

// Run validation
validateSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n✗ Validation failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });

