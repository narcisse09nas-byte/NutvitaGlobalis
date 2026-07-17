"use client";

import { QRCodeCanvas } from "qrcode.react";

export function CertificateQRCode({ value }: { value: string }) {
  return (
    <div className="nvg-qr">
      <div className="nvg-qr-box">
        <QRCodeCanvas value={value} size={96} fgColor="#063D2E" />
      </div>
      <p>Verify Certificate</p>
      <small>Scan to validate authenticity</small>
    </div>
  );
}