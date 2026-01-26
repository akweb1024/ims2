async function getMentors() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/lms/analytics`, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch mentors');
    }

    const data = await res.json();
    return data.mentors || [];
}

export default async function TopMentors() {
    const mentors = await getMentors();

    return (
        <div className="card-dashboard p-6">
            <h3 className="font-bold text-lg mb-4">Top Mentors</h3>
            <div className="space-y-4">
                {mentors.map((mentor: any, i: number) => (
                    <div key={mentor.id} className="flex items-center gap-4 p-3 hover:bg-secondary-50 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600">
                            {i + 1}
                        </div>
                        <div>
                            <h4 className="font-bold text-secondary-900">{mentor.name}</h4>
                            <p className="text-xs text-secondary-500">
                                {mentor._count.mentoredCourses} Courses, {mentor._count.mentoredWorkshops} Workshops
                            </p>
                        </div>
                    </div>
                ))}
                {mentors.length === 0 && <p className="text-secondary-500">No data available</p>}
            </div>
        </div>
    );
}
