import { IsEmail, IsString, MinLength, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class CreateFileDto {
  @ApiProperty({
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur à payer. ',
  })
  @IsEmail()
  Employee: string;

  @ApiProperty({
    example: 'John',
    description: 'La période de paiement ',
  })
  @IsString()
  Period: string;

  @ApiProperty({
    example: 'John',
    description: 'La catégorie de paiement ',
  })
  @IsString()
  Category: string;

  @ApiProperty({
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur faisant l\'action. ',
  })
  @IsEmail()
  CreatedBy: string;
}
