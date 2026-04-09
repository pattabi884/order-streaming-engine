// status.constants.ts (boilerplate pattern)
export const AGENT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ON_DELIVERY: 'ON_DELIVERY',
  OFFLINE: 'OFFLINE',
} as const;

export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS];
