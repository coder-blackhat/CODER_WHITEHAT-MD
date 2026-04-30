const express = require('express')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode')
const pino = require('pino')
const fs = require('fs')
const app = express()

let qrCode = ''
let isConnected = false

async function connectToWhatsApp() {
    try {
        // Force delete old session on every start to fix corruption
        if (fs.existsSync('auth_info')) {
            console.log('Clearing old session...')
            fs.rmSync('auth_info', { recursive: true, force: true })
        }

        const { state, saveCreds } = await useMultiFileAuthState('auth_info')
        
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '110.0.0'],
            version: [2, 2413, 51]
        })

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update
            
            if (qr) {
                console.log('QR Generated - scan now')
                qrCode = await qrcode.toDataURL(qr)
                isConnected = false
            }
            
            if (connection === 'close') {
                isConnected = false
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const errorMsg = lastDisconnect?.error?.message
                console.log('Connection closed. Status:', statusCode, 'Error:', errorMsg)
                
                if (statusCode === DisconnectReason.loggedOut || !statusCode) {
                    console.log('Deleting auth and restarting...')
                    fs.rmSync('auth_info', { recursive: true, force: true })
                }
                
                console.log('Reconnecting in 3s...')
                setTimeout(() => connectToWhatsApp(), 3000)
            } else if (connection === 'open') {
                console.log('Bot connected to WhatsApp!')
                isConnected = true
                qrCode = ''
            }
        })

        sock.ev.on('creds.update', saveCreds)
        
    } catch (err) {
        console.log('FATAL ERROR:', err.message)
        console.log('Retrying in 5s...')
        fs.rmSync('auth_info', { recursive: true, force: true })
        setTimeout(() => connectToWhatsApp(), 5000)
    }
}

app.get('/', (req, res) => {
    if (qrCode && !isConnected) {
        res.send(`
            <html>
                <body style=" 
