/**
 * useCommandSubscriber Hook
 * 
 * This hook is used by components that execute canvas commands
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import type { CommandPayload, CommandType } from '../types';

export interface UseCommandSubscriberOptions {
  onInsertImage?: (payload: CommandPayload['insertImage']) => Promise<any> | any;
  onInsertSvg?: (payload: CommandPayload['insertSvg']) => Promise<any> | any;
  onDrawElements?: (payload: CommandPayload['drawElements']) => Promise<any> | any;
  onUpdateElements?: (payload: CommandPayload['updateElements']) => Promise<any> | any;
  onCaptureScreenshot?: (payload: CommandPayload['captureScreenshot']) => Promise<any> | any;
  onLoadMarkdownFiles?: (payload: CommandPayload['loadMarkdownFiles']) => Promise<any> | any;
  onWebembedSelected?: (payload: CommandPayload['webembed:selected']) => Promise<any> | any;
  onMarkdownEdit?: (payload: CommandPayload['markdown:edit']) => Promise<any> | any;
  onCommand?: (type: CommandType, payload: any) => void;
  onSuccess?: (type: CommandType, result: any) => void;
  onError?: (type: CommandType, error: Error) => void;
}

// Map from command type to handler name
const COMMAND_TO_HANDLER: Record<CommandType, keyof UseCommandSubscriberOptions> = {
  insertImage: 'onInsertImage',
  insertSvg: 'onInsertSvg',
  drawElements: 'onDrawElements',
  updateElements: 'onUpdateElements',
  captureScreenshot: 'onCaptureScreenshot',
  loadMarkdownFiles: 'onLoadMarkdownFiles',
  'webembed:selected': 'onWebembedSelected',
  'markdown:edit': 'onMarkdownEdit',
};

/**
 * Hook to subscribe to and execute canvas commands
 */
export function useCommandSubscriber(handlers: UseCommandSubscriberOptions): void {
  const pendingCommand = useStore((state) => state.pendingCommand);
  const processedCommandId = useStore((state) => (state as any).processedCommandId);
  const resolveCommand = useStore((state) => state.resolveCommand);
  const rejectCommand = useStore((state) => state.rejectCommand);
  
  // Store handlers in a ref to avoid re-subscribing on every render
  const handlersRef = useRef(handlers);
  const localProcessedRef = useRef<string | null>(null);
  
  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  });

  // Process pending commands
  useEffect(() => {
    if (!pendingCommand) {
      localProcessedRef.current = null;
      return;
    }

    // Prevent processing the same command twice (locally or globally)
    const commandKey = `${pendingCommand.type}-${pendingCommand.timestamp}`;
    if (localProcessedRef.current === commandKey || processedCommandId === commandKey) {
      console.log('[useCommandSubscriber] Command already processed:', commandKey);
      return;
    }
    localProcessedRef.current = commandKey;

    const { type, payload } = pendingCommand;
    const currentHandlers = handlersRef.current;

    console.log('[useCommandSubscriber] Processing command:', type, payload);

    // Notify general command handler
    currentHandlers.onCommand?.(type, payload);

    // Get handler name from command type
    const handlerName = COMMAND_TO_HANDLER[type];
    
    if (!handlerName) {
      const error = new Error(`Unknown command type: ${type}`);
      console.error('[useCommandSubscriber]', error);
      rejectCommand(error);
      currentHandlers.onError?.(type, error);
      return;
    }

    // Get specific handler
    const handler = currentHandlers[handlerName];

    if (!handler || typeof handler !== 'function') {
      const error = new Error(`No handler registered for command: ${type} (expected ${handlerName})`);
      console.error('[useCommandSubscriber]', error);
      console.error('[useCommandSubscriber] Available handlers:', Object.keys(currentHandlers).filter(k => k.startsWith('on')));
      rejectCommand(error);
      currentHandlers.onError?.(type, error);
      return;
    }

    console.log('[useCommandSubscriber] Executing handler:', handlerName);

    // Execute handler
    Promise.resolve()
      .then(() => handler(payload))
      .then((result) => {
        console.log('[useCommandSubscriber] Handler succeeded:', type);
        resolveCommand(result);
        currentHandlers.onSuccess?.(type, result);
      })
      .catch((error) => {
        console.error('[useCommandSubscriber] Handler failed:', type, error);
        const err = error instanceof Error ? error : new Error(String(error));
        rejectCommand(err);
        currentHandlers.onError?.(type, err);
      });
  }, [pendingCommand, processedCommandId, resolveCommand, rejectCommand]);
}

/**
 * Simplified hook that just executes a command and returns the result
 */
export function useCommandExecutor(): {
  execute: <T extends CommandType>(
    type: T,
    executor: (payload: CommandPayload[T]) => Promise<any> | any
  ) => Promise<any>;
} {
  const pendingCommand = useStore((state) => state.pendingCommand);
  const resolveCommand = useStore((state) => state.resolveCommand);
  const rejectCommand = useStore((state) => state.rejectCommand);

  const execute = useCallback(async <T extends CommandType>(
    type: T,
    executor: (payload: CommandPayload[T]) => Promise<any> | any
  ): Promise<any> => {
    if (!pendingCommand || pendingCommand.type !== type) {
      throw new Error(`No pending command of type: ${type}`);
    }

    try {
      const result = await executor(pendingCommand.payload as CommandPayload[T]);
      resolveCommand(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      rejectCommand(err);
      throw err;
    }
  }, [pendingCommand, resolveCommand, rejectCommand]);

  return { execute };
}
