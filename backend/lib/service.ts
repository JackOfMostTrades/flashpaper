export interface ErrorResponse {
    error: string
}

export interface CreateMessageResponse {
    id: string
}

export interface StorageService {
    generateUuid: () => string;
    storeMessage: (id: string, message: string, ttlMillis: number) => Promise<void>
    getMessage: (id: string) => Promise<string|undefined>;
}

export interface Clock {
    now(): Date;
}

export class SystemClock implements Clock {
    public now(): Date {
        return new Date();
    }
}

export interface GetMessageResponse {
    data: string;
}

export const MAX_MESSAGE_AGE = 1000 * 60 * 60 * 24 * 7;

export class FlashPaperService {
    private storageService: StorageService;

    constructor(storageService: StorageService) {
        this.storageService = storageService;
    }

    public async createMessage(message: string): Promise<ErrorResponse|CreateMessageResponse> {
        if (message.length > 1000) {
            return {error: "Messages must be less than 1000 characters long."};
        }

        try {
            let id = this.storageService.generateUuid();
            await this.storageService.storeMessage(id, message, MAX_MESSAGE_AGE);
            return {id: id};
        } catch (e) {
            return {error: e.message};
        }
    }

    public async getMessage(id: string): Promise<ErrorResponse|GetMessageResponse> {
        try {
            let message = await this.storageService.getMessage(id);
            if (message) {
                return {data: message};
            }
            return {error: "Unable to find message. Already read?"};
        } catch (e) {
            return {error: e.message};
        }
    }
}
