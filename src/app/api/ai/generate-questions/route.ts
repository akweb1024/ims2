import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthenticatedUser } from '@/lib/auth';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const data = await request.json(); 
        const { jobDescription, candidateSkills, roundType, numQuestions = 5, categories } = data;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI is not configured' }, { status: 503 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
            You are an expert HR Technical Recruiter. Based on the following inputs, generate exactly ${numQuestions} highly relevant interview questions tailored to the candidate and the job.

            **Job Description/Requirements:**
            ${jobDescription || 'N/A'}

            **Candidate Skills/Experience:**
            ${candidateSkills || 'N/A'}

            **Interview Round Type:**
            ${roundType || 'General HR Round'}
            
            **Categories:**
            ${categories?.join(', ') || 'General, Technical, Cultural'}

            **Instructions:**
            1. Return strictly an array of JSON objects without Markdown wrapping.
            2. Each object MUST have:
               "id": a unique string (e.g., q1, q2),
               "question": the question text,
               "category": one of the provided categories matching the question context,
               "difficulty": "Easy", "Medium", or "Hard",
               "rubric": A short array of strings on what to look for in a good answer,
               "followups": An array of optional follow-up questions
               "required": true/false (make core ones true)
               
            Example:
            [
              {
                "id": "q1",
                "question": "Tell me about a time you solved a complex backend issue.",
                "category": "Technical",
                "difficulty": "Medium",
                "rubric": ["Explained the problem clearly", "Identified root cause", "Discussed trade-offs"],
                "followups": ["What tools did you use to monitor the fix?"],
                "required": true
              }
            ]
            
            Do NOT wrap the result in \`\`\`json. Return the raw array string directly.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        let questions;
        try {
            questions = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, ''));
        } catch (e) {
            console.error('AI JSON parse failed:', responseText);
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

        return NextResponse.json(questions);
    } catch (error) {
        console.error('AI Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
    }
}
