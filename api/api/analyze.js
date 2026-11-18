export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: '画像がありません' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'APIキーがサーバーに設定されていません' });
        }

        const imageParts = images.map((base64Data) => ({
            inlineData: {
                data: base64Data.replace(/^data:image\/[a-z]+;base64,/, ''),
                mimeType: 'image/jpeg',
            }
        }));

        const prompt = `提供された画像から問題を作成してください。
以下のJSON形式（マークダウンやバッククォートを含めず、純粋なJSON文字列のみ）で出力してください。
{
  "question": "問題文",
  "choices": {
    "ア": "選択肢アの内容",
    "イ": "選択肢イの内容",
    "ウ": "選択肢ウの内容",
    "エ": "選択肢エの内容"
  },
  "answer": "ア",
  "explanation": "なぜそれが正解なのかの分かりやすい解説"
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, ...imageParts] }],
                generationConfig: { responseMimeType: 'application/json' }
            }),
        });

        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResult) {
            throw new Error('AIからの応答が空でした');
        }

        const parsedJson = JSON.parse(textResult);
        return res.status(200).json(parsedJson);

    } catch (error) {
        console.error('AI解析エラー:', error);
        return res.status(500).json({ error: error.message || 'AI解析に失敗しました' });
    }
}