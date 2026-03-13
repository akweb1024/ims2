import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const pincode = searchParams.get('pincode');

        if (!pincode || pincode.length !== 6) {
            return NextResponse.json({ error: 'Invalid PIN code' }, { status: 400 });
        }

        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        if (!response.ok) {
            throw new Error(`External API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Pincode proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch pincode details', details: error.message }, { status: 500 });
    }
}
