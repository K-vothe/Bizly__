import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fmtCOP } from '../services/utils';
import api from '../services/api';
import BarChart from '../components/BarChart';
import Badge from '../components/Badge';
import { Usuario } from '../components/ProtectedRoute';

export interface DashboardProps {
  onNav?: (page: string) => void;
  usuario?: Usuario | null;
}

interface DashboardSummary {
  ventasMes?: {
    total: number;
    transacciones: number;
  };
  ventasHoy?: {
    total: number;
    transacciones: number;
  };
  productos?: {
    total: number;
    stockCritico: number;
  };
  clientes?: {
    total: number;
  };
  ventasSemana?: {
    labels: string[];
    data: number[];
  };
  totalFacturadoMes?: number;
  transaccionesMes?: number;
  totalHoy?: number;
  transaccionesHoy?: number;
  totalProductos?: number;
  stockCritico?: number;
  totalClientes?: number;
}

export default function Dashboard({ onNav = () => {}, usuario }: DashboardProps) {
  const { state } = (useApp() as any) || {};
  const ventas = state?.ventas || [];
  const productos = state?.productos || [];
  const clientes = state?.clientes || [];
  const config = state?.config || {};
  const umbral = config.umbral ?? 10;
  const esAdmin = ['admin', 'administrador', 'owner'].includes((usuario?.rol || '').toLowerCase());
  const nombreUsuario = usuario?.nombreCompleto || `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get('/dashboard/summary')
      .then((res) => {
        if (isMounted) {
          setSummary(res.data);
        }
      })
      .catch((err) => {
        console.error('[Dashboard] Error al consultar summary:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingSummary(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Métricas calculadas locales como fallback
  const today = new Date().toDateString();
  const ventasHoy = ventas.filter((v: any) => new Date(v.fecha_venta || v.fecha).toDateString() === today && v.estado === 'completada');
  const misVentasHoy = ventasHoy.filter((v: any) => !nombreUsuario || v.usuarioNombre === nombreUsuario);
  const totalHoy = ventasHoy.reduce((s: number, v: any) => s + Number(v.total || 0), 0);
  const totalMioHoy = misVentasHoy.reduce((s: number, v: any) => s + Number(v.total || 0), 0);
  const mesActual = new Date().getMonth();
  const anio = new Date().getFullYear();
  const ventasMes = ventas.filter((v: any) => {
    const d = new Date(v.fecha_venta || v.fecha);
    return d.getMonth() === mesActual && d.getFullYear() === anio && v.estado === 'completada';
  });
  const totalMes = ventasMes.reduce((s: number, v: any) => s + Number(v.total || 0), 0);
  const stockBajo = productos.filter((p: any) => Number(p.stock) <= umbral);

  // Valores unificados con la respuesta real de la API /dashboard/summary
  const totalMesReal = summary?.ventasMes?.total ?? summary?.totalFacturadoMes ?? totalMes;
  const transaccionesMesReal = summary?.ventasMes?.transacciones ?? summary?.transaccionesMes ?? ventasMes.length;
  const totalHoyReal = summary?.ventasHoy?.total ?? summary?.totalHoy ?? totalHoy;
  const transaccionesHoyReal = summary?.ventasHoy?.transacciones ?? summary?.transaccionesHoy ?? ventasHoy.length;
  const totalProductosReal = summary?.productos?.total ?? summary?.totalProductos ?? productos.length;
  const stockCriticoReal = summary?.productos?.stockCritico ?? summary?.stockCritico ?? stockBajo.length;
  const totalClientesReal = summary?.clientes?.total ?? summary?.totalClientes ?? clientes.length;

  const labels7: string[] = [];
  const data7: number[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels7.push(d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }));
    const ds = d.toDateString();
    const scope = esAdmin ? ventas : ventas.filter((v: any) => !nombreUsuario || v.usuarioNombre === nombreUsuario);
    data7.push(scope.filter((v: any) => new Date(v.fecha_venta || v.fecha).toDateString() === ds && v.estado === 'completada').reduce((s: number, v: any) => s + Number(v.total || 0), 0));
  }

  // Gráfico conectado al backend (ventasSemana) o fallback
  const chartLabels = summary?.ventasSemana?.labels && summary.ventasSemana.labels.length === 7
    ? summary.ventasSemana.labels
    : labels7;
  const chartData = summary?.ventasSemana?.data && summary.ventasSemana.data.length === 7
    ? summary.ventasSemana.data
    : data7;

  const prodCount: Record<string, number> = {};
  ventas.filter((v: any) => v.estado === 'completada').forEach((v: any) => (v.items || []).forEach((it: any) => { prodCount[it.nombre] = (prodCount[it.nombre] || 0) + (it.qty || it.cantidad || 0); }));
  const topProds = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxQty = topProds[0]?.[1] || 1;

  const kpiCards = esAdmin ? [
    {
      label: 'Ingresos del mes',
      value: fmtCOP(totalMesReal),
      sub: `${transaccionesMesReal} venta(s) este mes`,
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: 'bg-sky-50 text-[#0284C7] border border-sky-100',
      borderAccent: 'border-l-4 border-l-[#0284C7]',
    },
    {
      label: 'Ventas hoy',
      value: fmtCOP(totalHoyReal),
      sub: `${transaccionesHoyReal} transaccion(es) hoy`,
      icon: <ShoppingCart className="w-5 h-5" />,
      iconBg: 'bg-[#DCFCE7] text-[#16A34A] border border-emerald-200',
      borderAccent: 'border-l-4 border-l-[#16A34A]',
    },
    {
      label: 'Productos activos',
      value: `${totalProductosReal} activos`,
      sub: stockCriticoReal > 0 ? `${stockCriticoReal} con stock crítico (≤ 5)` : 'Stock en niveles óptimos',
      badge: stockCriticoReal > 0 ? `${stockCriticoReal} crítico` : 'Normal',
      badgeClass: stockCriticoReal > 0 ? 'bg-[#FEF9C3] text-[#CA8A04] border border-[#FEF08A]' : 'bg-[#DCFCE7] text-[#16A34A] border border-emerald-200',
      icon: <Package className="w-5 h-5" />,
      iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
      borderAccent: stockCriticoReal > 0 ? 'border-l-4 border-l-[#CA8A04]' : 'border-l-4 border-l-slate-400',
    },
    {
      label: 'Clientes registrados',
      value: `${totalClientesReal} registrados`,
      sub: 'Base de clientes del negocio',
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      borderAccent: 'border-l-4 border-l-indigo-600',
    },
  ] : [
    {
      label: 'Mis ventas hoy',
      value: fmtCOP(totalMioHoy),
      sub: `${misVentasHoy.length} transacciones propias`,
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: 'bg-sky-50 text-[#0284C7] border border-sky-100',
      borderAccent: 'border-l-4 border-l-[#0284C7]',
    },
    {
      label: 'Ventas negocio hoy',
      value: fmtCOP(totalHoyReal),
      sub: `${transaccionesHoyReal} venta(s) registradas`,
      icon: <Receipt className="w-5 h-5" />,
      iconBg: 'bg-[#DCFCE7] text-[#16A34A] border border-emerald-200',
      borderAccent: 'border-l-4 border-l-[#16A34A]',
    },
    {
      label: 'Productos en catálogo',
      value: `${totalProductosReal} activos`,
      sub: `${stockCriticoReal} con stock crítico (≤ 5)`,
      badge: stockCriticoReal > 0 ? 'Stock bajo' : 'Normal',
      badgeClass: stockCriticoReal > 0 ? 'bg-[#FEF9C3] text-[#CA8A04] border border-[#FEF08A]' : 'bg-[#DCFCE7] text-[#16A34A] border border-emerald-200',
      icon: <Package className="w-5 h-5" />,
      iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
      borderAccent: stockCriticoReal > 0 ? 'border-l-4 border-l-[#CA8A04]' : 'border-l-4 border-l-slate-400',
    },
    {
      label: 'Clientes disponibles',
      value: `${totalClientesReal} clientes`,
      sub: 'Para asociar a ventas',
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      borderAccent: 'border-l-4 border-l-indigo-600',
    },
  ];

  return (
    <div className="page">
      <div className="page-header dashboard-heading">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{esAdmin ? 'Resumen general del negocio' : 'Resumen operativo de tu jornada'}</p>
        </div>
        <div className="dashboard-user">
          <strong>{nombreUsuario || 'Usuario'}</strong>
          <span>{usuario?.rol === 'owner' ? 'Propietario' : esAdmin ? 'Administrador' : 'Empleado'}</span>
        </div>
      </div>

      {/* Tarjetas KPI Enterprise */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white border border-[#E2E8F0] ${card.borderAccent} rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                {card.label}
              </span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
                {card.value}
              </div>
              <div className="text-xs text-[#64748B] mt-1.5 flex items-center justify-between gap-1">
                <span className="truncate">{card.sub}</span>
                {card.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="three-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">{esAdmin ? 'Ingresos últimos 7 días' : 'Mis ventas últimos 7 días'}</span>
          </div>
          <div className="card-body chart-body">
            <BarChart labels={chartLabels} data={chartData} height={200} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top productos</span>
          </div>
          <div className="card-body">
            {topProds.length === 0 ? (
              <p className="muted-copy">Sin ventas aún</p>
            ) : (
              <ul className="top-products-list">
                {topProds.map(([nombre, qty], i) => (
                  <li key={nombre}>
                    <div className="rank-num">{i + 1}</div>
                    <span className="top-product-name">{nombre}</span>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: `${Math.round((qty / maxQty) * 100)}%` }} />
                    </div>
                    <span className="top-product-qty">{qty} ud.</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="two-col dashboard-bottom">
        <div className="card">
          <div className="card-header">
            <span className="card-title warning-title flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#CA8A04]" />
              Stock bajo o crítico
            </span>
            <button className="link-action cursor-pointer" onClick={() => onNav('inventario')}>
              Ver todo →
            </button>
          </div>
          <div className="card-body table-card-body">
            <table>
              <tbody>
                {stockBajo.length === 0 ? (
                  <tr><td colSpan={2} className="empty-state">Todo en orden ✓</td></tr>
                ) : (
                  stockBajo.slice(0, 5).map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${Number(p.stock) <= 5 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF9C3] text-[#CA8A04]'}`}>
                          {p.stock} en stock
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ventas recientes</span>
            <button className="link-action cursor-pointer" onClick={() => onNav('ventas')}>
              Ver todo →
            </button>
          </div>
          <div className="card-body table-card-body">
            <table>
              <tbody>
                {ventas.length === 0 ? (
                  <tr><td colSpan={3} className="empty-state">Sin ventas aún</td></tr>
                ) : (
                  ventas.slice(0, 5).map((v: any) => (
                    <tr key={v.id}>
                      <td>
                        <button className="link-action cursor-pointer" onClick={() => onNav('ventas')}>
                          #{v.id}
                        </button>
                      </td>
                      <td className="align-right font-medium">{fmtCOP(v.total)}</td>
                      <td>
                        <Badge color={v.estado === 'completada' ? 'green' : 'red'}>
                          {v.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
