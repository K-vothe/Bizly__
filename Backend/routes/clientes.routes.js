const express = require('express')

const router = express.Router()

const clientesController = require('../controllers/clientes.controller')

router.get('/', clientesController.getClientes)

router.post('/', clientesController.createCliente)

router.put('/:id', clientesController.updateCliente)

router.delete('/:id', clientesController.deleteCliente)

module.exports = router