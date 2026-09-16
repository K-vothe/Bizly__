import { useEffect, useRef } from 'react'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

const COLORS = ['#7c5cbf', '#3b82f6', '#059669', '#d97706', '#e24b4a']

export default function DoughnutChart({ labels, data, height = 220 }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: COLORS.slice(0, labels.length),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, boxWidth: 10 },
          },
        },
        cutout: '65%',
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
