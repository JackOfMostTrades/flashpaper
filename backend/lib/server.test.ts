import {describe, it} from 'mocha'
import assert from 'assert';
import {
    Clock,
    CreateMessageResponse,
    ErrorResponse,
    FlashPaperService,
    GetMessageResponse,
    MAX_MESSAGE_AGE,
    StorageService
} from "./service.js";
import {CaptchaProvider, FlashPaperServer} from "./server.js";
import uuid from 'uuid-random';
import fetch from 'node-fetch';

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
            let id = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    captcha: VALID_CAPTCHA,
                    data: 'AAAA'
                })
            }).then(function (response) {
                return response.json();
            }).then(function (response) {
                return (response as CreateMessageResponse).id;
            });

            let message = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id, {
                method: 'POST',
            }).then(function (response) {
                return response.json();
            }).then(function (response) {
                return (response as GetMessageResponse).data;
            });

            assert.strictEqual(message, 'AAAA');

            let err = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id, {
                method: 'POST',
            }).then(function (response) {
                return response.json();
            }).then(function (response) {
                return (response as ErrorResponse).error;
            });

            assert.strictEqual(err, 'Unable to find message. Already read?');
        } finally {
            server.stop();
        }
    });

    it('Invalid id query param', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let id = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    captcha: VALID_CAPTCHA,
                    data: 'AAAA'
                }),
            }).then(function (response) {
                return response.json();
            }).then(function (response) {
                return (response as CreateMessageResponse).id;
            });

            // Repeated parameter
            let resp = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id + '&id=' + id,{
                method: 'POST',
            });
            assert.strictEqual(resp.ok, false);

            // Missing parameter
            resp = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=getMessage', {
                method: 'POST',
            });
            assert.strictEqual(resp.ok, false);
        } finally {
            server.stop();
        }
    });

    it('Expired Message', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let id = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    captcha: VALID_CAPTCHA,
                    data: 'AAAA'
                }),
            }).then(function (response) {
                return response.json();
            }).then(function (response) {
                return (response as CreateMessageResponse).id;
            });

            clock.current = new Date(clock.current.getTime() + MAX_MESSAGE_AGE + 1);

            let err = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=getMessage&id=' + id, {
                method: 'POST',
            }).then(function (response) {
                return response.json();
            }).then(function (response) {
                return (response as ErrorResponse).error;
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
            let resp = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    data: 'AAAA'
                }),
            });
            assert.strictEqual(resp.ok, false);
        } finally {
            server.stop();
        }
    });

    it('Bad Captcha', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let resp = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    captcha: 'foo',
                    data: 'AAAA'
                }),
            });
            assert.strictEqual(resp.ok, false);

            resp = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    captcha: 'foo',
                    data: 'AAAA'
                }),
            });
            assert.strictEqual(resp.ok, false);
        } finally {
            server.stop();
        }
    });

    it('CORS Origin', async () => {
        let server = new FlashPaperServer(service, new MockCaptchaProvider());
        await server.start();
        try {
            let response = await fetch('http://localhost:' + server.getPort() + '/REST/exec?method=createMessage', {
                method: 'POST',
                headers: {
                    'Origin': 'https://foo.example.com',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: 'AAAA'
                }),
            });
            assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
        } finally {
            server.stop();
        }
    });
});
