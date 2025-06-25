import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common'; // Ajoutez cette ligne

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

   async validateUser(email: string, password: string): Promise<any> {
    console.log('Tentative de validation pour l’email :', email);

    // Récupérer l'utilisateur depuis Airtable
    const user = await this.usersService.findOneByEmail(email);
    console.log('Données brutes de l’utilisateur :', user);
  
    if (!user) {
      throw new UnauthorizedException('Aucun utilisateur trouvé avec ce mail.');
    }

    // Vérifier le statut du compte
    await this.usersService.checkUserStatus(user.email); 
    console.log('Statut de l’utilisateur :', user.Status); 

    // Vérifier si le mot de passe est correct
    //const isPasswordValid = await bcrypt.compare(password, user.fields.password);

    // Vérifier si un mot de passe temporaire existe
    const hasResetPassword = user.resetPassword;

    let isPasswordValid = false;

    if (hasResetPassword) {
      // Vérifier le mot de passe temporaire
      isPasswordValid = await bcrypt.compare(password, user.resetPassword);
    } else {
      // Vérifier le mot de passe habituel
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      // Incrémenter les tentatives infructueuses
      await this.usersService.incrementFailedAttempts(user.email);
      console.error('Votre compte sera bloqué après 3 tentatives infructueuses ');
      throw new UnauthorizedException('Identifiants incorrects.');
    }
    // Réinitialiser les tentatives infructueuses en cas de succès
    await this.usersService.resetFailedAttempts(user.email); 
    
    // Extraire les détails de l'utilisateur
    const sanitizedUser = {
      id: user.ref,
      email: user.email || null,
      Name: user.Name || null, // Utilisez "FirstName" comme dans les logs
      Phone: user.Phone || null,
      Adress: user.Adress || null,     // Ajoutez cette ligne si le champ existe
      Photo: user.Photo?.[0]?.url || null, // URL de la photo (si c'est un champ Pièce jointe)
      profileType: user.Profile?.[0] || null, // Type de profil (ex. "AGRICULTEUR")
      resetPasswordUsed: !!hasResetPassword, // Indique si le mot de passe temporaire a été utilisé
      isPassReseted: user.isPassReseted, // Indique si le mot de passe temporaire a été utilisé

    };
  
    console.log('Données nettoyées de l’utilisateur :', sanitizedUser); // Log pour vérification
  
    return sanitizedUser;
  }

  async login(user: any): Promise<any> {
    console.log('Tentative de connexion avec :', user.email);
  
    try {
      const userProfile = await this.validateUser(user.email, user.password);
      console.log('Utilisateur validé :', userProfile);
  
      if (!userProfile) {
        throw new UnauthorizedException('Identifiants incorrects.');
      }
  
      const payload = {
        id: userProfile.id,
        email: userProfile.email,
        profile: userProfile.Profile?.[0],
      };
  
      const accessToken = this.jwtService.sign(payload);
      console.log('ID retourné :', userProfile.id);

      return {
        access_token: accessToken,
        user: {
          id: userProfile.id,
          Name: userProfile.Name,
          Adress: userProfile.Adress,
          email: userProfile.email,
          Phone: userProfile.Phone,
          Photo: userProfile.Photo,
          profileType: userProfile.profileType,
          isPassReseted: userProfile.isPassReseted,

        },
      };
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      // Incrémenter les tentatives infructueuses en cas d'échec
      await this.usersService.incrementFailedAttempts(user.email);
      throw error; // Relancer l'erreur pour afficher un message générique au client
    }
  }
}
