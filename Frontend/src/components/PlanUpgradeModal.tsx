import Modal from './Modal'

export default function PlanUpgradeModal({ open, onClose, limitMessage, limitType = 'general' }) {
  if (!open) return null

  return (
    <Modal
      open={open}
      title="Límite de Suscripción Alcanzado"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button className="btn-secondary" type="button" onClick={onClose}>
            Entendido
          </button>
          <button
            className="btn-primary"
            type="button"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              borderColor: '#6366f1',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => {
              window.open('mailto:soporte@bizly.app?subject=Upgrade%20a%20Plan%20Business', '_blank')
              onClose()
            }}
          >
            <i className="ti ti-crown" />
            Actualizar a Business
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner de Límite */}
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#F59E0B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            <i className="ti ti-alert-triangle" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#92400E', fontSize: '14px', marginBottom: '2px' }}>
              {limitType === 'productos' ? 'Límite de Productos del Plan Starter' : limitType === 'usuarios' ? 'Límite de Colaboradores del Plan Starter' : 'Límite de Plan'}
            </div>
            <div style={{ color: '#B45309', fontSize: '13px', lineHeight: 1.4 }}>
              {limitMessage || 'Has alcanzado el límite máximo configurado en tu suscripción Starter.'}
            </div>
          </div>
        </div>

        {/* Tarjeta de Comparación / Beneficios Business */}
        <div
          style={{
            background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #818cf8 0%, #a855f7 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
              >
                <i className="ti ti-crown" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>Plan Business Enterprise</span>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#6366F1',
                background: '#EEF2FF',
                padding: '3px 8px',
                borderRadius: '999px',
                border: '1px solid #C7D2FE',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Recomendado
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 14px 0' }}>
            Escala tus operaciones comerciales sin restricciones técnicas con nuestro paquete empresarial.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <i className="ti ti-check" style={{ color: '#10B981', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }} />
              <div>
                <strong>Productos Ilimitados:</strong> Carga masiva CSV y catálogo completo sin tope de 50 ítems.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <i className="ti ti-check" style={{ color: '#10B981', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }} />
              <div>
                <strong>Usuarios Ilimitados:</strong> Conecta a cajeros, administradores y contadores en tiempo real.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <i className="ti ti-check" style={{ color: '#10B981', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }} />
              <div>
                <strong>Auditoría Avanzada:</strong> Registro histórico detallado de anulaciones, inventario y ventas.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#334155' }}>
              <i className="ti ti-check" style={{ color: '#10B981', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }} />
              <div>
                <strong>Soporte Prioritario 24/7:</strong> Asistencia directa y copias de seguridad continuas.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
