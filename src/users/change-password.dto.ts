import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({
    example: 'securepassword123',
    description: 'Ancien mot de passe. ',
  })
  @IsString()
  @MinLength(1)
  oldPassword: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Définir un mot de passe d\'au moins 8 caractères. ',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}