import { useEffect, useRef } from 'react'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

export default function BarChart({ labels, data, height = 200 }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: '#7c5cbf',
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (v) => '$ ' + (v / 1000).toFixed(0) + 'k' },
          },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [labels, data])

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
