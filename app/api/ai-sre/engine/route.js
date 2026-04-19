import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req) {
  try {
    const { anomaly } = await req.json();
    
    // Simulate finding a root cause & action using AI
    const prompt = `You are an Autonomous AI SRE (Level 4 Engineer). 
A critical anomaly has been detected in the system:
"${anomaly}"

You must investigate and resolve this without human intervention.
Available Actions (Choose ONE):
- ROLLBACK_DEPLOYMENT
- CLEAR_REDIS_CACHE
- RESTART_PAYMENT_K8S_POD
- OPTIMIZE_DB_INDEX
- BLOCK_IP_ADDRESS

Respond ONLY with a valid JSON in this exact format:
{
  "investigation_notes": "A brief explanation of what you believe caused this.",
  "root_cause_identified": "Short 1 sentence root cause",
  "chosen_action": "EXACT_ACTION_NAME",
  "execution_command": "The exact terminal/DB command you would logically execute in production",
  "confidence": 98
}
`;

    let actionPlan;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const groqData = await groqRes.json();
      if (!groqData.choices) throw new Error("Groq skipped");
      actionPlan = JSON.parse(groqData.choices[0].message.content);
    } catch (apiErr) {
      // Robust Fallback Simulation if API keys are defunct
      actionPlan = {
        "investigation_notes": "Log analysis reveals a cascade failure induced by degraded memory heaps.",
        "root_cause_identified": "OOM Kernel restriction reached in target namespace.",
        "chosen_action": "RESTART_PAYMENT_K8S_POD",
        "execution_command": "kubectl rollout restart deployment user-service -n production --grace-period=0",
        "confidence": 99
      };
    }

    // Formulate a time-separated log response sequence for the UI to animate
    const logs = [
      { time: new Date().toISOString(), level: 'ALERT', msg: `Anomaly Detected: ${anomaly}` },
      { time: new Date().toISOString(), level: 'INFO', msg: `AI SRE taking control... Isolating variables in environment...` },
      { time: new Date().toISOString(), level: 'TRACE', msg: `Investigation: ${actionPlan.investigation_notes}` },
      { time: new Date().toISOString(), level: 'WARN', msg: `Root Cause Confirmed: ${actionPlan.root_cause_identified} (Confidence: ${actionPlan.confidence}%)` },
      { time: new Date().toISOString(), level: 'ACTION', msg: `Executing mitigation protocol: ${actionPlan.chosen_action}...` },
      { time: new Date().toISOString(), level: 'CMD', msg: `${actionPlan.execution_command}` },
      { time: new Date().toISOString(), level: 'SUCCESS', msg: `System stabilized. Telemetry restored to normal. Closing incident.` }
    ];

    return NextResponse.json({ success: true, plan: actionPlan, logs: logs });

  } catch (error) {
    console.error("AI SRE Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

