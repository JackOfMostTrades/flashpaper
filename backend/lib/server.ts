import express, {Application} from 'express';
import rp from 'request-promise-native';
import * as http from "http";
import {AddressInfo} from "net";
import cors from 'cors';
import {FlashPaperService} from './service';

export interface CaptchaProvider {
    isValidCaptcha(captcha: string): Promise<boolean>;
}

export class RecaptchaProvider implements CaptchaProvider {
    private secretKey: string;

    constructor(secretKey?: string) {
        if (!secretKey) {
            throw new Error("Invalid Recaptcha secret key");
        }
        this.secretKey = secretKey;
    }

    public async isValidCaptcha(captcha: string): Promise<boolean> {
        if (!captcha) {
            return false;
        }

        let resp = await rp.post('https://www.google.com/recaptcha/api/siteverify', {
            form: {
                secret: this.secretKey,
                response: captcha
            }
        });
        let respBody = JSON.parse(resp);
        return respBody.success;
    }
}

export class FlashPaperServer {
    private service: FlashPaperService;
    private captchaProvider: CaptchaProvider;
    private port: number|undefined;
    private app: Application;
    private server: http.Server|undefined;

    constructor(service: FlashPaperService, captchaProvider: CaptchaProvider, port?: number) {
        this.service = service;
        this.captchaProvider = captchaProvider;
        this.port = port;

        this.app = express()
            .use(cors())
            .use(express.json())
            .post('/REST/exec', async (req, res) => {
                if (req.query.method === 'createMessage') {
                    return await this.createMessage(req, res);
                } else if (req.query.method === 'getMessage') {
                    return await this.getMessage(req, res);
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

    private async createMessage(req: express.Request, res: express.Response): Promise<express.Response> {
        if (!req.body.data) {
            return res.status(400).json({error: "Missing message data"});
        }
        if (! await this.captchaProvider.isValidCaptcha(req.body.captcha)) {
            return res.status(400).json({error: "Invalid captcha response"});
        }

        return res.json(await this.service.createMessage(req.body.data));
    }

    private async getMessage(req: express.Request, res: express.Response): Promise<express.Response> {
        let messageId = req.query.id;
        if (typeof messageId !== 'string') {
            return res.status(400).json({error: "Invalid id query parameter"});
        }
        return res.json(await this.service.getMessage(messageId));
    }
}
