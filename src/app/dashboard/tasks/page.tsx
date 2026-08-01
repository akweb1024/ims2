import { redirect } from 'next/navigation';

// "My To-Dos" (the personal Task model) is now the To-Dos tab of My Work, which carries its
// create / complete / delete actions. Kept as a route so existing links keep working.
export default function TasksRedirect() {
    redirect('/dashboard/my-work?tab=todos');
}
