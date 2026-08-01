import { redirect } from 'next/navigation';

// "My IT Tasks" was a third top-level entry reading as "my tasks", alongside My To-Dos and
// My Work — and it fetched exactly what My Work's tasks tab already fetches
// (/api/it/tasks?view=my). Its inline status and progress controls now live on that tab, so
// this route redirects rather than duplicating them. Kept as a route because older
// notification links and bookmarks point here.
export default function MyTasksRedirect() {
    redirect('/dashboard/my-work?tab=tasks');
}
