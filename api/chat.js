module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const contents = body.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof msg.content === 'string' ? msg.content : msg.content.map(c => c.text || '').join('') }]
    }));

    const geminiBody = {
      contents,
      generationConfig: { maxOutputTokens: body.max_tokens || 800 }
    };

    if (body.system) {
      geminiBody.systemInstruction = { parts: [{ text: body.system }] };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data).substring(0, 500));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.log('No text found, data keys:', Object.keys(data));
      return res.status(200).json({
        content: [{ type: 'text', text: 'Maaf, WEARBOT sedang tidak bisa menjawab. Coba lagi! 🙏' }]
      });
    }

    return res.status(200).json({
      content: [{ type: 'text', text }]
    });
  } catch (error) {
    console.log('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
