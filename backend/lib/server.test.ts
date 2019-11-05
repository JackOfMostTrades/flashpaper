import {describe, it} from 'mocha'
import rp from 'request-promise-native';
import http from 'http';
import assert from 'assert';
import {Clock, FlashPaperService, StorageService, MAX_MESSAGE_AGE} from "./service";
import {CaptchaProvider, FlashPaperServer} from "./server";
import uuid from 'uuid-random';

class MockClock implements Clock {
    public current: Date = new Date();

    public now(): Date {
        return this.current;
    }
}

class MemoryStorageService implements StorageService {
    private clock: Clock;
    private store: {[id:string]:{data:string, expiry:Date}};

    constructor(clock: Clock) {
        this.clock = clock;
        this.store = {};
    }

    generateUuid(): string {
        return uuid();
    }

    async getMessage(id: string): Promise<string|undefined> {
        let m = this.store[id];
        if (!m) {
            return;
        }
        delete this.store[id];
        if (m.expiry.getTime() < this.clock.now().getTime()) {
            return;
        }
        return m.data;
    }

    async storeMessage(id: string, message: string, ttlMillis: number): Promise<void> {
        this.store[id] = {
            data: message,
            expiry: new Date(this.clock.now().getTime() + ttlMillis),
        };
    }
}

const VALID_CAPTCHA = "VALID_CAPTCHA";
class MockCaptchaProvider implements CaptchaProvider {
    public isValidCaptcha(captcha: string): Promise<boolean> {
        return Promise.resolve(captcha == VALID_CAPTCHA);
    }
}

let clock = new MockClock();
let service = new FlashPaperService(new MemoryStorageService(clock));

describe('FlashPaperServer', () => {
    it('Create and Get Message', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let id = await rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=createMessage',
                json: true,
                body: {
                    captcha: VALID_CAPTCHA,
                    data: 'AAAA'
                },
            }).then(function (parsedBody) {
                return parsedBody.id;
            });

            let message = await rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id,
                json: true,
            }).then(function (parsedBody) {
                return parsedBody.data;
            });

            assert.strictEqual(message, 'AAAA');

            let err = await rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id,
                json: true,
            }).then(function (parsedBody) {
                return parsedBody.error;
            });

            assert.strictEqual(err, 'Unable to find message. Already read?');
        } finally {
            server.stop();
        }
    });

    it('Expired Message', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let id = await rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=createMessage',
                json: true,
                body: {
                    captcha: VALID_CAPTCHA,
                    data: 'AAAA'
                },
            }).then(function (parsedBody) {
                return parsedBody.id;
            });

            clock.current = new Date(clock.current.getTime() + MAX_MESSAGE_AGE + 1);

            let err = await rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id,
                json: true,
            }).then(function (parsedBody) {
                return parsedBody.error;
            });

            assert.strictEqual(err, 'Unable to find message. Already read?');
        } finally {
            server.stop();
        }
    });

    it('Missing Captcha', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            assert.rejects(rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=createMessage',
                json: true,
                body: {
                    data: 'AAAA'
                },
            }));
        } finally {
            server.stop();
        }
    });

    it('Bad Captcha', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            assert.rejects(rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=createMessage',
                json: true,
                body: {
                    captcha: 'foo',
                    data: 'AAAA'
                },
            }));

            assert.rejects(rp({
                method: 'POST',
                uri: 'http://localhost:' + server.getPort() + '/REST/exec?method=createMessage',
                json: true,
                body: {
                    captcha: 'foo',
                    data: 'AAAA'
                },
            }));
        } finally {
            server.stop();
        }
    });

    it('CORS Origin', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let responseHeaders = await new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
                let req = http.request({
                    method: 'POST',
                    port: server.getPort(),
                    path: '/REST/exec?method=createMessage',
                    headers: {
                        'Origin': 'https://foo.example.com',
                    }
                }, (resp: http.IncomingMessage) => {
                    resolve(resp.headers);
                });
                req.on('error', (e: Error) => reject(e));
                req.write(JSON.stringify({data: 'AAAA'}));
                req.end();
            });
            assert.strictEqual(responseHeaders['access-control-allow-origin'], '*');
        } finally {
            server.stop();
        }
    });
});
