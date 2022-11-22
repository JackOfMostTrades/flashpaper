import {FlashPaperService} from './service';
import {FlashPaperServer, RecaptchaProvider} from "./server";
import {RedisStorageService} from "./redis";
import dotenv from 'dotenv';

dotenv.config();
const PORT = Number(process.env.PORT) || 8080;

let service = new FlashPaperService(new RedisStorageService());
let server = new FlashPaperServer(service, new RecaptchaProvider(process.env.RECAPTCHA_SECRET_KEY), PORT);
server.start();
console.log("Listening on " + server.getPort());
