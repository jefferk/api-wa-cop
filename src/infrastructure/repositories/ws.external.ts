import { Client, LocalAuth } from "whatsapp-web.js";
import { image as imageQr } from "qr-image";
import LeadExternal from "../../domain/lead-external.repository";
import * as fs from 'fs';
import * as path from 'path';


/**
 * Extendemos los super poderes de whatsapp-web
 */
class WsTransporter extends Client implements LeadExternal {
  private status = false;
  private folderPath: string;
  private clientName: string;

  constructor(clientName: string,folderPath: string) {
    const options={
      clientId:clientName,
      dataPath:folderPath
  }
    super({
      authStrategy: new LocalAuth(options),
      puppeteer: {
        headless: true,
        args: ["--disable-setuid-sandbox", "--unhandled-rejections=strict"],
      },
    });
    this.folderPath = folderPath;
    this.clientName = clientName;

    console.log("Iniciando...."+clientName);

    this.initialize();

    this.on("ready", () => {
      this.status = true;
      console.log("LOGIN_SUCCESS "+clientName);
    });

    this.on("auth_failure", () => {
      this.status = false;
      console.log("LOGIN_FAIL");
    });

    this.on("qr", (qr) => {
      console.log("Escanea el codigo QR que esta en la carepta tmp");
      this.generateImage(qr);
    });
  }

  /**
   * Enviar mensaje de WS
   * @param lead
   * @returns
   */
  async sendMsg(lead: { message: string; phone: string }): Promise<any> {
    try {
      if (!this.status) return Promise.resolve({ error: "WAIT_LOGIN" });
      const { message, phone } = lead;
      const response = await this.sendMessage(`${phone}@c.us`, message);
      return { id: response.id.id };
    } catch (e: any) {
      return Promise.resolve({ error: e.message });
    }
  }

  getStatus(): boolean {
    return this.status;
  }

  private generateImage(base64: string) {
    console.log(`⚡ http://localhost:3002/${this.clientName}/qr.svg ⚡`)
    try {
      if (!fs.existsSync(this.folderPath)) {
        fs.mkdirSync(this.folderPath, { recursive: true });
      }

      const filePath = path.join(this.folderPath, 'qr.svg');
      const qr_svg = imageQr(base64, { type: "svg", margin: 4 });
      qr_svg.pipe(fs.createWriteStream(filePath));
      console.log(`⚡ Recuerda que el QR se actualiza cada minuto ⚡`);
      console.log(`⚡ Actualiza F5 el navegador para mantener el mejor QR ⚡`);
    } catch (error) {
      console.error("Error al generar la imagen QR:", error);
    }
  }


  getFolderPath(): string {
    return this.folderPath;
  }

  getClientName(): string {
    return this.clientName;
  }
}

export default WsTransporter;
