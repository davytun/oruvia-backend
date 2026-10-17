export interface SeekerJwtPayload {
  sub: string;
  email: string;
  tokenVersion: number;
  accountType: 'seeker';
}
