// src/auth/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Config } from '../config';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      console.error('Token manquant.'); // Log pour vérifier si le token est absent
      throw new Error('Token manquant.');
    }

    try {
      if (!Config.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined.');
      }
      const decoded = jwt.verify(token, Config.JWT_SECRET);
      console.log('Token décodé :', decoded); // Log pour vérifier le contenu du token
      request.user = decoded; // Attache l'utilisateur décodé à la requête
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification du token :', error); // Log pour capturer les erreurs
      throw error;
    }
  }
}