import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { fmtDate, getInitials } from '../services/utils';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { ShieldCheck, RefreshCw, Search, Clock, User, Layers, FileText } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

function badgeColor(accion = '') {
  const upper = accion.toUpperCase();
  if (upper.includes('CREACIÓN') || upper.includes('CREÓ') || upper.includes('ACTIVA')) return 'green';
  if (upper.includes('ANULACIÓN') || upper.includes('ANULÓ') || upper.includes('ELIMIN') || upper.includes('BLOQUE')) return 'red';
  if (upper.includes('ACTUALIZ') || upper.includes('MODIFIC')) return 'amber';
  return 'blue';
}

export default function Auditoria() {
  const { state } = useApp() || {};
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Cargar auditoría real del backend al montar
  const cargarAuditoria = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auditoria?limit=100');
      const data = res.data?.auditoria || (Array.isArray(res.data) ? res.data : []);
      setRegistros(data);
    } catch (error) {
      console.error('[Auditoria] Error cargando logs:', error);
      // Fallback a los datos del context si existieran
      if (state?.auditoria?.length) {
        setRegistros(state.auditoria);
      } else {
        toast.error('No se pudieron cargar los registros de auditoría');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAuditoria();
  }, []);

  // Filtrado reactivo en memoria
  const filtered = registros.filter((a) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const user = (a.user || a.usuario_nombre || a.usuario_correo || '').toLowerCase();
    const accion = (a.accion || '').toLowerCase();
    const modulo = (a.modulo || a.tipo || '').toLowerCase();
    const detalle = (a.descripcion || a.detalle || '').toLowerCase();
    return user.includes(q) || accion.includes(q) || modulo.includes(q) || detalle.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="page space-y-6">
      {/* Encabezado Enterprise */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-sky-600" />
              Centro de Auditoría y Trazabilidad
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Fase 15
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Registro cronológico inmutable de operaciones críticas ejecutadas en el tenant.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarAuditoria}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
            placeholder="Buscar por usuario, acción, módulo o detalle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Mostrando {visible.length} de {filtered.length} eventos
        </div>
      </div>

      {/* Tabla / Timeline de Auditoría */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Fecha / Hora
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Usuario
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Módulo
                  </div>
                </th>
                <th className="px-5 py-3.5">Acción</th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Detalles de la Operación
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {loading && visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se encontraron registros de auditoría coincidentes.
                  </td>
                </tr>
              ) : (
                visible.map((a) => {
                  const usuarioStr = a.user || a.usuario_nombre || a.usuario_correo || 'Sistema';
                  const moduloStr = a.modulo || a.tipo || 'SISTEMA';
                  const accionStr = a.accion || 'OPERACION';
                  const detalleStr = a.descripcion || a.detalle || '';

                  return (
                    <tr key={a.id || a.id_auditoria} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {fmtDate(a.fecha)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold flex items-center justify-center">
                            {getInitials(usuarioStr)}
                          </div>
                          <span className="font-semibold text-slate-900 text-xs">{usuarioStr}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          {moduloStr}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge color={badgeColor(accionStr)}>{accionStr}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 max-w-md">
                        <div className="truncate" title={detalleStr}>
                          {detalleStr}
                        </div>
                        {a.detalles && (
                          <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                            {typeof a.detalles === 'string' ? a.detalles : JSON.stringify(a.detalles)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
