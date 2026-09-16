export default function Toast({ toast, onClose }) {
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type || 'info'}`} role="status">
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar mensaje">×</button>
    </div>
  )
}
