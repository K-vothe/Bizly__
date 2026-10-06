import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  CheckCircle2,
  ShoppingBag,
  Package,
  AlertCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export interface Producto {
  id: number;
  id_producto?: number;
  nombre: string;
  precio: number;
  stock: number;
  sku?: string;
  categoria?: string;
  estado?: string;
}

export interface Cliente {
  id: number;
  id_cliente?: number;
  nombre: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  tipo_doc?: string;
  tipo?: string;
  documento?: string;
  doc?: string;
}

export interface ItemCarrito {
  id_producto: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
  subtotal: number;
}

type MetodoPago = 'Efectivo' | 'Tarjeta' | 'Transferencia';

export default function VentasPage() {
  const appContext = useApp() as any;
  const state = appContext?.state;

  // Estados de datos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Estados de la venta
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteBusqueda, setClienteBusqueda] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');

  // Estados del selector de producto
  const [busqueda, setBusqueda] = useState<string>('');
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string>('');
  const [cantidadInput, setCantidadInput] = useState<number>(1);

  // Referencia al buscador universal para autofocus continuo
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carrito de compras
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Autofocus inicial al buscador
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Cargar datos iniciales desde AppContext o directamente de la API
  useEffect(() => {
    if (state?.productos?.length) {
      setProductos(state.productos);
    } else {
      setLoadingData(true);
      api
        .get('/productos')
        .then((res) => {
          const prods = Array.isArray(res.data) ? res.data : res.data?.productos || [];
          setProductos(prods);
        })
        .catch(() => {
          // Si falla o la ruta no existe aún, mantenemos array vacío
        })
        .finally(() => setLoadingData(false));
    }

    if (state?.clientes?.length) {
      setClientes(state.clientes);
    } else {
      api
        .get('/clientes')
        .then((res) => {
          const clis = Array.isArray(res.data) ? res.data : res.data?.clientes || [];
          setClientes(clis);
        })
        .catch(() => {});
    }
  }, [state?.productos, state?.clientes]);

  // Formateo de moneda
  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Función normalizadora (sin acentos, minúsculas)
  const normalizar = (str: string = '') =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Búsqueda Universal Predictiva (Latencia Cero) por nombre, SKU y categoría
  const productosFiltrados = useMemo(() => {
    const term = normalizar(busqueda);
    return productos.filter((p) => {
      const activo = p.estado ? p.estado.toLowerCase() === 'activo' : true;
      if (!activo) return false;
      if (!term) return true;
      return (
        normalizar(p.nombre).includes(term) ||
        normalizar(p.sku || '').includes(term) ||
        normalizar(p.categoria || '').includes(term)
      );
    });
  }, [productos, busqueda]);

  // Obtener producto actualmente seleccionado
  const productoActual = useMemo(() => {
    if (!productoSeleccionadoId) return null;
    return (
      productos.find(
        (p) => String(p.id ?? p.id_producto) === String(productoSeleccionadoId)
      ) || null
    );
  }, [productos, productoSeleccionadoId]);

  // Stock restante disponible considerando el carrito actual
  const stockRestante = useMemo(() => {
    if (!productoActual) return 0;
    const prodId = Number(productoActual.id ?? productoActual.id_producto);
    const itemEnCarrito = carrito.find((item) => item.id_producto === prodId);
    const enCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;
    return Math.max(0, productoActual.stock - enCarrito);
  }, [productoActual, carrito]);

  // Función base para añadir producto al carrito (usada tanto por botón como por lector de barras)
  const agregarProducto = (producto: Producto, cantidad: number) => {
    const prodId = Number(producto.id ?? producto.id_producto);
    if (!prodId) return;

    const itemEnCarrito = carrito.find((item) => item.id_producto === prodId);
    const enCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;
    const stockDisponible = Math.max(0, producto.stock - enCarrito);

    if (cantidad <= 0 || isNaN(cantidad)) {
      toast.error('La cantidad debe ser un número mayor a 0');
      return;
    }

    if (cantidad > stockDisponible) {
      toast.error(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${stockDisponible}`
      );
      return;
    }

    const precio = Number(producto.precio);

    setCarrito((prev) => {
      const index = prev.findIndex((item) => item.id_producto === prodId);
      if (index >= 0) {
        const updated = [...prev];
        const nuevaCantidad = updated[index].cantidad + cantidad;
        updated[index] = {
          ...updated[index],
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * precio,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id_producto: prodId,
            nombre: producto.nombre,
            precio_unitario: precio,
            cantidad,
            stock_disponible: producto.stock,
            subtotal: cantidad * precio,
          },
        ];
      }
    });

    toast.success(`"${producto.nombre}" añadido al carrito`);
    setCantidadInput(1);
    setProductoSeleccionadoId('');
    setBusqueda('');
    searchInputRef.current?.focus();
  };

  // Añadir producto desde botón
  const handleAgregarAlCarrito = () => {
    if (!productoActual) {
      toast.error('Selecciona un producto para agregar');
      return;
    }
    agregarProducto(productoActual, cantidadInput);
  };

  // Soporte para lector de código de barras y búsqueda predictiva con Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = busqueda.trim();
      if (!raw) return;

      const term = normalizar(raw);

      // 1. Búsqueda exacta por SKU
      const exactSku = productos.find(
        (p) =>
          p.sku &&
          normalizar(p.sku) === term &&
          (p.estado ? p.estado.toLowerCase() === 'activo' : true)
      );

      // 2. Si no hay SKU exacto pero hay 1 única coincidencia predictiva en memoria
      const targetProd =
        exactSku || (productosFiltrados.length === 1 ? productosFiltrados[0] : null);

      if (targetProd) {
        agregarProducto(targetProd, cantidadInput > 0 ? cantidadInput : 1);
      } else if (productosFiltrados.length > 1) {
        toast.info(
          `Hay ${productosFiltrados.length} productos coincidentes. Selecciona uno en la lista o afina la búsqueda.`
        );
      } else {
        toast.error('No se encontró ningún producto con ese SKU o criterio');
      }
    }
  };

  // Modificar cantidad de un item en el carrito por delta (+/-)
  const handleModificarCantidad = (id_producto: number, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.id_producto === id_producto) {
            const nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad <= 0) return null;
            if (nuevaCantidad > item.stock_disponible) {
              toast.error(
                `No puedes superar el stock disponible (${item.stock_disponible})`
              );
              return item;
            }
            return {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precio_unitario,
            };
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[];
    });
  };

  // Actualizar cantidad directa de un item en el carrito (evitando concatenación de strings)
  const handleSetCantidadItem = (id_producto: number, cantidad: number) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id_producto === id_producto) {
          const val = Math.max(1, Math.min(cantidad, item.stock_disponible));
          return {
            ...item,
            cantidad: val,
            subtotal: val * item.precio_unitario,
          };
        }
        return item;
      })
    );
  };

  // Eliminar item del carrito
  const handleEliminarItem = (id_producto: number) => {
    setCarrito((prev) => prev.filter((item) => item.id_producto !== id_producto));
    toast.info('Producto eliminado del carrito');
  };

  // Calcular totales
  const totalVenta = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.subtotal, 0);
  }, [carrito]);

  const totalUnidades = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.cantidad, 0);
  }, [carrito]);

  // Registrar la venta en la API con Reactividad Post-Venta
  const handleRegistrarVenta = async () => {
    if (carrito.length === 0) {
      toast.error('Agrega al menos un producto al carrito antes de registrar');
      return;
    }

    setSubmitting(true);

    const payload = {
      id_cliente: clienteId ? Number(clienteId) : null,
      metodo_pago: metodoPago,
      productos: carrito.map((item) => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
      })),
    };

    try {
      const response = await api.post('/api/ventas', payload);
      const data = response.data;

      toast.success(
        data?.message || `¡Venta #${data?.id_venta || ''} registrada con éxito!`
      );

      // Limpiar formulario y carrito
      setCarrito([]);
      setClienteId('');
      setClienteBusqueda('');
      setMetodoPago('Efectivo');
      setBusqueda('');
      setProductoSeleccionadoId('');
      setCantidadInput(1);

      // Actualizar stock localmente de inmediato (Reactividad Post-Venta)
      setProductos((prev) =>
        prev.map((p) => {
          const itemVendido = payload.productos.find(
            (pv) => pv.id_producto === (p.id ?? p.id_producto)
          );
          if (itemVendido) {
            return { ...p, stock: Math.max(0, p.stock - itemVendido.cantidad) };
          }
          return p;
        })
      );

      // Sincronizar en segundo plano con AppContext (Dashboard y métricas sin F5)
      if (typeof appContext?.cargarDatos === 'function') {
        appContext.cargarDatos();
      } else if (typeof appContext?.loadData === 'function') {
        appContext.loadData();
      }

      // Reenfocar buscador universal
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } catch (error: any) {
      console.error('[VentasPage] Error al registrar venta:', error);
      const msg =
        error.response?.data?.error ||
        error.message ||
        'Error inesperado al registrar la venta';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Título de la página */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-sky-600" />
            Punto de Venta
          </h1>
          <p className="text-sm text-gray-500">
            Registra una nueva transacción para tu empresa (Patrón POS Enterprise)
          </p>
        </div>
      </div>

      {/* PANEL SUPERIOR: Selector Inteligente de Cliente y Método de Pago */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          Información de la Transacción
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Selector Inteligente de Cliente con Combobox / Datalist */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="cliente-input"
                className="block text-sm font-medium text-gray-700"
              >
                Cliente
              </label>
              <span className="text-xs">
                {clienteId ? (
                  <span className="text-sky-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Cliente vinculado (#{clienteId})
                  </span>
                ) : (
                  <span className="text-gray-400">Consumidor Final (Opcional)</span>
                )}
              </span>
            </div>
            <div className="relative">
              <input
                id="cliente-input"
                type="text"
                list="clientes-list"
                value={clienteBusqueda}
                placeholder="Consumidor Final (escribe nombre o cédula/NIT)..."
                onChange={(e) => {
                  const val = e.target.value;
                  setClienteBusqueda(val);

                  // Buscar si coincide con algún cliente por ID, documento o nombre
                  const valClean = val.trim().toLowerCase();
                  const match = clientes.find((c) => {
                    const id = String(c.id ?? c.id_cliente);
                    const doc = (c.documento || c.doc || '').trim().toLowerCase();
                    const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.trim().toLowerCase();
                    const optionVal = `${c.nombre} ${c.apellido || ''} ${doc ? `- Doc: ${doc}` : ''}`.trim().toLowerCase();

                    return (
                      valClean === optionVal ||
                      valClean === nombreCompleto ||
                      (doc && valClean === doc) ||
                      valClean === id
                    );
                  });

                  if (match) {
                    setClienteId(String(match.id ?? match.id_cliente));
                  } else if (!val.trim()) {
                    setClienteId('');
                  }
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              />
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              {clienteBusqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setClienteBusqueda('');
                    setClienteId('');
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded"
                  title="Limpiar cliente"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <datalist id="clientes-list">
                {clientes.map((c) => {
                  const id = c.id ?? c.id_cliente;
                  const doc = c.documento || c.doc ? ` - Doc: ${c.documento || c.doc}` : '';
                  return (
                    <option
                      key={id}
                      value={`${c.nombre} ${c.apellido || ''}${doc}`.trim()}
                    />
                  );
                })}
              </datalist>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Si no seleccionas un cliente registrado, la venta se registrará a Consumidor Final.
            </p>
          </div>

          {/* Selector de Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Efectivo', 'Tarjeta', 'Transferencia'] as MetodoPago[]).map((metodo) => {
                const activo = metodoPago === metodo;
                return (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setMetodoPago(metodo)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                      activo
                        ? 'bg-sky-50 border-sky-600 text-sky-700 shadow-sm'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {metodo === 'Efectivo' && <Banknote className="w-4 h-4" />}
                    {metodo === 'Tarjeta' && <CreditCard className="w-4 h-4" />}
                    {metodo === 'Transferencia' && <ArrowLeftRight className="w-4 h-4" />}
                    <span>{metodo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN CENTRAL: Buscador Universal Predictivo y Selector de Cantidad */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          Agregar Productos (Búsqueda Universal & Lector de Barras)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Selector de producto con filtro predictivo universal */}
          <div className="md:col-span-7 space-y-2">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Escanear SKU o buscar por nombre, categoría... (Presiona Enter para agregar)"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            <select
              value={productoSeleccionadoId}
              onChange={(e) => {
                setProductoSeleccionadoId(e.target.value);
                setCantidadInput(1);
              }}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">
                {productosFiltrados.length === 0
                  ? '-- No se encontraron productos coincidentes --'
                  : `-- Selecciona un producto (${productosFiltrados.length} encontrados) --`}
              </option>
              {productosFiltrados.map((p) => {
                const id = p.id ?? p.id_producto;
                const catStr = p.categoria ? ` [${p.categoria}]` : '';
                const skuStr = p.sku ? ` (SKU: ${p.sku})` : '';
                return (
                  <option key={id} value={id} disabled={p.stock <= 0}>
                    {p.nombre}{catStr}{skuStr} - {formatCOP(p.precio)} | Stock: {p.stock}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de Cantidad Robusto */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setCantidadInput((prev) => Math.max(1, prev - 1))}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-l-lg text-gray-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={1}
                max={stockRestante || 1}
                value={cantidadInput}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAgregarAlCarrito();
                  }
                }}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const stockMaximo = stockRestante > 0 ? stockRestante : 1;
                  const nuevaCantidad = isNaN(val) || val < 1 ? 1 : Math.min(val, stockMaximo);
                  setCantidadInput(nuevaCantidad);
                }}
                className="w-full text-center py-2 bg-white border-y border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setCantidadInput((prev) =>
                    stockRestante > 0 ? Math.min(stockRestante, prev + 1) : prev + 1
                  )
                }
                className="p-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-r-lg text-gray-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {productoActual && (
              <p className="text-xs text-gray-500 mt-1">
                Disponible para agregar: <span className="font-semibold">{stockRestante}</span>
              </p>
            )}
          </div>

          {/* Botón Añadir al Carrito */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleAgregarAlCarrito}
              disabled={!productoActual || stockRestante <= 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>
        </div>
      </div>

      {/* TABLA DINÁMICA DE ITEMS Y RESUMEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabla de items */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-gray-500" />
              Items en la Venta ({totalUnidades})
            </h2>
            {carrito.length > 0 && (
              <button
                type="button"
                onClick={() => setCarrito([])}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Vaciar Carrito
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-base font-medium text-gray-600">El carrito está vacío</p>
              <p className="text-sm text-gray-400 mt-1">
                Selecciona productos arriba para agregarlos a la venta
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-center">Cantidad</th>
                    <th className="px-4 py-3 text-right">Precio Unitario</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  {carrito.map((item) => (
                    <tr key={item.id_producto} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.nombre}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleModificarCantidad(item.id_producto, -1)}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                            title="Disminuir cantidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={item.stock_disponible}
                            value={item.cantidad}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const stockMaximo = item.stock_disponible > 0 ? item.stock_disponible : 1;
                              const nuevaCantidad = isNaN(val) || val < 1 ? 1 : Math.min(val, stockMaximo);
                              handleSetCantidadItem(item.id_producto, nuevaCantidad);
                            }}
                            className="w-14 text-center py-1 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleModificarCantidad(item.id_producto, 1)}
                            disabled={item.cantidad >= item.stock_disponible}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Aumentar cantidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCOP(item.precio_unitario)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCOP(item.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarItem(item.id_producto)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RESUMEN LATERAL: Total y Botón Registrar Venta */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between h-fit space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
              Resumen de la Venta
            </h2>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Método de pago:</span>
                <span className="font-medium text-gray-900">{metodoPago}</span>
              </div>
              <div className="flex justify-between">
                <span>Productos diferentes:</span>
                <span className="font-medium text-gray-900">{carrito.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total de unidades:</span>
                <span className="font-medium text-gray-900">{totalUnidades}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
                <span className="text-base font-medium text-gray-800">Total a Pagar:</span>
                <span className="text-2xl font-extrabold text-sky-600">
                  {formatCOP(totalVenta)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleRegistrarVenta}
              disabled={submitting || carrito.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base shadow-md hover:shadow-lg transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Registrar Venta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
