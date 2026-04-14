const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail')

const VERIFICATION_CODE_TTL_MS = 3 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

function getPasswordRuleError(password) {
    if (password.length < 8) {
        return 'Şifre en az 8 karakter olmalıdır.'
    }
    if (!/[A-Z]/.test(password)) {
        return 'Şifre en az bir büyük harf içermelidir.'
    }
    if (!/[a-z]/.test(password)) {
        return 'Şifre en az bir küçük harf içermelidir.'
    }
    if (!/[0-9]/.test(password)) {
        return 'Şifre en az bir rakam içermelidir.'
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return 'Şifre en az bir özel karakter içermelidir.'
    }
    return null
}

router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Tüm alanlar zorunludur.' })
        }
        const passwordError = getPasswordRuleError(password)
        if (passwordError) {
            return res.status(400).json({ message: passwordError })
        }

        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return res.status(409).json({ message: 'Bu email zaten kayıtlı.' })
        }
        const hashedPassword = await bcrypt.hash(password, 12)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
        const verificationCodeExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS)

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            verificationCode,
            verificationCodeExpires,
            isVerified: false
        })

        await sendVerificationEmail(email, verificationCode)
        res.status(201).json({
            message: 'Kayıt başarılı! Email adresine doğrulama kodu gönderildi.',
            email: user.email
        })
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.', error: err.message })
    }
})

router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body

        if (!email || code === undefined || code === null || String(code).trim() === '') {
            return res.status(400).json({ message: 'E-posta ve doğrulama kodu zorunludur.' })
        }

        const user = await User.findOne({ email: String(email).trim() })

        if (!user) {
            return res.status(404).json({ message: 'Bu e-posta ile kayıt bulunamadı.' })
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Bu hesap zaten doğrulanmış. Giriş yapabilirsin.' })
        }

        const submitted = String(code).trim()
        if (!user.verificationCode || user.verificationCode !== submitted) {
            return res.status(400).json({ message: 'Doğrulama kodu hatalı.' })
        }

        if (!user.verificationCodeExpires || user.verificationCodeExpires.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Doğrulama kodunun süresi doldu. Yeni bir kayıt deneyebilir veya destek ile iletişime geçebilirsin.' })
        }

        user.isVerified = true
        user.verificationCode = null
        user.verificationCodeExpires = null
        await user.save()

        res.json({ message: 'E-posta adresin doğrulandı.' })
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.', error: err.message })
    }
})

router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body

        if (!email || String(email).trim() === '') {
            return res.status(400).json({ message: 'E-posta zorunludur.' })
        }

        const user = await User.findOne({ email: String(email).trim() })

        if (!user) {
            return res.status(404).json({ message: 'Bu e-posta ile kayıt bulunamadı.' })
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Bu hesap zaten doğrulanmış. Giriş yapabilirsin.' })
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
        user.verificationCode = verificationCode
        user.verificationCodeExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS)
        await user.save()

        await sendVerificationEmail(user.email, verificationCode)

        res.json({ message: 'Yeni doğrulama kodu e-postana gönderildi.' })
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.', error: err.message })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: 'Email ve şifre zorunludur.' })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(401).json({ message: 'Email veya şifre hatalı.' })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(401).json({ message: 'Email veya şifre hatalı.' })
        }

        // Yalnızca açıkça false ise engelle (eski kayıtlarda alan yoksa girişe izin ver)
        if (user.isVerified === false) {
            return res.status(403).json({
                message: 'E-posta adresin henüz doğrulanmadı. Gelen kutundaki kodu girerek hesabını onayla.'
            })
        }

        const token = jwt.sign(
            { userId: user._id, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            message: 'Giriş başarılı!',
            token,
            name: user.name,
            email: user.email
        })

    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.', error: err.message })
    }
})

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body

        if (!email || String(email).trim() === '') {
            return res.status(400).json({ message: 'E-posta zorunludur.' })
        }

        const user = await User.findOne({ email: String(email).trim() })
        const msg =
            'Eğer bu adres kayıtlıysa, şifre sıfırlama kodu e-postana gönderildi.'

        if (!user) {
            return res.json({ message: msg })
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
        user.passwordResetCode = resetCode
        user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS)
        await user.save()

        await sendPasswordResetEmail(user.email, resetCode)

        res.json({ message: msg })
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.', error: err.message })
    }
})

router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, password } = req.body

        if (!email || String(email).trim() === '') {
            return res.status(400).json({ message: 'E-posta zorunludur.' })
        }
        if (code === undefined || code === null || String(code).trim() === '') {
            return res.status(400).json({ message: 'Doğrulama kodu zorunludur.' })
        }
        if (!password) {
            return res.status(400).json({ message: 'Yeni şifre zorunludur.' })
        }

        const passwordError = getPasswordRuleError(password)
        if (passwordError) {
            return res.status(400).json({ message: passwordError })
        }

        const user = await User.findOne({ email: String(email).trim() })

        if (!user) {
            return res.status(404).json({ message: 'Bu e-posta ile kayıt bulunamadı.' })
        }

        const submitted = String(code).trim()
        if (!user.passwordResetCode || user.passwordResetCode !== submitted) {
            return res.status(400).json({ message: 'Şifre sıfırlama kodu hatalı.' })
        }

        if (!user.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
            return res.status(400).json({
                message: 'Kodun süresi doldu. Şifremi unuttum adımından yeni kod iste.'
            })
        }

        user.password = await bcrypt.hash(password, 12)
        user.passwordResetCode = null
        user.passwordResetExpires = null
        await user.save()

        res.json({ message: 'Şifren güncellendi. Giriş yapabilirsin.' })
    } catch (err) {
        res.status(500).json({ message: 'Sunucu hatası.', error: err.message })
    }
})

module.exports = router