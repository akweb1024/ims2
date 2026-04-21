import { Badge } from '@/components/ui/Badge';
import { InventoryTwin } from '@/lib/digital-twin/twin-engine';

const statusColors: Record<string, string> = {
  HEALTHY: 'bg-green-500/20 text-green-400 border-green-500/40',
  WARNING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 border',
  CRITICAL: 'bg-red-500/20 text-red-100 border-red-500/40 border animate-pulse',
};

export const InventoryTwinCard = ({ 
  item, 
  isHighlighted, 
  onHover, 
  onLeave 
}: { 
  item: InventoryTwin;
  isHighlighted?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}) => {
  return (
    <div 
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`p-6 rounded-2xl transition-all duration-500 shadow-2xl border ${
        isHighlighted 
          ? 'bg-indigo-500/20 border-indigo-500 scale-[1.02] z-10 shadow-indigo-500/20' 
          : 'bg-white/5 border-white/10 hover:border-indigo-500/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white tracking-tight truncate max-w-[180px]">{item.name}</h3>
          <p className="text-[10px] text-indigo-400 font-mono">{item.sku}</p>
        </div>
        <Badge className={`${statusColors[item.status]} px-3 text-[10px]`}>
          {item.status}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="text-3xl font-black text-white">
            {item.quantity}
            <span className="text-xs font-normal text-white/40 ml-1">UNITS</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase">Warehouse</p>
            <p className="text-sm font-medium text-white truncate max-w-[100px]">{item.warehouse}</p>
          </div>
        </div>

        <div className="relative pt-1">
          <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-white/10">
            <div 
              style={{ width: `${Math.min(100, (item.quantity / (item.minLevel * 2 || 1)) * 100)}%` }} 
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                item.status === 'CRITICAL' ? 'bg-red-500' : isHighlighted ? 'bg-white' : 'bg-indigo-500'
              } transition-all duration-1000`}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>0</span>
            <span className="text-indigo-400 font-bold">Min: {item.minLevel}</span>
            <span>Target: {item.minLevel * 2}</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
          isHighlighted ? 'bg-white/10 border-white/20' : 'bg-indigo-500/10 border-indigo-500/20'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isHighlighted ? 'bg-white' : 'bg-indigo-400'}`} />
          <p className={`text-[10px] font-bold ${isHighlighted ? 'text-white' : 'text-indigo-300'}`}>Velocity: {item.velocity} events / recent</p>
        </div>
      </div>
    </div>
  );
};
