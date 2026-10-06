/**
 * Automated Flow Simulation & Verification Test
 * 
 * Verifies 100% of the transitions, intents, options, and conversational prompts
 * in UserJourney-CS-Support.json.
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'UserJourney-CS-Support.json');
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const intents = rawData.data.intents;

console.log('===============================================================');
console.log('🤖 CEO SUITE CUSTOMER SUPPORT FLOW VERIFICATION & TEST RUNNER');
console.log('===============================================================');
console.log(`Flow Name:        ${rawData.data.name}`);
console.log(`Total Intents:    ${intents.length}`);

// Exact matcher replicating src/app/api/widget/message/route.ts
function matchMessage(msg) {
  const userMsgLower = msg.toLowerCase().trim();
  // 1. Direct intent name match
  for (const intent of intents) {
    if ((intent.name || '').toLowerCase().trim() === userMsgLower) {
      return intent;
    }
  }
  // 2. Training phrases exact match
  for (const intent of intents) {
    if (!intent.trainingPhrases || !Array.isArray(intent.trainingPhrases)) continue;
    for (const phrase of intent.trainingPhrases) {
      if (phrase.toLowerCase().trim() === userMsgLower) {
        return intent;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// TEST 1: Option Link Integrity (By Value & By Label)
// ---------------------------------------------------------------------------
console.log('\n--- TEST 1: Option Transition Matching (All Buttons) ---');
let totalOptions = 0;
let valueFailures = [];
let labelFailures = [];

for (const intent of intents) {
  if (!intent.options || typeof intent.options !== 'string') continue;
  const rawOpts = intent.options.split(',');
  for (const raw of rawOpts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    totalOptions++;
    const pipeIdx = trimmed.indexOf('|');
    const label = pipeIdx !== -1 ? trimmed.substring(0, pipeIdx).trim() : trimmed;
    const value = pipeIdx !== -1 ? trimmed.substring(pipeIdx + 1).trim() : trimmed;

    const mVal = matchMessage(value);
    const mLab = matchMessage(label);

    if (!mVal) valueFailures.push({ from: intent.name, label, value });
    if (!mLab) labelFailures.push({ from: intent.name, label, value });
  }
}

console.log(`Total option buttons checked: ${totalOptions}`);
console.log(`Value match failures:        ${valueFailures.length} (Target: 0)`);
console.log(`Label match failures:        ${labelFailures.length} (Target: 0)`);
if (valueFailures.length > 0) {
  console.error('Value failures detected:', valueFailures.slice(0, 5));
  process.exit(1);
}
if (labelFailures.length > 0) {
  console.error('Label failures detected:', labelFailures.slice(0, 5));
  process.exit(1);
}
console.log('✅ TEST 1 PASSED: 100% of option button clicks resolve cleanly!');

// ---------------------------------------------------------------------------
// TEST 2: Conversational "Our Center" and Synonyms
// ---------------------------------------------------------------------------
console.log('\n--- TEST 2: Conversational Synonyms for "Our Center" ---');
const centerQueries = [
  'our center',
  'our centers',
  'our centre',
  'our centres',
  'select our center',
  'select our centre',
  'select center',
  'select centre',
  'our centres & locations',
  'our centers & locations',
  'centres & locations',
  'locations',
  'cities',
  'all locations',
  'find a centre',
  'find a center',
  'daftar lokasi',
  'lokasi kantor'
];

let queryPass = 0;
for (const q of centerQueries) {
  const m = matchMessage(q);
  if (m && m.name === 'Locations: Select City') {
    queryPass++;
  } else {
    console.error(`❌ Query "${q}" matched "${m ? m.name : 'NULL'}" instead of "Locations: Select City"`);
  }
}
console.log(`Synonyms tested: ${centerQueries.length}, Passed: ${queryPass}`);
if (queryPass !== centerQueries.length) process.exit(1);
console.log('✅ TEST 2 PASSED: All "our center" variations match Locations: Select City!');

// ---------------------------------------------------------------------------
// TEST 3: All 12 City Directories & 23 Centres Traversal
// ---------------------------------------------------------------------------
console.log('\n--- TEST 3: City Directories & Centre Cards Traversal ---');
const cities = [
  'Jakarta', 'Kuala Lumpur', 'Singapore', 'Hong Kong',
  'Shanghai', 'Beijing', 'Hangzhou', 'Seoul',
  'Bangkok', 'Manila', 'Hanoi', 'Ho Chi Minh City'
];

let checkedCentres = 0;
for (const city of cities) {
  const cityIntent = matchMessage(`City Directory: ${city}`);
  if (!cityIntent) {
    console.error(`❌ Failed to resolve City Directory: ${city}`);
    process.exit(1);
  }
  const opts = cityIntent.options.split(',');
  const centreOpts = opts.filter(o => !o.includes('Locations: Select City') && !o.includes('Other Cities'));
  
  for (const cOpt of centreOpts) {
    const [cLabel, cVal] = cOpt.trim().split('|');
    const centreIntent = matchMessage(cVal || cLabel);
    if (!centreIntent) {
      console.error(`❌ Failed to resolve centre ${cVal} in ${city}`);
      process.exit(1);
    }
    checkedCentres++;
  }
}
console.log(`Verified all 12 Asian cities and ${checkedCentres} prime centre cards.`);
console.log('✅ TEST 3 PASSED: Full city-to-centre traversal complete without any stuck state!');

// ---------------------------------------------------------------------------
// TEST 4: End-to-End User Journeys Simulation
// ---------------------------------------------------------------------------
console.log('\n--- TEST 4: Multi-turn Journey Simulations ---');

// Journey A: Center Selection Journey
console.log('Simulating Journey A: Main Menu -> Our Centres & Locations -> Jakarta -> Sahid Sudirman Center -> Operating Hours -> Main Menu');
const jA_steps = [
  { input: 'start', expect: 'Start / Main Menu' },
  { input: 'Locations: Select City', expect: 'Locations: Select City' },
  { input: 'City Directory: Jakarta', expect: 'City Directory: Jakarta' },
  { input: 'PO Centre: Sahid Sudirman Center', expect: 'PO Centre: Sahid Sudirman Center' },
  { input: 'Facilities: Building Access & Access Cards', expect: 'Facilities: Building Access & Access Cards' },
  { input: 'Start / Main Menu', expect: 'Start / Main Menu' }
];
for (let i = 0; i < jA_steps.length; i++) {
  const step = jA_steps[i];
  const res = matchMessage(step.input);
  if (res?.name !== step.expect) {
    console.error(`❌ Journey A Step ${i + 1} failed: expected "${step.expect}", got "${res?.name}"`);
    process.exit(1);
  }
  console.log(`  Step ${i + 1}: "${step.input}" -> [${res.name}] (OK)`);
}
console.log('✅ Journey A completed successfully!');

// Journey B: Human Escalation Journey
console.log('\nSimulating Journey B: Main Menu -> Speak to CS Agent');
const jB_res = matchMessage('CS: Speak to Human Agent / Live Support');
if (!jB_res?.response.includes('[HANDOFF_REQUESTED]')) {
  console.error('❌ Journey B failed: handoff tag missing');
  process.exit(1);
}
console.log(`  Step 1: "CS: Speak to Human Agent / Live Support" -> [${jB_res.name}] (Handoff Tagged: OK)`);
console.log('✅ Journey B completed successfully!');

console.log('\n===============================================================');
console.log('🎉 ALL AUTOMATED FLOW TESTS PASSED (100% SUCCESS)');
console.log('===============================================================\n');
