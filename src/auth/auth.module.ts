import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // <--- Importez UsersModule ici


@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Remplacez ceci par votre clé secrète JWT
      signOptions: { expiresIn: '60m' }, // Optionnel : durée de validité du token
    }),
    forwardRef(() => UsersModule), // Utilisez forwardRef() pour éviter la circularité
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
