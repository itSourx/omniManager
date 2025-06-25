import { IsEmail, IsString, MinLength, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer'; // Importez Type ici


export class CreateUserDto {
  @ApiProperty({
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur à enregister. ',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'Le(s) prénom(s) de l\'utilisateur à enregister. ',
  })
  @IsString()
  Name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Le nom de l\'utilisateur à enregister. ',
  })
  @IsString()
  Phone: string;

  @ApiProperty({
    example: 'Admin, Monitoring, Accounting, Office, Head, IT, sous-user',
    description: 'Le type de l\'utilisateur à enregister. ',
  })
  @IsString()
  profileType: string;

  @ApiProperty({
    example: 'Office, Production, Digital',
    description: 'Le type de l\'utilisateur à enregister. ',
  })
  @IsString()
  Department: string;

  @ApiProperty({
    example: 'Office, Production',
    description: 'Le type de l\'utilisateur à enregister. ',
  })
  @IsString()
  Entity: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Définir un mot de passe d\'au moins 8 caractères. ',
  })
  @IsString()
  @MinLength(8)
  password: string;

}
