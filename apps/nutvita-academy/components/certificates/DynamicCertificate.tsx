"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { CalendarDays, Download, LoaderCircle, Printer, ShieldCheck } from "lucide-react";
import type { CertificateData } from "@/types/certificate";
import styles from "./dynamic-certificate.module.css";
import { useLanguage } from "@/hooks/use-language";

export function DynamicCertificate({ data }: { data: CertificateData }) {
  const { text } = useLanguage();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadCertificatePdf() {
    if (!certificateRef.current || isDownloading) return;
    try {
      setIsDownloading(true);
      await document.fonts.ready;
      const png = await toPng(certificateRef.current, { cacheBust: true, pixelRatio: 4, backgroundColor: "#fffdf6" });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      pdf.addImage(png, "PNG", 0, 0, 297, 210, undefined, "SLOW");
      pdf.save(`${data.certificateId}.pdf`);
    } catch (error) {
      console.error(text("Erreur pendant la génération du certificat :", "Certificate generation error:"), error);
      window.alert(text("Le certificat n’a pas pu être généré.", "The certificate could not be generated."));
    } finally { setIsDownloading(false); }
  }

  return (
    <section className={styles.section}>
      <div className={styles.viewport}>
        <div ref={certificateRef} className={styles.certificate} id="official-certificate">
          <Image className={styles.masterBackground} src="/certificates/assets/certificate-security-background.png" alt="" width={1365} height={810} unoptimized priority />
          <div className={styles.nvgWatermark} aria-hidden="true">NVG-A</div>
          <header className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true">
              <Image src="/certificates/assets/nvg-emblem.png" alt="" width={397} height={421} unoptimized />
            </div>
            <div><p><strong>Nut</strong><em>Vita</em><strong>Globalis</strong></p><span>ACADEMY</span></div>
          </header>
          <div className={styles.titleBlock}>
            <h1>CERTIFICATE</h1>
            <div className={styles.achievement}><span />OF ACHIEVEMENT<span /></div>
            <p>This certifies that</p>
          </div>
          <div className={styles.recipientName}>{data.recipientName}</div>
          <p className={styles.completionCopy}>has successfully completed the certification</p>
          <div className={styles.courseBlock}><h2>{data.courseName}</h2><p>{data.courseSubtitle}</p></div>
          <div className={styles.seal}>
            <Image src="/certificates/assets/excellence-seal.png" alt="Sceau Excellence, Knowledge, Impact" width={852} height={865} unoptimized />
          </div>
          <div className={styles.qrCode}>
            <div className={styles.qrFrame}><QRCodeSVG value={data.verificationUrl} size={108} level="H" bgColor="#ffffff" fgColor="#082f27" marginSize={1} /></div>
            <strong>Verify Certificate</strong><span>Scan to validate authenticity</span>
          </div>
          <div className={styles.centerAward} aria-label={text("Emblème d’excellence", "Excellence emblem")}>
            <Image className={styles.awardLinesPair} src="/certificates/assets/gold-lines-pair.png" alt="" width={1500} height={47} unoptimized />
            <Image className={styles.laurelImage} src="/certificates/assets/gold-laurel.png" alt="" width={580} height={574} unoptimized />
          </div>
          <footer className={styles.footer}>
            <div className={styles.footerItem}><CalendarDays size={20} /><span>Date of Completion</span><strong>{data.completionDate}</strong></div>
            <div className={styles.footerItem}><ShieldCheck size={20} /><span>Certificate ID</span><strong>{data.certificateId}</strong></div>
            <div className={styles.signature}><div>{data.directorName}</div><span>Academic Director</span><strong>NutVitaGlobalis Academy</strong></div>
          </footer>
          <Image src="/certificates/assets/nvg-hologram-v2.png" alt="Hologramme NVG Academy" width={884} height={893} unoptimized className={styles.hologram} />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={() => window.print()}><Printer size={18} />{text("Imprimer", "Print")}</button>
        <button type="button" className={styles.primaryButton} onClick={downloadCertificatePdf} disabled={isDownloading}>
          {isDownloading ? <LoaderCircle size={18} className={styles.spinner} /> : <Download size={18} />}
          {isDownloading ? text("Génération en cours…", "Generating…") : text("Télécharger en PDF HD", "Download HD PDF")}
        </button>
      </div>
    </section>
  );
}
