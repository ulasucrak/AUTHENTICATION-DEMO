const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

async function sendVerificationEmail(email, code) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Hesabını doğrula',
        html: `
            <h2>Email Doğrulama</h2>
            <p>Doğrulama kodun:</p>
            <h1>${code}</h1>
            <p>Bu kod 3 dakika geçerlidir.</p>
        `
    })
}

async function sendPasswordResetEmail(email, code) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Şifre sıfırlama',
        html: `
            <h2>Şifre sıfırlama</h2>
            <p>Şifre sıfırlama kodun:</p>
            <h1>${code}</h1>
            <p>Bu kod 1 saat geçerlidir. İstemediysen bu e-postayı yok say.</p>
        `
    })
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
}
