import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./infrastructure/router";
import http from "http";
//import WebSocket from "ws";
import fs from "fs";
import path from "path";
import WsTransporter from "./infrastructure/repositories/ws.external";

const port = process.env.PORT || 3002;
const app = express();
const server = http.createServer(app);
//const wss = new WebSocket.Server({ server });

// Ruta para la carpeta temporal
const TMP_FOLDER = path.join(process.cwd(), 'tmp');

// Objeto para almacenar las instancias de WsTransporter por cliente
const clientsMap = new Map<string, WsTransporter>();

  
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('tmp'));
//app.use(`/`, routes);

const address = server.address();
// Endpoint para crear nuevos clientes
// Escanear el directorio temporal y crear instancias de WsTransporter
fs.readdirSync(TMP_FOLDER).forEach((folderName) => {
    console.log(folderName);
    
    const clientFolderPath = path.join(TMP_FOLDER, folderName);
    const client = new WsTransporter(folderName, clientFolderPath);
    clientsMap.set(folderName, client);
  });

app.post("/clients", (req, res) => {
    console.log("entra")
  const { clientName } = req.body;
  const clientFolderPath = path.join(TMP_FOLDER, clientName);

  // Verificar si la carpeta ya existe
  if (fs.existsSync(clientFolderPath)) {
    // return res.status(400).json({ error: 'Cliente ya existe' });
    return res.status(200).json({ message: 'Cliente ya existe' });
  }

  // Crear la carpeta única para el cliente
  fs.mkdirSync(clientFolderPath);

  // Crear una nueva instancia de WsTransporter para el cliente
  const client = new WsTransporter(clientName,clientFolderPath);
  clientsMap.set(clientName, client);

  res.status(201).json({ message: 'Cliente creado' });
});

app.post("/send-message", (req, res) => {
    const { clientName,phone, message } = req.body;
  
    // Buscar la instancia de WsTransporter correspondiente al número de teléfono
    const client = getClientByPhone(clientName);
  
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
  
    // Enviar el mensaje utilizando la instancia de WsTransporter
    client.sendMsg({ phone, message })
      .then(response => {
        if(response.error){
            res.status(400).json(response);
        }else{
            res.status(200).json(response);
        }
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  });
  
function getClientByPhone(clientName: string): WsTransporter | undefined {
    for (const [, client] of clientsMap) {
      // Suponiendo que el número de teléfono se puede encontrar dentro del folderPath
      if (client.getClientName().includes(clientName)) {
        return client;
      }
    }
    return undefined;
  }
/*
// WebSocket
wss.on("connection", (ws) => {
  ws.send("Welcome to the server!");
});
*/
// Iniciar el servidor
server.listen(port, () => console.log(`Ready...${port}`));