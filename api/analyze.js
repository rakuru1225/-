export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { images } = req.body;
        if (!images || images.length === 0) {
            return res.status(400).json({ error: '画像がありません' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Vercelの環境変数に GEMINI_API_KEY が設定されていません' });
        }

        const imageParts = images.map(base64 => {
            const arr = base64.split(',');
            return {
                inlineData: {
                    data: arr[1],
                    mimeType: arr[0].match(/:(.*?);/)[1]
                }
            };
        });

        const promptText = "添付された画像（問題集やノート）を読み取り、以下のJSON形式のみで回答してください。余分なテキストやマークダウンのバッククォートは含めず、純粋なJSON文字列のみを出力してください。\n{\n  \"question\": \"問題文\",\n  \"choices\": {\n    \"ア\": \"選択肢アの内容\",\n    \"イ\": \"選択肢イの内容\",\n    \"ウ\": \"選択肢ウの内容\",\n    \"エ\": \"選択肢エの内容\"\n  },\n  \"answer\": \"ア\",\n  \"explanation\": \"解説文\"\n}";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            ...imageParts
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API呼び出し失敗');
        }

        let textResponse = data.candidates[0].content.parts[0].text;
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(textResponse);

        return res.status(200).json(result);
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
