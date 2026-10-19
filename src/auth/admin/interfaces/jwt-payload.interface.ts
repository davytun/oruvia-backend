export interface AdminJwtPayload {
  sub: string;
  email: string;
  tokenVersion: number;
  accountType: 'admin';
}
