import { useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { useCreditStore } from '../stores/creditStore';

export default function CreditBalance() {
  const balance = useCreditStore((s) => s.balance);
  const startAutoRefresh = useCreditStore((s) => s.startAutoRefresh);
  const stopAutoRefresh = useCreditStore((s) => s.stopAutoRefresh);

  useEffect(() => {
    startAutoRefresh();
    return () => stopAutoRefresh();
  }, []);

  if (balance === null) return null;

  const color =
    balance < 0.01 ? 'hsl(0, 70%, 55%)' :
    balance < 1.0 ? 'hsl(40, 90%, 55%)' :
    'hsl(150, 70%, 50%)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        background: `${color}15`,
        border: `1px solid ${color}30`,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        color,
      }}
      title={`Credit balance: $${balance.toFixed(4)}`}
    >
      <DollarSign size={12} />
      {balance.toFixed(2)}
    </div>
  );
}
