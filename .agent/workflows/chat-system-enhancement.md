---
description: Complete and Refine Chat System with Customer Integration
---

# Chat System Enhancement Plan

## Overview
Enhance the existing chat system to support:
1. Employee-to-Employee messaging
2. Employee-to-Customer messaging
3. Group chats (restricted creation to SUPER_ADMIN, ADMIN, MANAGER, TEAM_LEADER)
4. Better UI/UX for distinguishing chat types

## Implementation Steps

### 1. Update Chat Rooms API (`/api/chat/rooms/route.ts`)
- Add role-based validation for group creation
- Add customer filtering logic
- Include customer profile data in room responses

### 2. Update Chat Page UI (`/app/dashboard/chat/page.tsx`)
- Add customer list fetching
- Separate employee and customer selection
- Add visual indicators for chat types (employee vs customer vs group)
- Implement role-based group creation UI

### 3. Enhance Room Display
- Show customer organization/institution names
- Display employee departments
- Add icons for different chat types
- Improve room naming logic

### 4. Add Customer Chat Filtering
- Only show customers assigned to the employee
- For managers/admins, show all company customers

### 5. Testing Checklist
- ✓ Employees can chat with each other
- ✓ Employees can chat with assigned customers
- ✓ Only authorized roles can create groups
- ✓ Group names are properly displayed
- ✓ Customer chats show organization info
- ✓ Real-time message updates work
- ✓ Notifications are sent correctly

## Technical Details

### Role Permissions
- **SUPER_ADMIN, ADMIN**: Can create groups, chat with anyone
- **MANAGER, TEAM_LEADER**: Can create groups, chat with team and customers
- **EXECUTIVE**: Can only create 1:1 chats, chat with assigned customers
- **CUSTOMER**: Can chat with assigned employees

### Database Schema (Already Exists)
- ChatRoom: isGroup, name, companyId
- ChatParticipant: roomId, userId
- ChatMessage: roomId, senderId, content
- User: role, companyId
- CustomerProfile: userId, assignedToUserId

### UI Enhancements
- Customer icon: 👤
- Employee icon: 💼
- Group icon: 👥
- Organization badge for customers
- Department badge for employees
