export interface AgentJwtPayload {
  sub: string;
  email: string;
  tokenVersion: number;
  accountType: 'agent';
}
