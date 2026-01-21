import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Get journal manager details
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const journalId = params.id;

        const journal = await prisma.journal.findUnique({
            where: { id: journalId },
            select: {
                id: true,
                name: true,
                journalManagerId: true,
                journalManager: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });

        if (!journal) {
            return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
        }

        return NextResponse.json(journal);
    } catch (error) {
        console.error('Error fetching journal manager:', error);
        return NextResponse.json({ error: 'Failed to fetch journal manager' }, { status: 500 });
    }
}

// POST - Assign journal manager
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const journalId = params.id;
        const body = await req.json();
        const { managerId } = body;

        if (!managerId) {
            return NextResponse.json({ error: 'Manager ID is required' }, { status: 400 });
        }

        // Verify manager exists and has appropriate role
        const manager = await prisma.user.findUnique({
            where: { id: managerId },
            select: { id: true, role: true, email: true, name: true }
        });

        if (!manager) {
            return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
        }

        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'].includes(manager.role)) {
            return NextResponse.json({
                error: 'User does not have appropriate role to be a journal manager'
            }, { status: 400 });
        }

        // Check if journal already has a manager
        const existingJournal = await prisma.journal.findUnique({
            where: { id: journalId },
            select: { journalManagerId: true }
        });

        if (existingJournal?.journalManagerId) {
            return NextResponse.json({
                error: 'Journal already has a manager. Remove the current manager first.'
            }, { status: 409 });
        }

        // Assign manager
        const journal = await prisma.journal.update({
            where: { id: journalId },
            data: { journalManagerId: managerId },
            include: {
                journalManager: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });

        return NextResponse.json(journal);
    } catch (error: any) {
        console.error('Error assigning journal manager:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to assign manager' }, { status: 500 });
    }
}

// DELETE - Remove journal manager
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const journalId = params.id;

        const journal = await prisma.journal.update({
            where: { id: journalId },
            data: { journalManagerId: null }
        });

        return NextResponse.json({ success: true, journal });
    } catch (error: any) {
        console.error('Error removing journal manager:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to remove manager' }, { status: 500 });
    }
}
