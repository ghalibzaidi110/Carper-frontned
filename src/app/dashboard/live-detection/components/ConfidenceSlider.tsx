"use client";

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-foreground">Detection threshold</label>
        <span className="text-sm font-mono tabular-nums text-primary">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={10}
        max={90}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
        className="w-full accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
        <span>0.10</span>
        <span>more sensitive</span>
        <span>0.90</span>
      </div>
    </div>
  );
}
