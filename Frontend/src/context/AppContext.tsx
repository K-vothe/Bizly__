import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react'
import { defaultState } from '../data/defaultState'
import api, { apiFetch } from '../services/api'

const AppContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.payload }
    case 'SET_PRODUCTOS':
      return { ...state, productos: action.data }
    case 'SET_CLIENTES':
      return { ...state, clientes: action.data }
    case 'SET_VENTAS':
      return { ...state, ventas: action.data }
    case 'SET_AUDITORIA':
      return { ...state, auditoria: action.data }
    case 'ADD_PRODUCTO':
      return { ...state, productos: [...state.productos, action.data] }
    case 'UPDATE_PRODUCTO':
      return { ...state, productos: state.productos.map((p) => p.id === action.data.id ? { ...p, ...action.data } : p) }
    case 'DELETE_PRODUCTO':
      return { ...state, productos: state.productos.filter((p) => p.id !== action.id) }
    case 'ADD_CLIENTE':
      return { ...state, clientes: [...state.clientes, action.data] }
    case 'UPDATE_CLIENTE':
      return { ...state, clientes: state.clientes.map((c) => c.id === action.data.id ? action.data : c) }
    case 'DELETE_CLIENTE':
      return { ...state, clientes: state.clientes.filter((c) => c.id !== action.id) }
    case 'ADD_VENTA': {
      const productos = state.productos.map((p) => {
        const item = action.data.items.find((i) => i.pid === p.id)
        return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p
      })
      const clientes = state.clientes.map((c) =>
        c.id === action.data.clienteId
          ? { ...c, totalCompras: (c.totalCompras || 0) + action.data.total, numCompras: (c.numCompras || 0) + 1 }
          : c
      )
      return { ...state, ventas: [action.data, ...state.ventas], productos, clientes }
    }
    case 'ANULAR_VENTA': {
      const sale = state.ventas.find((v) => v.id === action.id)
      if (!sale || sale.estado === 'anulada') return state
      const ventas = state.ventas.map((v) => v.id === action.id ? { ...v, estado: 'anulada' } : v)
      const productos = state.productos.map((p) => {
        const item = (sale.items || []).find((i) => i.pid === p.id)
        return item ? { ...p, stock: p.stock + item.qty } : p
      })
      const clientes = state.clientes.map((c) =>
        c.id === sale.clienteId
          ? { ...c, totalCompras: Math.max(0, (c.totalCompras || 0) - sale.total), numCompras: Math.max(0, (c.numCompras || 0) - 1) }
          : c
      )
      return { ...state, ventas, productos, clientes }
    }
    case 'GUARDAR_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } }
    default:
      return state
  }
}

export function AppProvider({ children, usuario }) {
  const [state, dispatch] = useReducer(reducer, defaultState)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function notify(message, type = 'info') {
    setToast({ message, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3800)
  }

  async function cargarDatos() {
    const calls = [
      api.get('/productos').then((res) => (Array.isArray(res.data) ? res.data : res.data?.productos || [])).catch(() => apiFetch('/productos').catch(() => [])),
      api.get('/clientes').then((res) => (Array.isArray(res.data) ? res.data : res.data?.clientes || [])).catch(() => apiFetch('/clientes').catch(() => [])),
      api.get('/ventas').then((res) => (Array.isArray(res.data) ? res.data : res.data?.ventas || [])).catch(() => apiFetch('/ventas').catch(() => [])),
      api.get('/empresa').then((res) => res.data).catch(() => apiFetch('/empresa').catch(() => null)),
    ]
    if (['admin', 'administrador', 'owner'].includes(usuario?.rol || '')) {
      calls.push(api.get('/auditoria').then((res) => (Array.isArray(res.data) ? res.data : res.data?.auditoria || [])).catch(() => apiFetch('/auditoria').catch(() => [])))
    }

    try {
      const [productos, clientes, ventas, empresaData, auditoria = []] = await Promise.all(calls)
      const config = empresaData ? {
        ...defaultState.config,
        ...empresaData,
        nombre: empresaData.nombre || empresaData.nombre_empresa || defaultState.config.nombre,
        nombre_empresa: empresaData.nombre_empresa || empresaData.nombre || defaultState.config.nombre,
        tel: empresaData.telefono || empresaData.tel || '',
        telefono: empresaData.telefono || empresaData.tel || '',
        email: empresaData.correo || empresaData.email || '',
        correo: empresaData.correo || empresaData.email || '',
        dir: empresaData.direccion || empresaData.dir || '',
        direccion: empresaData.direccion || empresaData.dir || '',
        iva: empresaData.iva !== undefined ? Number(empresaData.iva) : 19,
        plan: empresaData.plan || 'Starter',
        nit: empresaData.nit || '',
      } : defaultState.config

      dispatch({ type: 'LOAD', payload: { productos, clientes, ventas, config, auditoria } })
    } catch (error) {
      console.error('Error cargando datos:', error)
      notify(error.response?.data?.error || error.message || 'No se pudieron cargar los datos', 'error')
    }
  }

  useEffect(() => {
    cargarDatos()
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
    // El usuario no cambia mientras el Provider está montado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function guardarProducto(payload) {
    const { id, nombre, sku, categoria, precio, stock } = payload
    try {
      if (id) {
        const res = await api.put(`/productos/${id}`, { nombre, sku, categoria, precio, stock })
        const actualizado = res.data?.producto || res.data || payload
        dispatch({ type: 'UPDATE_PRODUCTO', data: { ...payload, ...actualizado } })
        notify('Producto actualizado correctamente', 'success')
      } else {
        const res = await api.post('/productos', { nombre, sku, categoria, precio, stock })
        const nuevo = res.data?.producto || res.data
        dispatch({ type: 'ADD_PRODUCTO', data: nuevo })
        notify('Producto creado correctamente', 'success')
      }
      return true
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'No se pudo guardar el producto'
      notify(msg, 'error')
      return false
    }
  }

  async function eliminarProducto(id) {
    try {
      await api.delete(`/productos/${id}`)
      dispatch({ type: 'DELETE_PRODUCTO', id })
      notify('Producto desactivado', 'success')
      return true
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'No se pudo eliminar el producto'
      notify(msg, 'error')
      return false
    }
  }

  async function importarProductos(productos) {
    try {
      const result = await api.post('/productos/importar', { productos })
      const resData = result.data
      const freshRes = await api.get('/productos')
      const fresh = Array.isArray(freshRes.data) ? freshRes.data : freshRes.data?.productos || []
      dispatch({ type: 'SET_PRODUCTOS', data: fresh })
      const importados = resData?.importados ?? resData?.procesados ?? productos.length
      notify(`${importados} producto(s) importados`, 'success')
      return true
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'No se pudo importar el archivo'
      notify(msg, 'error')
      return false
    }
  }

  async function guardarCliente(payload) {
    try {
      if (payload.id) {
        const updated = await apiFetch(`/clientes/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        dispatch({ type: 'UPDATE_CLIENTE', data: updated })
        notify('Cliente actualizado correctamente', 'success')
      } else {
        const nuevo = await apiFetch('/clientes', { method: 'POST', body: JSON.stringify(payload) })
        dispatch({ type: 'ADD_CLIENTE', data: nuevo })
        notify('Cliente creado correctamente', 'success')
      }
      return true
    } catch (error) {
      notify(error.message || 'No se pudo guardar el cliente', 'error')
      return false
    }
  }

  async function eliminarCliente(id) {
    try {
      await apiFetch(`/clientes/${id}`, { method: 'DELETE' })
      dispatch({ type: 'DELETE_CLIENTE', id })
      notify('Cliente desactivado', 'success')
      return true
    } catch (error) {
      notify(error.message || 'No se pudo eliminar el cliente', 'error')
      return false
    }
  }

  async function registrarVenta(payload) {
    try {
      const result = await apiFetch('/ventas', { method: 'POST', body: JSON.stringify(payload) })
      const venta = {
        id: result.id,
        id_venta: result.id_venta,
        fecha: new Date().toISOString(),
        clienteId: payload.clienteId,
        clienteNombre: result.clienteNombre,
        pago: payload.pago,
        items: result.items.map((i) => ({ pid: i.pid, nombre: i.nombre, precio: i.precio, qty: i.qty })),
        total: result.total,
        estado: 'completada',
        usuarioNombre: usuario?.nombreCompleto || usuario?.nombre || 'Usuario',
      }
      dispatch({ type: 'ADD_VENTA', data: venta })
      notify(`Venta ${result.id} registrada`, 'success')
      return venta
    } catch (error) {
      notify(error.message || 'No se pudo registrar la venta', 'error')
      return null
    }
  }

  async function anularVenta(id, idVenta) {
    try {
      await apiFetch(`/ventas/${idVenta}/anular`, { method: 'PUT' })
      dispatch({ type: 'ANULAR_VENTA', id })
      notify(`Venta ${id} anulada`, 'success')
      return true
    } catch (error) {
      notify(error.message || 'No se pudo anular la venta', 'error')
      return false
    }
  }

  async function guardarConfig(payload) {
    try {
      const res = await api.put('/empresa', payload).catch(() => apiFetch('/empresa', { method: 'PUT', body: JSON.stringify(payload) }))
      const data = res?.data || res
      dispatch({ type: 'GUARDAR_CONFIG', payload: data?.empresa || data || payload })
      notify('Configuración guardada', 'success')
      return true
    } catch (error) {
      notify(error.response?.data?.error || error.message || 'No se pudo guardar la configuración', 'error')
      return false
    }
  }

  async function obtenerReporte(desde, hasta) {
    return apiFetch(`/reportes/resumen?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`)
  }

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      toast,
      setToast,
      notify,
      cargarDatos,
      guardarProducto,
      eliminarProducto,
      importarProductos,
      guardarCliente,
      eliminarCliente,
      registrarVenta,
      anularVenta,
      guardarConfig,
      obtenerReporte,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp debe utilizarse dentro de AppProvider')
  return value
}
