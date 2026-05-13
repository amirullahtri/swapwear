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

    const contents = body.messages.map((msg, idx) => {
      let text = typeof msg.content === 'string'
        ? msg.content
        : msg.content.map(c => c.text || '').join('');
      if (idx === 0 && body.system) {
        text = body.system + '\n\n' + text;
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }]
      };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: body.max_tokens || 800 }
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.log('Gemini error:', JSON.stringify(data.error));
      return res.status(200).json({
        content: [{ type: 'text', text: 'Maaf, WEARBOT sedang tidak bisa menjawab. Coba lagi!' }]
      });
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
