import express, {Application} from 'express';
import * as http from "http";
import {AddressInfo} from "net";
import cors from 'cors';
import {FlashPaperService} from './service';

export class FlashPaperServer {
    private service: FlashPaperService;
    private port: number|undefined;
    private app: Application;
    private server: http.Server|undefined;

    constructor(service: FlashPaperService, port?: number) {
        this.service = service;
        this.port = port;

        this.app = express()
            .use(cors())
            .use(express.json())
            .post('/REST/exec', async (req, res) => {
                if (req.query.method === 'createMessage') {
                    if (!req.body.data) {
                        return res.status(400).json({error: "Missing message data"});
                    }
                    return res.json(await this.service.createMessage(req.body.data));
                } else if (req.query.method === 'getMessage') {
                    return res.json(await this.service.getMessage(req.query.id));
                }
                return res.json({"error": "Invalid method: " + req.query.method});
            });
    }

    public start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.server) {
                return reject(new Error("Already listening!"));
            }
            this.server = this.app.listen(this.port || 0, () => {
                resolve();
            });
        });
    }

    public getPort(): number {
        if (!this.server) {
            throw new Error("Server is not listening!");
        }
        return (this.server.address() as AddressInfo).port;
    }

    public stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.server) {
                return reject(new Error("Not listening!"));
            }
            this.server.close(() => {
                this.server = undefined;
                resolve();
            });
        });
    }
}
