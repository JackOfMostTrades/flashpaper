import {FlashPaperService} from './service';
import {FlashPaperServer} from "./server";
import {RedisStorageService} from "./redis";

const PORT = Number(process.env.PORT) || 5000;

let service = new FlashPaperService(new RedisStorageService());
let server = new FlashPaperServer(service, PORT);
server.start();
console.log("Listening on " + server.getPort());
