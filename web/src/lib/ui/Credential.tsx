import { QRCodeSVG } from "qrcode.react";

export interface CredentialProps {
  folio: string;
  /** What the QR encodes: the opaque access URL (`/p/<token>`), never personal data. */
  qrValue: string;
  note?: string;
  /** Landing: the 12 s 3D turn. Jornada: `flip` once when the credential is issued. */
  motion?: "still" | "turning" | "flip";
  size?: "sm" | "md";
}

/** The product's one memorable element: the patient credential with folio and QR. */
export function Credential({ folio, qrValue, note, motion = "still", size = "md" }: CredentialProps) {
  const cls = motion === "turning" ? " hr-cred--turning" : motion === "flip" ? " hr-cred--flip" : "";
  return (
    <div
      className={`hr-cred-stage${size === "sm" ? " hr-cred-stage--sm" : ""}`}
      role="img"
      aria-label={`Credencial de paciente, folio ${folio}, con código QR`}
    >
      <div className={`hr-cred${cls}`}>
        <div className="hr-cred-face hr-cred-front">
          <span className="hr-cred-org">EIRA · Credencial de paciente</span>
          <QRCodeSVG className="hr-cred-qr" value={qrValue} bgColor="#FFFFFF" fgColor="#3A1530" level="M" />
          <span className="hr-cred-folio">{folio}</span>
          {note && <span className="hr-cred-note">{note}</span>}
        </div>
        <div className="hr-cred-face hr-cred-back" aria-hidden="true">
          <b>El QR no lleva datos.</b>
          <span>Para abrir el resultado: fecha de nacimiento + código de 6 dígitos.</span>
        </div>
      </div>
    </div>
  );
}
