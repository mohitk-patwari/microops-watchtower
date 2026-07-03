/**
 * Test script for Incident API routes
 * Tests all endpoints and validation
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

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

async function testRequest(method, url, body = null, expectedStatus = 200) {
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
      log(`✓ Status: ${response.status} (expected ${expectedStatus})`, 'green');
      log(`✓ Response format: ${JSON.stringify(Object.keys(data))}`, 'green');
      return { success: true, data, status: response.status };
    } else {
      log(`✗ Status: ${response.status} (expected ${expectedStatus})`, 'red');
      log(`✗ Response: ${JSON.stringify(data)}`, 'red');
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 Starting Incident API Tests\n', 'blue');
  log(`Base URL: ${BASE_URL}`, 'yellow');

  let createdIncidentId = null;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: GET /api/incidents (empty list or existing)
  logTest('GET /api/incidents - List all incidents');
  const listResult = await testRequest('GET', `${BASE_URL}/api/incidents`);
  if (listResult.success && listResult.data.ok) {
    log(`  Found ${listResult.data.data?.incidents?.length || 0} incidents`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents', status: 'FAIL' });
  }

  // Test 2: GET /api/incidents with filters
  logTest('GET /api/incidents?status=open&priority=high');
  const filterResult = await testRequest('GET', `${BASE_URL}/api/incidents?status=open&priority=high`);
  if (filterResult.success && filterResult.data.ok) {
    log(`  Filtered results: ${filterResult.data.data?.incidents?.length || 0}`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents with filters', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents with filters', status: 'FAIL' });
  }

  // Test 3: POST /api/incidents - Create incident
  logTest('POST /api/incidents - Create new incident');
  const createBody = {
    service: 'test-service-api',
    priority: 7,
    status: 'open',
  };
  const createResult = await testRequest('POST', `${BASE_URL}/api/incidents`, createBody, 201);
  if (createResult.success && createResult.data.ok && createResult.data.data?.incident) {
    createdIncidentId = createResult.data.data.incident._id;
    log(`  Created incident ID: ${createdIncidentId}`, 'green');
    log(`  Service: ${createResult.data.data.incident.service}`, 'green');
    log(`  Priority: ${createResult.data.data.incident.priority}`, 'green');
    results.passed++;
    results.tests.push({ name: 'POST /api/incidents', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'POST /api/incidents', status: 'FAIL' });
  }

  // Test 4: GET /api/incidents/[id] - Get single incident
  if (createdIncidentId) {
    logTest(`GET /api/incidents/${createdIncidentId}`);
    const getResult = await testRequest('GET', `${BASE_URL}/api/incidents/${createdIncidentId}`);
    if (getResult.success && getResult.data.ok && getResult.data.data?.incident) {
      log(`  Retrieved incident: ${getResult.data.data.incident.service}`, 'green');
      log(`  Status: ${getResult.data.data.incident.status}`, 'green');
      results.passed++;
      results.tests.push({ name: 'GET /api/incidents/[id]', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'GET /api/incidents/[id]', status: 'FAIL' });
    }

    // Test 5: PATCH /api/incidents/[id] - Resolve incident
    logTest(`PATCH /api/incidents/${createdIncidentId} - Resolve incident`);
    const patchResult = await testRequest(
      'PATCH',
      `${BASE_URL}/api/incidents/${createdIncidentId}`,
      { status: 'resolved' },
      200
    );
    if (patchResult.success && patchResult.data.ok && patchResult.data.data?.incident) {
      const updatedStatus = patchResult.data.data.incident.status;
      if (updatedStatus === 'resolved') {
        log(`  ✓ Incident resolved successfully`, 'green');
        log(`  Status changed to: ${updatedStatus}`, 'green');
        results.passed++;
        results.tests.push({ name: 'PATCH /api/incidents/[id] - Resolve', status: 'PASS' });
      } else {
        log(`  ✗ Status not updated. Current: ${updatedStatus}`, 'red');
        results.failed++;
        results.tests.push({ name: 'PATCH /api/incidents/[id] - Resolve', status: 'FAIL' });
      }
    } else {
      results.failed++;
      results.tests.push({ name: 'PATCH /api/incidents/[id] - Resolve', status: 'FAIL' });
    }

    // Test 6: Verify resolved incident appears in filtered list
    logTest('GET /api/incidents?status=resolved - Verify resolved incident');
    const resolvedListResult = await testRequest('GET', `${BASE_URL}/api/incidents?status=resolved`);
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

  // Test 7: Invalid ObjectID
  logTest('GET /api/incidents/invalid-id - Test invalid ObjectID');
  const invalidIdResult = await testRequest('GET', `${BASE_URL}/api/incidents/invalid-id`, null, 400);
  if (invalidIdResult.success && !invalidIdResult.data.ok && invalidIdResult.data.error) {
    log(`  ✓ Invalid ID rejected: ${invalidIdResult.data.error}`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents/[id] - Invalid ID', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents/[id] - Invalid ID', status: 'FAIL' });
  }

  // Test 8: Invalid status filter
  logTest('GET /api/incidents?status=invalid - Test invalid status filter');
  const invalidStatusResult = await testRequest('GET', `${BASE_URL}/api/incidents?status=invalid`, null, 400);
  if (invalidStatusResult.success && !invalidStatusResult.data.ok && invalidStatusResult.data.error) {
    log(`  ✓ Invalid status rejected: ${invalidStatusResult.data.error}`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents - Invalid status', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents - Invalid status', status: 'FAIL' });
  }

  // Test 9: Invalid priority filter
  logTest('GET /api/incidents?priority=invalid - Test invalid priority filter');
  const invalidPriorityResult = await testRequest('GET', `${BASE_URL}/api/incidents?priority=invalid`, null, 400);
  if (invalidPriorityResult.success && !invalidPriorityResult.data.ok && invalidPriorityResult.data.error) {
    log(`  ✓ Invalid priority rejected: ${invalidPriorityResult.data.error}`, 'green');
    results.passed++;
    results.tests.push({ name: 'GET /api/incidents - Invalid priority', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'GET /api/incidents - Invalid priority', status: 'FAIL' });
  }

  // Test 10: POST with invalid service (missing)
  logTest('POST /api/incidents - Test missing service validation');
  const invalidPostResult = await testRequest('POST', `${BASE_URL}/api/incidents`, {}, 400);
  if (invalidPostResult.success && !invalidPostResult.data.ok && invalidPostResult.data.error) {
    log(`  ✓ Missing service rejected: ${invalidPostResult.data.error}`, 'green');
    results.passed++;
    results.tests.push({ name: 'POST /api/incidents - Missing service', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'POST /api/incidents - Missing service', status: 'FAIL' });
  }

  // Test 11: POST with invalid priority (out of range)
  logTest('POST /api/incidents - Test invalid priority (out of range)');
  const invalidPriorityPostResult = await testRequest(
    'POST',
    `${BASE_URL}/api/incidents`,
    { service: 'test-service', priority: 15 },
    400
  );
  if (invalidPriorityPostResult.success && !invalidPriorityPostResult.data.ok && invalidPriorityPostResult.data.error) {
    log(`  ✓ Invalid priority rejected: ${invalidPriorityPostResult.data.error}`, 'green');
    results.passed++;
    results.tests.push({ name: 'POST /api/incidents - Invalid priority', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'POST /api/incidents - Invalid priority', status: 'FAIL' });
  }

  // Test 12: PATCH with invalid status
  if (createdIncidentId) {
    logTest(`PATCH /api/incidents/${createdIncidentId} - Test invalid status`);
    const invalidPatchResult = await testRequest(
      'PATCH',
      `${BASE_URL}/api/incidents/${createdIncidentId}`,
      { status: 'invalid-status' },
      400
    );
    if (invalidPatchResult.success && !invalidPatchResult.data.ok && invalidPatchResult.data.error) {
      log(`  ✓ Invalid status rejected: ${invalidPatchResult.data.error}`, 'green');
      results.passed++;
      results.tests.push({ name: 'PATCH /api/incidents/[id] - Invalid status', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'PATCH /api/incidents/[id] - Invalid status', status: 'FAIL' });
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Tests: ${results.passed + results.failed}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  log('\nDetailed Results:', 'blue');
  results.tests.forEach(test => {
    const color = test.status === 'PASS' ? 'green' : 'red';
    log(`  ${test.status === 'PASS' ? '✓' : '✗'} ${test.name}`, color);
  });

  if (results.failed === 0) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test runner failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

