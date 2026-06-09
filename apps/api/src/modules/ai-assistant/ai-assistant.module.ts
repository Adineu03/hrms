import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { ConversationMemoryService } from './conversation-memory.service';
import { ContextBuilderService } from './context-builder.service';

@Module({
  controllers: [AiAssistantController],
  providers: [AiAssistantService, ConversationMemoryService, ContextBuilderService],
})
export class AiAssistantModule {}
