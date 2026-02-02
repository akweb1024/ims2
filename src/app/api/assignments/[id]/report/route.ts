import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: 'Endpoint temporarily disabled' }, { status: 503 });
}

export async function POST() {
    return NextResponse.json({ error: 'Endpoint temporarily disabled' }, { status: 503 });
}

export async function PATCH() {
    return NextResponse.json({ error: 'Endpoint temporarily disabled' }, { status: 503 });
}
