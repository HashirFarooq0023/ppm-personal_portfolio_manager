interface DetailCardProps {
  label: string;
  value: string;
  highlight?: 'green' | 'red';
}

export function DetailCard({ label, value, highlight }: DetailCardProps) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className={`font-mono-tabular text-body font-medium ${
        highlight === 'green' ? 'text-psx-green' : 
        highlight === 'red' ? 'text-psx-red' : 
        'text-foreground'
      }`}>
        {value}
      </div>
    </div>
  );
}
