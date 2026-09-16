export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination" aria-label="Paginación">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Anterior</button>
      <span>Página {page} de {totalPages}</span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Siguiente →</button>
    </div>
  )
}
