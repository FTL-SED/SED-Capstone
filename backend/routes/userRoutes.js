const express = require('express')
const requireAuth = require('../middleware/auth')
const { createUser, updateUser, getUser } = require('../controllers/userController')

const router = express.Router()

router.post('/', requireAuth, createUser)
router.put('/:id', requireAuth, updateUser)
router.get('/:id', requireAuth, getUser)

module.exports = router
