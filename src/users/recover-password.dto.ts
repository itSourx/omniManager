// src/users/dto/recover-password.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class RecoverPasswordDto {
  @IsString()
  @IsNotEmpty()
  numero_compte: string;
}