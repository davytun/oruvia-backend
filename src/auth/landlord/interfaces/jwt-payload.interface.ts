export interface LandlordJwtPayload {
  sub: string;
  email: string;
  tokenVersion: number;
  accountType: 'landlord';
}
