/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  PHASE 15 — CHANGE INTELLIGENCE TEST SUITE                       ║
 * ║  Verifying AI CR Writing, Risk Scoring, & Technical Architect    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
require('dotenv').config({ path: '.env.local' });
const { aiWriteCR, analyzeRisk, aiGenerateTechnicalDesign } = require('./lib/crEngine_test_wrapper');

async function runTests() {
  console.log('\n🚀 STARTING PHASE 15 — CHANGE INTELLIGENCE TEST SUITE\n');

  // ── TEST 1: AI CR WRITER ──────────────────────────────────────────
  console.log('📝 TEST 1: AI Change Request Generation...');
  try {
    const brief = "Upgrade our Postgres database from version 13 to 15 to improve query performance.";
    const crDoc = await aiWriteCR(brief, 'database', ['Main PG Cluster', 'API Gateway']);
    
    console.log('✅ AI CR DOC GENERATED:');
    console.log(`   Title: ${crDoc.title}`);
    console.log(`   Risk Level: ${crDoc.risk_level?.toUpperCase()}`);
    console.log(`   Implementation Steps: ${crDoc.implementation_steps?.length}`);
    console.log(`   Rollback Plan: ${crDoc.rollback_plan?.substring(0, 60)}...`);
  } catch (e) { console.error('❌ TEST 1 FAILED:', e.message); }


  // ── TEST 2: AI RISK SCORING ───────────────────────────────────────
  console.log('\n📊 TEST 2: 8-Dimensional Risk Analysis...');
  try {
    const mockCR = {
      title: "Deploy new AI model to production",
      description: "Moving from GPT-3.5 to Llama-3-70b. Affects all user responses.",
      category: "application",
      change_type: "normal",
      affected_services: ["AI Engine", "Dashboard"],
      affected_teams: ["Data Science", "Core Dev"],
      affected_environments: "production",
      planned_start: new Date().toISOString(),
      planned_end: new Date().toISOString()
    };
    const risk = await analyzeRisk(mockCR);
    
    console.log('✅ AI RISK ANALYSIS COMPLETE:');
    console.log(`   Overall Score: ${risk.overall_risk_score}/100`);
    console.log(`   Level: ${risk.risk_level?.toUpperCase()}`);
    console.log(`   Blast Radius: ~${risk.blast_radius?.users_affected} users`);
    console.log(`   Recommendation: ${risk.go_no_go_recommendation}`);
  } catch (e) { console.error('❌ TEST 2 FAILED:', e.message); }


  // ── TEST 3: TECHNICAL ARCHITECT (DEVELOPER PROMPT) ───────────────
  console.log('\n🛠️ TEST 3: Technical Architect (Dev Prompt)...');
  try {
    const prompt = "Implement a rate limiter for the /api/tickets endpoint in Next.js using Upstash Redis.";
    const design = await aiGenerateTechnicalDesign(prompt, 'developer_prompt');
    
    console.log('✅ TECHNICAL DESIGN GENERATED:');
    console.log(`   Summary: ${design.summary}`);
    console.log(`   DB Changes: ${design.db_changes?.length}`);
    console.log(`   Code Files: ${design.code_snippets?.map(c => c.file).join(', ')}`);
    console.log(`   Security: ${design.security_considerations?.length} items`);
  } catch (e) { console.error('❌ TEST 3 FAILED:', e.message); }


  // ── TEST 4: TECHNICAL ARCHITECT (BRD ANALYSIS) ──────────────────
  console.log('\n📂 TEST 4: Technical Architect (BRD Analysis)...');
  try {
    const brd = "Requirement: We need a system where users can invite colleagues to their tenant workspace. Invites should expire in 48 hours and we need an audit trail of who sent what.";
    const design = await aiGenerateTechnicalDesign(brd, 'brd');
    
    console.log('✅ BRD TECHNICAL PLAN GENERATED:');
    console.log(`   Architecture: ${design.architecture_decision}`);
    console.log(`   Database: ${design.db_changes?.join(', ')}`);
    console.log(`   Verification: ${design.test_cases?.length} tests recommended`);
  } catch (e) { console.error('❌ TEST 4 FAILED:', e.message); }

  console.log('\n🏁 ALL PHASE 15 TESTS CONCLUDED.\n');
}

runTests();
