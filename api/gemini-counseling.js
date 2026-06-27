export default async function handler(req, res) {
  // 1. 프론트엔드에 API 키를 넣으면 개발자 도구에서 노출될 수 있다.
  // 2. Gemini API 호출은 Vercel Serverless Function에서 처리한다.
  // 3. .env 파일은 GitHub에 올리지 않는다.
  // 4. Vercel 배포 시에는 Project Settings의 Environment Variables에 GEMINI_API_KEY를 등록해야 한다.
  // 5. Gemini로 전송하는 데이터는 이름, 학번, 사진 경로를 제외한 최소 정보로 제한한다.

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { studentAlias, gradeSummary, learningTraits, teacherConcern } = req.body;

  if (!studentAlias || !gradeSummary || !learningTraits || !teacherConcern) {
    return res.status(400).json({ success: false, error: '필수 값이 누락되었습니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' });
  }

  const prompt = `
당신은 "AI 학생 상담 전략 도우미"입니다. 
교사가 학생의 상황을 종합적으로 고려하여 대화할 수 있도록 돕는 역할을 합니다.

원칙:
1. 학생을 단정적으로 판단하거나 진단하지 마세요.
2. "의지가 부족하다", "주의력 문제가 있다", "심리적 문제가 있다"처럼 단정하는 표현을 피하세요.
3. 교사가 학생을 이해하고 대화할 수 있도록 돕는 방향으로 응답하세요.
4. 상담 전략은 참고용이며, 최종 판단은 교사가 한다는 점을 염두에 두세요.

아래는 학생의 데이터와 교사의 상담 고민입니다.

* 학생: ${studentAlias}
* 성적 요약: ${gradeSummary}
* 학습 특성 요약: ${learningTraits}
* 교사의 고민: ${teacherConcern}

반드시 다음 형식(목차)을 지켜서 마크다운으로 응답하세요.
1. 현재 상황 요약
2. 학생 데이터 기반 해석
3. 상담 접근 전략
4. 교사가 던질 수 있는 질문 3개
5. 피해야 할 말 또는 주의점
6. 다음 수업에서 해볼 수 있는 작은 지원
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Gemini API request failed:', error);
    return res.status(500).json({ success: false, error: 'AI 상담 전략을 불러오지 못했습니다.' });
  }
}
