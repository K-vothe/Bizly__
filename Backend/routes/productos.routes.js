const express = require('express')
const router = express.Router()
const {
  getProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  importarProductos,
} = require('../controllers/productos.controller')

router.get('/', getProductos)
router.post('/', crearProducto)
router.put('/:id', actualizarProducto)
router.delete('/:id', eliminarProducto)
router.post('/importar', importarProductos)

module.exports = router