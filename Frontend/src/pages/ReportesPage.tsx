import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Calendar,
  Percent,
  Download,
  Loader2,
  Package,
  Layers,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { fmtCOP, exportarCSV } from '../services/utils';
import { useApp } from '../context/AppContext';
import BarChart from '../components/BarChart';
import DoughnutChart from '../components/DoughnutChart';

export interface SerieTiempoItem {
  fecha: string;
  creado_en?: string;
  total: number;
  transacciones: number;
}

export interface ProductoTopItem {
  id_producto: number;
  nombre: string;
  sku: string;
  cantidad_vendida: number;
  unidades?: number;
  ingresos: number;
}

export interface MetodoPagoItem {
  metodo: string;
  label?: string;
  total: number;
  transacciones: number;
}

export interface ReporteResumen {
  rango: {
    desde: string;
    hasta: string;
  };
  ventas_totales: number;
  subtotal: number;
  impuestos: number;
  total_transacciones: number;
  ticket_promedio: number;
  serie_tiempo: SerieTiempoItem[];
  productos_top: ProductoTopItem[];
  metodos_pago: MetodoPagoItem[];
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultDesdeString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

export default function ReportesPage() {
  const { state } = (useApp() as any) || {};
  const ventas = state?.ventas || [];

  const [desde, setDesde] = useState(getDefaultDesdeString());
  const [hasta, setHasta] = useState(getTodayString());
  const [loading, setLoading] = useState(true);
  const [reporte, setReporte] = useState<ReporteResumen>({
    rango: { desde: getDefaultDesdeString(), hasta: getTodayString() },
    ventas_totales: 0,
    subtotal: 0,
    impuestos: 0,
    total_transacciones: 0,
    ticket_promedio: 0,
    serie_tiempo: [],
    productos_top: [],
    metodos_pago: [],
  });

  const fetchReporte = async () => {
    if (!desde || !hasta) return;
    if (desde > hasta) {
      toast.error('La fecha inicial no puede ser posterior a la fecha final');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/reportes/resumen', {
        params: { desde, hasta },
      });
      setReporte(res.data);
    } catch (err: any) {
      console.error('[ReportesPage] Error al obtener resumen de reportes:', err);
      const msg = err.response?.data?.error || err.message || 'Error al cargar el reporte';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, [desde, hasta]);

  // Filtrar ventas del estado local para exportación CSV
  const ventasFiltradas = ventas.filter((v: any) => {
    if (v.estado === 'anulada') return false;
    const f = (v.fecha_venta || v.fecha || '').split('T')[0];
    return (!desde || f >= desde) && (!hasta || f <= hasta);
  });

  // Datos para BarChart
  const barLabels = reporte.serie_tiempo.map((s) => {
    const parts = s.fecha.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : s.fecha;
  });
  const barData = reporte.serie_tiempo.map((s) => s.total);

  // Datos para DoughnutChart
  const doughnutLabels = reporte.metodos_pago.map((m) => m.metodo || m.label || 'Otro');
  const doughnutData = reporte.metodos_pago.map((m) => m.total);

  return (
    <div className="page space-y-6">
      {/* Encabezado y Selector de Fechas */}
      <div className="page-header-row flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-900 tracking-tight">
            Inteligencia de Negocios y Reportes
          </h1>
          <p className="page-sub text-sm text-slate-500 mt-1">
            Análisis financiero consolidado y evolución de transacciones en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportarCSV(ventasFiltradas)}
            disabled={!ventasFiltradas.length}
            className="btn-secondary inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar Período CSV</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtro de Fechas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Rango de análisis:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
            <span className="text-xs text-slate-400 font-medium">hasta</span>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              max={getTodayString()}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs font-medium text-sky-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Consultando datos analíticos...</span>
          </div>
        )}
      </div>

      {/* Tarjetas de Métricas Clave (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-sky-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ventas Totales
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? <div className="h-7 w-32 bg-slate-100 rounded animate-pulse" /> : fmtCOP(reporte.ventas_totales)}
          </div>
          <p className="text-xs text-slate-500">
            {reporte.total_transacciones} transacciones registradas
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Base Gravable (Subtotal)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? <div className="h-7 w-32 bg-slate-100 rounded animate-pulse" /> : fmtCOP(reporte.subtotal)}
          </div>
          <p className="text-xs text-slate-500">Ingresos netos antes de impuestos</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              IVA Recaudado
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? <div className="h-7 w-32 bg-slate-100 rounded animate-pulse" /> : fmtCOP(reporte.impuestos)}
          </div>
          <p className="text-xs text-slate-500">Total fiscal retenido</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? <div className="h-7 w-32 bg-slate-100 rounded animate-pulse" /> : fmtCOP(reporte.ticket_promedio)}
          </div>
          <p className="text-xs text-slate-500">Promedio facturado por venta</p>
        </div>
      </div>

      {/* Gráficos de Inteligencia de Negocios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Serie de Tiempo Diaria */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Evolución Diaria de Ventas
              </h2>
              <p className="text-xs text-slate-500">Facturación día a día en el período seleccionado</p>
            </div>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Serie de Tiempo
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generando visualización...</span>
              </div>
            ) : barData.length === 0 || barData.every((v) => v === 0) ? (
              <div className="text-center text-slate-400 text-xs py-10">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>No hay transacciones registradas en este período</span>
              </div>
            ) : (
              <BarChart labels={barLabels} data={barData} height={250} />
            )}
          </div>
        </div>

        {/* Distribución por Métodos de Pago */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Métodos de Pago
              </h2>
              <p className="text-xs text-slate-500">Distribución de ingresos por tipo de cobro</p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 flex items-center justify-center">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Cargando proporciones...</span>
              </div>
            ) : doughnutData.length === 0 || doughnutData.every((v) => v === 0) ? (
              <div className="text-center text-slate-400 text-xs py-10">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>Sin datos de pago en el rango</span>
              </div>
            ) : (
              <DoughnutChart labels={doughnutLabels} data={doughnutData} height={240} />
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Productos Más Vendidos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Top 5 Productos Más Vendidos
            </h2>
            <p className="text-xs text-slate-500">Ranking por volumen de unidades y facturación generada</p>
          </div>
          <Package className="w-4 h-4 text-sky-600" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-5">Producto</th>
                <th className="py-3 px-5">SKU</th>
                <th className="py-3 px-5 text-right">Unidades Vendidas</th>
                <th className="py-3 px-5 text-right">Ingresos Totales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>Cargando ranking de productos...</span>
                  </td>
                </tr>
              ) : reporte.productos_top.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No se registraron ventas de productos en este período
                  </td>
                </tr>
              ) : (
                reporte.productos_top.map((p, idx) => (
                  <tr key={p.id_producto} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-5 font-semibold text-slate-900">{p.nombre}</td>
                    <td className="py-3 px-5 font-mono text-[11px] text-slate-500">{p.sku || '—'}</td>
                    <td className="py-3 px-5 text-right font-medium">{p.cantidad_vendida} ud.</td>
                    <td className="py-3 px-5 text-right font-bold text-emerald-700">{fmtCOP(p.ingresos)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
