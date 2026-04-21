import { Badge } from '@/components/ui/Badge';
import { EmployeeTwin } from '@/lib/digital-twin/twin-engine';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/40',
  OVERLOADED: 'bg-red-500/20 text-red-400 border-red-500/40',
  OFFLINE_ALERT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  OFFLINE: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

export const EmployeeTwinCard = ({ 
  employee, 
  isHighlighted, 
  onHover, 
  onLeave 
}: { 
  employee: EmployeeTwin;
  isHighlighted?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}) => {
  return (
    <div 
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`group relative p-6 rounded-2xl transition-all duration-500 shadow-2xl border ${
        isHighlighted 
          ? 'bg-indigo-500/20 border-indigo-500 scale-[1.02] z-10 shadow-indigo-500/20' 
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg text-white transition-all duration-500 ${
            isHighlighted ? 'bg-indigo-500 scale-110' : 'bg-gradient-to-br from-indigo-500 to-purple-500'
          }`}>
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
              className={`h-full transition-all duration-1000 ${
                isHighlighted ? 'bg-white' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${employee.bandwidth}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-xl border transition-all duration-500 ${
            isHighlighted ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5'
          }`}>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Active Tasks</p>
            <p className={`text-xl font-bold transition-colors ${isHighlighted ? 'text-indigo-300' : 'text-white'}`}>{employee.taskCount}</p>
          </div>
          <div className={`p-3 rounded-xl border transition-all duration-500 ${
            isHighlighted ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5'
          }`}>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Last Sync</p>
            <p className="text-xs font-medium text-white/80">{new Date(employee.lastActive).toLocaleTimeString()}</p>
          </div>
        </div>

        {isHighlighted && employee.linkedInventoryIds.length > 0 && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-[9px] uppercase tracking-tighter text-indigo-400 font-bold mb-1">Tracking Assets</p>
            <div className="flex gap-1">
              {employee.linkedInventoryIds.map(id => (
                <div key={id} className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              ))}
            </div>
          </div>
        )}
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
