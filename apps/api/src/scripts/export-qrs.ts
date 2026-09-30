import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { generateSignedQrToken } from '@chai-partner/shared';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const QR_SECRET = process.env.QR_HMAC_SECRET || 'chai_partner_qr_signing_secret_min_32_characters_long';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TABLE_COUNT = parseInt(process.env.DEFAULT_TABLE_COUNT || '25', 10);

async function exportQrCodes() {
  const outDir = path.resolve(__dirname, '../../../../generated-qrs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Generating QR codes for ${TABLE_COUNT} tables into: ${outDir}`);

  // Create printable PDF document
  const pdfPath = path.join(outDir, 'chai-partner-tables-1-to-25.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const pdfStream = fs.createWriteStream(pdfPath);
  doc.pipe(pdfStream);

  const qrDataList: Array<{ tableNumber: number; token: string; url: string; qrDataUrl: string }> = [];

  for (let i = 1; i <= TABLE_COUNT; i++) {
    const token = generateSignedQrToken(i, QR_SECRET);
    const targetUrl = `${FRONTEND_URL}/t/${token}`;
    const pngPath = path.join(outDir, `table-${String(i).padStart(2, '0')}.png`);

    // Generate high resolution PNG
    await QRCode.toFile(pngPath, targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#3B2A21', // Deep coffee brown
        light: '#FFFDF9', // Off-white surface
      },
    });

    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      margin: 2,
      color: {
        dark: '#3B2A21',
        light: '#FFFDF9',
      },
    });

    qrDataList.push({ tableNumber: i, token, url: targetUrl, qrDataUrl });

    // Add to PDF (4 table cards per page)
    const cardIndexOnPage = (i - 1) % 4;
    if (cardIndexOnPage === 0 && i > 1) {
      doc.addPage();
    }

    const col = cardIndexOnPage % 2;
    const row = Math.floor(cardIndexOnPage / 2);
    const x = 50 + col * 260;
    const y = 50 + row * 360;

    // Card background & border
    doc.roundedRect(x, y, 240, 340, 12).lineWidth(2).strokeColor('#8B5E3C').fillAndStroke('#FFFDF9', '#8B5E3C');

    // Header: Cafe Name
    doc.fillColor('#3B2A21').fontSize(16).font('Helvetica-Bold').text('CHAI PARTNER', x, y + 20, { width: 240, align: 'center' });
    doc.fillColor('#7C8B85').fontSize(10).font('Helvetica').text('Scan to Order & Track Live', x, y + 42, { width: 240, align: 'center' });

    // Table Badge
    doc.roundedRect(x + 50, y + 62, 140, 30, 6).fill('#8B5E3C');
    doc.fillColor('#FFFDF9').fontSize(14).font('Helvetica-Bold').text(`TABLE ${i}`, x + 50, y + 70, { width: 140, align: 'center' });

    // QR Image
    doc.image(pngPath, x + 35, y + 105, { width: 170, height: 170 });

    // Footer info
    doc.fillColor('#3B2A21').fontSize(9).font('Helvetica-Bold').text('No Waiter Needed • Instant Kitchen Push', x, y + 290, { width: 240, align: 'center' });
    doc.fillColor('#7C8B85').fontSize(7).font('Helvetica').text(`Token: ${token.slice(0, 18)}...`, x, y + 310, { width: 240, align: 'center' });
  }

  doc.end();

  // Create an HTML printable sheet for direct browser printing
  const htmlPath = path.join(outDir, 'print-table-qrs.html');
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chai Partner - Table QR Cards</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #F4ECE0; margin: 0; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { color: #3B2A21; margin: 0; }
    .header p { color: #7C8B85; margin: 5px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; }
    .card { background: #FFFDF9; border: 2px solid #8B5E3C; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); page-break-inside: avoid; }
    .card h2 { color: #3B2A21; font-size: 18px; margin: 0 0 5px 0; }
    .card .subtitle { color: #7C8B85; font-size: 12px; margin-bottom: 12px; }
    .badge { display: inline-block; background: #8B5E3C; color: #FFFDF9; font-weight: bold; font-size: 15px; padding: 6px 18px; border-radius: 20px; margin-bottom: 15px; }
    .card img { width: 170px; height: 170px; display: block; margin: 0 auto 12px auto; }
    .card .footer { font-size: 11px; font-weight: bold; color: #3B2A21; }
    .card .token { font-size: 9px; color: #7C8B85; word-break: break-all; margin-top: 4px; }
    @media print {
      body { background: white; padding: 0; }
      .header, .no-print { display: none; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 15px; }
      .card { border: 1px solid #8B5E3C; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Chai Partner — Printable Table QR Cards</h1>
    <p>25 Tables with Cryptographically Signed HMAC Tokens</p>
    <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #8B5E3C; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 10px;">Print Table Cards</button>
  </div>
  <div class="grid">
    ${qrDataList
      .map(
        (q) => `
      <div class="card">
        <h2>CHAI PARTNER</h2>
        <div class="subtitle">Scan to Order & Track Live</div>
        <div class="badge">TABLE ${q.tableNumber}</div>
        <img src="${q.qrDataUrl}" alt="Table ${q.tableNumber} QR" />
        <div class="footer">No Waiter Needed • Instant Kitchen Push</div>
        <div class="token">${q.token}</div>
      </div>
    `,
      )
      .join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent);
  fs.writeFileSync(path.join(outDir, 'print-cards.html'), htmlContent);

  console.log(`Saved 25 PNGs, PDF (${pdfPath}), and HTML sheets (${htmlPath})!`);
}

if (require.main === module) {
  exportQrCodes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('QR Export failed:', err);
      process.exit(1);
    });
}
