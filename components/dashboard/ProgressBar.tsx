// components/dashboard/ProgressBar.tsx — Barra de progresso animada
export function ProgressBar({ progresso }: { progresso: number }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${progresso}%` }}
      />
    </div>
  )
}
