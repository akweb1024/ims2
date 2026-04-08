import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = 'gemini-2.5-flash';

// System prompt builder — gives Gemini full context of the application
function buildSystemPrompt(context: {
    userRole: string;
    currentPage: string;
    userName?: string;
    companyName?: string;
}): string {
    return `You are **STM Aria** — the intelligent AI assistant embedded inside **STM IMS** (Information Management System), an enterprise software platform for STM (Scientific, Technical & Medical) publishing operations.

## YOUR ROLE
You are a knowledgeable, helpful, and professional assistant. Your job is to:
1. Help users navigate and understand the platform
2. Answer questions about business data (customers, employees, invoices, etc.)
3. Describe features, workflows, and modules
4. Guide users to perform tasks efficiently
5. Provide actionable insights from available data

## CURRENT SESSION CONTEXT
- **Logged-in User**: ${context.userName || 'User'}
- **Role**: ${context.userRole}
- **Current Page**: ${context.currentPage}
- **Company**: ${context.companyName || 'All Companies'}

## APPLICATION MODULES & FEATURES

### Core / Dashboard
- Main analytics dashboard with real-time stats
- Attendance check-in/check-out
- Revenue metrics, upcoming renewals
- AI Insights Widget, Cashflow Widget, Bulletin Board

### CRM (Customer Relationship Management)
- Customers — manage customer profiles, contact info, zoneCode
- Subscriptions — journal subscriptions, renewals, pricing
- Invoices — create, view, edit, delete invoices (INR & international/export)
- Proforma Invoices — draft invoices for customers
- Agencies — manage agency partners
- Institutions — institution profiles, zoneCode tracking
- Communications — log calls, emails, in-person meetings
- Follow-ups — schedule and track follow-up actions
- Leads — lead pipeline management
- Reports — CRM performance reports

### HR Management
- Employees — full employee profiles, designation, department
- Attendance — daily check-in/out, WFH/Office modes
- Leave Management — leave requests, approvals, balances
- Payroll & Salary — salary increments, reviews
- Performance — KRA, KPI tracking, ratings
- Reimbursements — expense claims and approvals
- Staff Portal — employee self-service portal

### LMS (Learning Management System)
- Courses — create and manage training courses
- My Learning — employee learning dashboard
- Quizzes — assessments and certifications
- Assignments — task-based assignments

### Finance
- Invoices — all invoices across companies
- Revenue — revenue tracking and reconciliation
- Payments — payment records and Razorpay integration
- Reports — financial analytics

### Journals (Publishing)
- Journal Manager — manage journal titles, ISSN, pricing
- Editorial — manuscript tracking, review workflow
- Author Portal — author submissions
- Reviewer System — peer review management
- Plagiarism — plagiarism detection
- Productions — article production workflow

### Conferences
- Conference Management — event creation, scheduling
- Registrations — attendee sign-ups
- Follow-ups — post-conference activities

### Think Tank
- Idea Submission — employee idea portal
- Voting & Review — idea ranking system
- Cycle Management — quarterly/annual cycles

### IT & More
- IT Management — asset tracking, support tickets
- Projects — project management
- Tasks / My Tasks — task tracking
- Logistics — dispatch and supply chain
- Knowledge Base — internal wiki
- Vault — secure document storage
- Service Desk — IT helpdesk tickets
- Monitoring — system monitoring (IT Management)

## NAVIGATION INSTRUCTIONS
When a user asks to go somewhere or you want to suggest navigation, you can embed a navigation command in your response like this:
[[navigate:/dashboard/hr]] — this will automatically redirect the user.

Examples:
- "Go to customers" → [[navigate:/dashboard/customers]]
- "Open HR" → [[navigate:/dashboard/hr]]
- "Show invoices" → [[navigate:/dashboard/crm/invoices]]
- "AI Consultant" → [[navigate:/dashboard/ai-consultant]]

## ROLE-BASED ACCESS
The user's role is **${context.userRole}**. Adjust responses appropriately:
- SUPER_ADMIN / ADMIN: Full access to everything
- MANAGER: Team and operational data
- FINANCE_ADMIN: Financial data focus
- HR_ADMIN: HR-specific data
- EXECUTIVE / TEAM_LEADER: Sales and CRM focus
- CUSTOMER: Only their own subscriptions and invoices
- AGENCY: Agency-related data

## COMMUNICATION STYLE
- Be **concise** and **professional** — no fluff
- Use **markdown** formatting (bold, bullet points, headings)
- Use emojis **sparingly** and only when they add value
- When fetching data, present it in a clean table or list format
- If you don't know something, say so clearly — never hallucinate data
- Prefer short answers unless the user asks for detail

## DATA FETCHING
You have tools available to fetch real-time data. Use them when:
- User asks "how many...", "show me...", "list...", "what is..."
- The answer requires live data (not general knowledge)

Always use the tools proactively rather than saying "I can't access that data."`;
}

// Tool definitions for Gemini function calling
const tools: FunctionDeclaration[] = [
    {
        name: 'getDashboardStats',
        description: 'Get current dashboard statistics including total customers, active subscriptions, revenue metrics, and recent activity counts',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: [],
        },
    },
    {
        name: 'getCustomerCount',
        description: 'Get the total number of customers and recent customer activity',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: [],
        },
    },
    {
        name: 'getEmployeeList',
        description: 'Get list of employees with their department, role, and basic info',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Number of employees to return (default 10)',
                },
            },
            required: [],
        },
    },
    {
        name: 'getRecentInvoices',
        description: 'Get recent invoices with their status, amount, and customer info',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                limit: {
                    type: SchemaType.NUMBER,
                    description: 'Number of invoices to return (default 5)',
                },
            },
            required: [],
        },
    },
    {
        name: 'getAttendanceSummary',
        description: 'Get today\'s attendance summary — who is checked in, total present count',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: [],
        },
    },
];

// Execute tool calls by calling internal APIs
async function executeTool(toolName: string, args: any, baseUrl: string, headers: Record<string, string>): Promise<string> {
    try {
        switch (toolName) {
            case 'getDashboardStats': {
                const res = await fetch(`${baseUrl}/api/dashboard/stats`, { headers });
                if (!res.ok) return 'Unable to fetch dashboard stats at this time.';
                const data = await res.json();
                const stats = data.stats || [];
                if (stats.length === 0) return 'No stats available right now.';
                return `Dashboard Statistics:\n${stats.map((s: any) => `• **${s.name}**: ${s.value}`).join('\n')}`;
            }

            case 'getCustomerCount': {
                const res = await fetch(`${baseUrl}/api/customers?limit=1`, { headers });
                if (!res.ok) return 'Unable to fetch customer data.';
                const data = await res.json();
                const total = data.total ?? data.length ?? 'Unknown';
                return `Total Customers: **${total}**`;
            }

            case 'getEmployeeList': {
                const limit = args.limit || 10;
                const res = await fetch(`${baseUrl}/api/hr/employees?limit=${limit}`, { headers });
                if (!res.ok) return 'Unable to fetch employee data.';
                const data = await res.json();
                const employees = Array.isArray(data) ? data : data.employees || [];
                if (employees.length === 0) return 'No employees found.';
                return `Employees (${employees.length} shown):\n${employees.slice(0, limit).map((e: any) =>
                    `• **${e.name || e.fullName}** — ${e.designation || e.role || 'N/A'} (${e.department?.name || 'N/A'})`
                ).join('\n')}`;
            }

            case 'getRecentInvoices': {
                const limit = args.limit || 5;
                const res = await fetch(`${baseUrl}/api/invoices?limit=${limit}`, { headers });
                if (!res.ok) return 'Unable to fetch invoice data.';
                const data = await res.json();
                const invoices = Array.isArray(data) ? data : data.invoices || [];
                if (invoices.length === 0) return 'No recent invoices found.';
                return `Recent Invoices:\n${invoices.slice(0, limit).map((inv: any) =>
                    `• **${inv.invoiceNumber || inv.id?.slice(-8)}** — ${inv.customer?.name || 'Customer'} — ${inv.currency || 'INR'} ${inv.totalAmount || inv.amount || 0} (${inv.status || 'N/A'})`
                ).join('\n')}`;
            }

            case 'getAttendanceSummary': {
                const today = new Date();
                const month = today.getMonth() + 1;
                const year = today.getFullYear();
                const res = await fetch(`${baseUrl}/api/hr/attendance?year=${year}&month=${month}`, { headers });
                if (!res.ok) return 'Unable to fetch attendance data.';
                const data = await res.json();
                const todayStr = today.toISOString().split('T')[0];
                const todayRecords = Array.isArray(data) ? data.filter((a: any) => a.date?.startsWith(todayStr)) : [];
                const checkedIn = todayRecords.filter((a: any) => a.checkIn && !a.checkOut).length;
                const checkedOut = todayRecords.filter((a: any) => a.checkOut).length;
                return `Today's Attendance Summary:\n• ✅ Currently Working: **${checkedIn}** employees\n• 🏠 Checked Out: **${checkedOut}** employees\n• 📋 Total Records Today: **${todayRecords.length}**`;
            }

            default:
                return 'Tool not available.';
        }
    } catch (err) {
        console.error(`Tool execution error for ${toolName}:`, err);
        return `Error fetching data for ${toolName}.`;
    }
}

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { messages, context } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Build auth headers for internal API calls (forward cookies for session)
        const internalHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || '',
        };

        const systemPrompt = buildSystemPrompt({
            userRole: authUser.role || context?.userRole || 'USER',
            currentPage: context?.currentPage || 'Dashboard',
            userName: authUser.email?.split('@')[0],
            companyName: context?.companyName,
        });

        // Initialize Gemini model — gemini-2.5-flash supports multimodal (vision + text)
        const model = genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            systemInstruction: systemPrompt,
            tools: [{ functionDeclarations: tools }],
        });

        // Convert messages to Gemini format — exclude last message (sent separately)
        // Gemini requires: history must start with 'user' role and alternate user/model
        const allPrevious = messages.slice(0, -1);

        // Build valid alternating history starting from the first user message
        const rawHistory = allPrevious.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const firstUserIdx = rawHistory.findIndex(m => m.role === 'user');
        const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

        const lastMessage = messages[messages.length - 1];

        // --- MULTIMODAL VISION ---
        // Accept a base64-encoded screenshot from the client (captured via html2canvas)
        // and send it to Gemini as an inline image part alongside the user's text.
        const screenshotBase64: string | undefined = body.screenshotBase64;
        const screenshotMimeType: string = body.screenshotMimeType || 'image/jpeg';

        const userParts: any[] = [];

        if (screenshotBase64) {
            // Add screenshot FIRST so Gemini processes the visual context first
            userParts.push({
                inlineData: {
                    mimeType: screenshotMimeType,
                    data: screenshotBase64,
                },
            });
            // Text label tells Gemini what this image is
            userParts.push({
                text: `[SCREEN CAPTURE of "${context?.currentPage || 'the current page'}"]\n\n${lastMessage.content}`,
            });
        } else {
            // No screenshot — text only
            userParts.push({ text: lastMessage.content });
        }

        // Start chat with valid alternating history
        const chat = model.startChat({ history });

        // Send the user message (multimodal if screenshot present)
        let result = await chat.sendMessage(userParts);
        let response = result.response;

        // Handle Gemini function calls (tool use for live data fetching)
        let toolCallCount = 0;
        const maxToolCalls = 3;

        while (response.functionCalls() && response.functionCalls()!.length > 0 && toolCallCount < maxToolCalls) {
            toolCallCount++;
            const functionCalls = response.functionCalls()!;
            const toolResults = [];

            for (const fc of functionCalls) {
                const toolResult = await executeTool(fc.name, fc.args || {}, baseUrl, internalHeaders);
                toolResults.push({
                    functionResponse: {
                        name: fc.name,
                        response: { result: toolResult },
                    },
                });
            }

            // Send tool results back to model
            result = await chat.sendMessage(toolResults);
            response = result.response;
        }

        const replyText = response.text();

        // Parse navigation commands embedded in response: [[navigate:/dashboard/hr]]
        const navMatch = replyText.match(/\[\[navigate:([^\]]+)\]\]/);
        const action = navMatch ? { type: 'navigate', href: navMatch[1].trim() } : undefined;

        // Remove navigation markers from the visible reply text
        const cleanReply = replyText.replace(/\[\[navigate:[^\]]+\]\]/g, '').trim();

        return NextResponse.json({ reply: cleanReply, action });
    } catch (error: any) {
        console.error('[AI Chat API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process AI request', details: error.message },
            { status: 500 }
        );
    }
}
