/**
 * Command Slice
 * 
 * Replaces the event emitter pattern for canvas operations.
 * Provides a request/response mechanism for imperative canvas commands.
 */

import type { StateCreator } from 'zustand';
import type { CommandSlice, CommandType, CommandPayload, PendingCommand } from '../types';

interface CommandState {
  pendingCommand: PendingCommand | null;
  processedCommandId: string | null;
}

export const createCommandSlice: StateCreator<
  CommandSlice & CommandState,
  [],
  [],
  CommandSlice & CommandState
> = (set, get) => ({
  // === State ===
  pendingCommand: null,
  processedCommandId: null,

  // === Actions ===
  dispatchCommand: <T extends CommandType>(
    type: T,
    payload: CommandPayload[T]
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Check if there's already a pending command
      if (get().pendingCommand) {
        reject(new Error('Another command is already pending'));
        return;
      }

      const command: PendingCommand<T> = {
        type,
        payload,
        timestamp: Date.now().toString(),
        resolve,
        reject,
      };

      set({ pendingCommand: command, processedCommandId: null });
    });
  },

  clearCommand: () => {
    set({ pendingCommand: null });
  },

  resolveCommand: (result?: any) => {
    const { pendingCommand } = get();
    if (pendingCommand?.resolve) {
      pendingCommand.resolve(result);
    }
    // Mark as processed but keep command briefly for subscribers to see
    set({ 
      pendingCommand: null,
      processedCommandId: pendingCommand ? `${pendingCommand.type}-${pendingCommand.timestamp}` : null 
    });
  },

  rejectCommand: (error: Error) => {
    const { pendingCommand } = get();
    if (pendingCommand?.reject) {
      pendingCommand.reject(error);
    }
    set({ 
      pendingCommand: null,
      processedCommandId: pendingCommand ? `${pendingCommand.type}-${pendingCommand.timestamp}` : null 
    });
  },
});
