import { Badge } from '@/components/ui/Badge';
import { InventoryTwin } from '@/lib/digital-twin/twin-engine';

const statusColors: Record<string, string> = {
  HEALTHY: 'bg-green-500/20 text-green-400 border-green-500/40',
  WARNING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 border',
  CRITICAL: 'bg-red-500/20 text-red-100 border-red-500/40 border animate-pulse',
};

export const InventoryTwinCard = ({ item }: { item: InventoryTwin }) => {
  return (
    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 transition-all duration-300 shadow-2xl">
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
                item.status === 'CRITICAL' ? 'bg-red-500' : 'bg-indigo-500'
              } transition-all duration-1000`}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>0</span>
            <span className="text-indigo-400 font-bold">Min: {item.minLevel}</span>
            <span>Target: {item.minLevel * 2}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <p className="text-[10px] text-indigo-300 font-bold">Velocity: {item.velocity} events / recent</p>
        </div>
      </div>
    </div>
  );
};
