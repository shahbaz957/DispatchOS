import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  OFFERED = 'OFFERED',
  BUSY = 'BUSY',
}

export enum DriverAction {
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
}

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  status: DriverStatus;

  @IsOptional()
  @IsEnum(DriverAction)
  action?: DriverAction; // this was choosen to remove the ambuguity bascially 


  // lat and long are only sent when driver complete the order 
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  orderId?: string;
}
