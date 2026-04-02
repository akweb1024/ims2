// Conversation Checklist Configuration
// This file defines the checklist items shown during customer communication logging

export interface ChecklistItem {
    id: string;
    label: string;
    weight: number; // Impact on predictions (-10 to +10)
    category: 'sentiment' | 'engagement' | 'business' | 'action';
}

export interface ChecklistCategory {
    id: string;
    title: string;
    icon: string;
    description: string;
    items: ChecklistItem[];
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
    {
        id: 'sentiment',
        title: 'Customer Sentiment',
        icon: '😊',
        description: 'How does the customer feel about your service?',
        items: [
            {
                id: 'sentiment_satisfied',
                label: 'Very satisfied with current service',
                weight: 10,
                category: 'sentiment'
            },
            {
                id: 'sentiment_pain_points',
                label: 'Mentioned specific pain points',
                weight: -5,
                category: 'sentiment'
            },
            {
                id: 'sentiment_budget_concerns',
                label: 'Expressed budget concerns',
                weight: -8,
                category: 'sentiment'
            },
            {
                id: 'sentiment_alternative',
                label: 'Considering alternatives / requested features',
                weight: -2,
                category: 'sentiment'
            }
        ]
    },
    {
        id: 'engagement',
        title: 'Engagement Level',
        icon: '🎯',
        description: 'How actively is the customer using your product?',
        items: [
            {
                id: 'engagement_active_usage',
                label: 'Actively using the product/service',
                weight: 8,
                category: 'engagement'
            },
            {
                id: 'engagement_responsive',
                label: 'Responded promptly to communication',
                weight: 6,
                category: 'engagement'
            },
            {
                id: 'engagement_technical_questions',
                label: 'Asked technical questions / gave feedback',
                weight: 7,
                category: 'engagement'
            },
            {
                id: 'engagement_low_usage',
                label: 'Low product usage mentioned',
                weight: -8,
                category: 'engagement'
            }
        ]
    },
    {
        id: 'business',
        title: 'Business Context',
        icon: '💼',
        description: 'What\'s happening in their organization?',
        items: [
            {
                id: 'business_growing',
                label: 'Organization is growing / New projects',
                weight: 8,
                category: 'business'
            },
            {
                id: 'business_decision_maker',
                label: 'Decision maker involved in call',
                weight: 9,
                category: 'business'
            },
            {
                id: 'business_multi_year',
                label: 'Discussed multi-year commitment',
                weight: 10,
                category: 'business'
            },
            {
                id: 'business_downsizing',
                label: 'Organization downsizing/restructuring',
                weight: -9,
                category: 'business'
            }
        ]
    },
    {
        id: 'action',
        title: 'Action Items',
        icon: '✅',
        description: 'What are the next steps?',
        items: [
            {
                id: 'action_demo',
                label: 'Needs demo/presentation',
                weight: 5,
                category: 'action'
            },
            {
                id: 'action_pricing',
                label: 'Requested pricing/quote/approval',
                weight: 7,
                category: 'action'
            },
            {
                id: 'action_technical',
                label: 'Wants to speak with technical team',
                weight: 6,
                category: 'action'
            },
            {
                id: 'action_meeting_scheduled',
                label: 'Scheduled follow-up meeting/review',
                weight: 8,
                category: 'action'
            }
        ]
    }
];

// Helper function to get all items as a flat array
export function getAllChecklistItems(): ChecklistItem[] {
    return CHECKLIST_CATEGORIES.flatMap(category => category.items);
}

// Helper function to get item by ID
export function getChecklistItemById(id: string): ChecklistItem | undefined {
    return getAllChecklistItems().find(item => item.id === id);
}

// Helper function to get category by ID
export function getCategoryById(id: string): ChecklistCategory | undefined {
    return CHECKLIST_CATEGORIES.find(category => category.id === id);
}
