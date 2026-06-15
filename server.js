const express = require('express');
const mysql = require('mysql2');
const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Koneksi Database (Konfigurasinya di Azure Portal nanti)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

// Koneksi Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

// Endpoint untuk submit tugas
app.post('/submit-task', upload.single('file_tugas'), async (req, res) => {
    const { nim, name, class_name, course } = req.body;
    const blobName = `${nim}_${req.file.originalname}`;
    
    // 1. Upload ke Azure Blob Storage
    const containerClient = blobServiceClient.getContainerClient('tugas-praktikum');
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer);
    const fileUrl = blockBlobClient.url;

    // 2. Simpan Metadata ke MySQL
    const sql = "INSERT INTO submissions (nim, name, class, course, file_url) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nim, name, class_name, course, fileUrl], (err) => {
        if (err) return res.status(500).send(err);
        res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', sans-serif;
                        background-color: #fce4ec;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .card {
                        background-color: white;
                        padding: 2.5rem;
                        border-radius: 20px;
                        box-shadow: 0 10px 25px rgba(240, 98, 146, 0.2);
                        text-align: center;
                        max-width: 400px;
                    }
                    .icon {
                        font-size: 50px;
                        margin-bottom: 15px;
                    }
                    h2 {
                        color: #f06292;
                        margin-bottom: 10px;
                    }
                    p {
                        color: #777;
                        margin-bottom: 25px;
                    }
                    .btn {
                        display: inline-block;
                        background-color: #ff85a2;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 10px;
                        font-weight: bold;
                        transition: 0.3s;
                    }
                    .btn:hover {
                        background-color: #f06292;
                        transform: scale(1.05);
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✅</div>
                    <h2>Tugas Berhasil Dikirim!</h2>
                    <p>File dan metadata Anda telah aman tersimpan di Azure Cloud.</p>
                    <a href="/" class="btn">Kembali ke Beranda</a>
                </div>
            </body>
            </html>
        `);
    });
});

app.listen(process.env.PORT || 3000);
