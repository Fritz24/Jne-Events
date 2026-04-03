// Renders a simple Code-128-style visual barcode from a string (no external lib needed)
export default function Barcode({ value, width = 180, height = 40, color = "white" }) {
  // Generate a deterministic bar pattern from the string
  const bars = [];
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed += value.charCodeAt(i) * (i + 1);

  const totalBars = 60;
  const barWidth = width / totalBars;

  for (let i = 0; i < totalBars; i++) {
    // pseudo-random but deterministic per value
    const hash = ((seed * (i + 7) * 2654435761) >>> 0) % 100;
    const isFilled = hash < 55;
    bars.push(isFilled);
  }

  // Always start and end with filled bars (like real barcodes)
  bars[0] = true; bars[1] = false; bars[2] = true;
  bars[totalBars - 3] = true; bars[totalBars - 2] = false; bars[totalBars - 1] = true;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
        {bars.map((filled, i) => (
          filled ? (
            <rect
              key={i}
              x={i * barWidth}
              y={0}
              width={barWidth * 0.8}
              height={height}
              fill={color}
            />
          ) : null
        ))}
      </svg>
      <span style={{ color: color === "white" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: "9px", fontFamily: "monospace", letterSpacing: "1px" }}>
        {value}
      </span>
    </div>
  );
}