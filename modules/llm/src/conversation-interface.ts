import { Message, LLMOptions, LLMResponse } from './types';

export interface ConversationFactory {
    createConversation(): Conversation;
}

export interface Conversation {
    addMessage(role: 'user' | 'assistant' | 'system', content: string): void;
    getHistory(): Message[];
    send(options?: LLMOptions): Promise<LLMResponse>;
    stream(
        callback: (chunk: string) => void,
        options?: LLMOptions
    ): Promise<LLMResponse>;
}