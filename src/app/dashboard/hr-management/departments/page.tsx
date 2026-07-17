'use client';

import { useState, useEffect } from 'react';
import DepartmentsBoard from '@/components/dashboard/hr/DepartmentsBoard';

export default function DepartmentsPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
    }, []);

    return <DepartmentsBoard userRole={userRole} variant="page" />;
}
