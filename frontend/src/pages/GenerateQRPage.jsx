import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Paper, Typography, Box, Container, Button } from '@mui/material';
import { QrCode, Print } from '@mui/icons-material';

function GenerateQRPage() {
  // URL นี้จะชี้ไปที่หน้าฟอร์มแจ้งซ่อมในแอปพลิเคชันของคุณ
  const createTicketUrl = `${window.location.origin}/create-ticket`;

  const handlePrint = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      let downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'helpdesk-qrcode.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <Container maxWidth="sm">
        <Paper elevation={3} sx={{ mt: 4, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QrCode sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" gutterBottom>
                QR Code สำหรับแจ้งซ่อม
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                สามารถดาวน์โหลดรูปภาพ QR Code นี้ไปติดไว้ตามจุดต่างๆ <br/> เพื่อให้ผู้ใช้สแกนและแจ้งปัญหาได้อย่างรวดเร็ว
            </Typography>
            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, backgroundColor: 'white' }}>
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={createTicketUrl}
                  size={256}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"H"}
                  includeMargin={true}
                />
            </Box>
            <Button variant="contained" sx={{ mt: 3 }} startIcon={<Print />} onClick={handlePrint}>
                ดาวน์โหลด QR Code
            </Button>
        </Paper>
    </Container>
  );
}

export default GenerateQRPage;
