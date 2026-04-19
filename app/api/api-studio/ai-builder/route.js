import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt, method, url } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    // Call Groq (or any configured LLM) to generate the JSON body.
    // For NexDesk, we typically assume GROQ_API_KEY is available.
    if (!process.env.GROQ_API_KEY) {
      // Fallback AI simulation if no API key is present for the environment
      return NextResponse.json({
        jsonPayload: `{
  "note": "Groq Key not found. Simulated Response.",
  "url": "${url}",
  "method": "${method}",
  "generated_based_on": "${prompt}",
  "mock_data": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}`
      });
    }

    const aiOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an API testing assistant for NexAPI Studio. The user will provide an API url, method, and a natural language instruction.
You MUST reply ONLY with a valid JSON string that represents the request body payload.
Do NOT include markdown formatting like \`\`\`json. Return pure JSON.
If the method is GET or DELETE, return an empty JSON object {}.
Be smart about generating realistic dummy data.`
          },
          {
            role: "user",
            content: `URL: ${url}\nMethod: ${method}\nInstruction: ${prompt}`
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 1000
      })
    };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", aiOptions);
    const data = await res.json();
    
    if (data?.choices?.[0]?.message?.content) {
      const jsonResponse = data.choices[0].message.content.trim();
      return NextResponse.json({ jsonPayload: jsonResponse });
    } else {
      throw new Error("Failed to generate from Groq");
    }

  } catch (error) {
    console.error("AI Builder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
