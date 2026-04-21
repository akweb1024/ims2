import { Badge } from '@/components/ui/Badge';
import { EmployeeTwin } from '@/lib/digital-twin/twin-engine';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/40',
  OVERLOADED: 'bg-red-500/20 text-red-400 border-red-500/40',
  OFFLINE_ALERT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  OFFLINE: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

export const EmployeeTwinCard = ({ employee }: { employee: EmployeeTwin }) => {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl font-bold shadow-lg text-white">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[150px]">{employee.name}</h3>
            <p className="text-xs text-white/50">ID: {employee.id.slice(0, 8)}</p>
          </div>
        </div>
        <Badge className={`${statusColors[employee.status]} border px-3 py-1 font-medium`}>
          {employee.status}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1 text-white/70">
            <span>Operational Bandwidth</span>
            <span>{employee.bandwidth}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
              style={{ width: `${employee.bandwidth}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Active Tasks</p>
            <p className="text-xl font-bold text-white">{employee.taskCount}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Last Sync</p>
            <p className="text-xs font-medium text-white/80">{new Date(employee.lastActive).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
      
      {employee.status === 'ACTIVE' && (
        <span className="absolute top-4 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      )}
    </div>
  );
};
