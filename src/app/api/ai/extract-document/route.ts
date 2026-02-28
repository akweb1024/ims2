import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const companyId = user.companyId || (await req.formData()).get('companyId') as string;

        // Fetch the Gemini API Key strictly securely via integration Gateway
        const aiIntegration = await (prisma as any).companyIntegration.findUnique({
            where: {
                companyId_provider: {
                    companyId: companyId,
                    provider: 'GEMINI'
                }
            }
        });

        if (!aiIntegration || !aiIntegration.isActive || !aiIntegration.key) {
            return NextResponse.json(
                { error: 'Gemini AI is not configured or disabled. Configure the key via Settings > Integrations.' },
                { status: 403 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const instructionType = formData.get('type') as string;

        if (!file) return NextResponse.json({ error: 'No document file provided.' }, { status: 400 });

        // Build Generative AI System
        const genAI = new GoogleGenerativeAI(aiIntegration.key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Fast and image-capable

        // Extract File to base64
        const buffer = await file.arrayBuffer();
        const mimeType = file.type || 'application/pdf'; // fallback default
        const base64Data = Buffer.from(buffer).toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType
            },
        };

        // Determine prompt based on contextual intent
        let prompt = "Read this document and extract its text clearly.";
        
        if (instructionType === 'RESUME') {
            prompt = `
            You are an expert HR Data Extraction AI. 
            Analyze the following resume document. 
            Extract the data strictly in the following JSON format without any markdown wrappers or additional commentary:
            {
                "firstName": "string",
                "lastName": "string",
                "email": "string",
                "phone": "string",
                "location": "string",
                "skills": ["skill1", "skill2"],
                "experienceYears": number (estimated),
                "lastEmployer": "string",
                "educationLevel": "string"
            }
            Ensure the response is valid parsable JSON. If a value isn't found, use null or an empty array.
            `;
        } else if (instructionType === 'INVOICE') {
             prompt = `
             You are an expert Finance AI. Analyze this invoice/receipt document.
             Extract the data strictly in the following JSON format without markdown wrapper:
             {
                 "vendorName": "string",
                 "invoiceNumber": "string",
                 "date": "YYYY-MM-DD",
                 "totalAmount": number,
                 "currency": "string",
                 "lineItems": [{"description": "string", "amount": number}]
             }
             `;
        }

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        // Strip markdown backticks if the model decided to wrap the JSON
        const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        let parsedData: any;
        try {
            parsedData = JSON.parse(cleanJson);
        } catch (e) {
            console.warn("AI generated non-JSON string. Falling back to raw text.", cleanJson);
            parsedData = { raw_text: cleanJson };
        }

        return NextResponse.json({ success: true, data: parsedData });

    } catch (error: any) {
        console.error('AI Extraction Error:', error);
        return NextResponse.json({ error: error.message || 'AI Processing failed.' }, { status: 500 });
    }
}
