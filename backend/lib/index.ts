import {FlashPaperService} from './service.js';
import {FlashPaperServer, RecaptchaProvider} from "./server.js";
import {RedisStorageService} from "./redis.js";
import dotenv from 'dotenv';

dotenv.config();
const PORT = Number(process.env.PORT) || 8080;

let service = new FlashPaperService(new RedisStorageService());
let server = new FlashPaperServer(service, new RecaptchaProvider(process.env.RECAPTCHA_SECRET_KEY), PORT);
server.start();
console.log("Listening on " + server.getPort());
