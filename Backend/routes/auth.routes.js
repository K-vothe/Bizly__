const express = require('express')
const router = express.Router()

const authController = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth')
const rateLimit = require('../middleware/rateLimit')

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })
const mailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })

router.post('/registro', authLimiter, authController.registro)
router.post('/verificar-correo', authLimiter, authController.verificarCorreo)
router.post('/reenviar-verificacion', mailLimiter, authController.reenviarVerificacion)
router.post('/login', authLimiter, authController.login)
router.post('/refresh', authLimiter, authController.refresh)
router.post('/logout', authenticate, authController.logout)
router.post('/logout-all', authenticate, authController.logoutAll)
router.get('/me', authenticate, authController.me)
router.delete('/cuenta', authenticate, authLimiter, authController.eliminarCuenta)
router.post('/recuperar', mailLimiter, authController.recuperar)
router.post('/reset-password', authLimiter, authController.resetPassword)

module.exports = router
