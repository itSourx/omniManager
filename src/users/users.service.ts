import { Injectable, ConflictException, HttpException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as Airtable from 'airtable'; // Importez Airtable correctement
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
//import { MailService } from '../mail/mail.service';
import { RoleService } from '../role/role.service'; // Importez ProfilesService
import { Config } from '../config';
import { Express } from 'express';
import { randomBytes } from 'crypto'; // Pour générer un mot de passe aléatoire
import * as nodemailer from 'nodemailer';
import { GCSService } from '../google_cloud/gcs.service';
import { unlinkSync } from 'fs';
import { Storage } from '@google-cloud/storage';

dotenv.config();

@Injectable()
export class UsersService {
    private base;
    constructor(
        //private readonly mailService: MailService,
        private readonly roleService: RoleService,
        private readonly gcsService: GCSService) {

        // Configurez Airtable directement ici
        const airtable = new Airtable({ apiKey: Config.AIRTABLE_API_KEY });
        if (!Config.AIRTABLE_BASE_ID) {
        throw new Error('AIRTABLE_BASE_ID is not defined in the environment variables');
        }
        this.base = airtable.base(Config.AIRTABLE_BASE_ID);
    }

    async checkEmailUniqueness(email: string): Promise<any | null> {
    const records = await this.base('Users')
        .select({ filterByFormula: `{email} = '${email}'` })
        .firstPage();

    if (records.length > 0) {
        throw new Error('Un utilisateur avec cet email existe déjà.');
    }
    }
  // Récupérer un utilisateur par ID
  async findOne(id: string): Promise<any> {
    const response = await this.base('Users').select({ filterByFormula: `{ref} = '${id}'` });
    if (!response.data) {
      throw new Error('Utilisateur non trouvé.');
    }

    return response.data;
  }

    async getUserById(id: string) {
    try {
        // Récupérer les enregistrements depuis Airtable
        const records = await this.base('Users')
        .select({ filterByFormula: `{ref} = '${id}'` })
        .firstPage();

        if (records.length === 0) {
        throw new Error('Utilisateur non trouvé.');
        }

        // Extraire les champs de l'utilisateur
        const userFields = records[0].fields;

        console.log('Utilisateur récupéré avec succès.');
        return userFields;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur :', error.message);
        throw error;
    }
    }

  // Rechercher un utilisateur par email
  async findOneByEmail(email: string): Promise<any | null> {
    try {
     const response = await this.base('Users')
      .select({ filterByFormula: `{email} = '${email}'` })
      .firstPage();

      console.log('Réponse brute d’Airtable :', response);
      if (response.length > 0) {
        const user = response[0];
    
       // Normalisez le champ "email" pour s'assurer qu'il est une chaîne de texte
      if (Array.isArray(user.email)) {
        user.email = user.email[0]; // Prenez le premier élément du tableau
        }
      
        return user.fields;
        } 

      return null; // Aucun utilisateur trouvé avec cet email
    } catch (error) {
      console.error('Erreur lors de la recherche d’utilisateur par email :', error);
      throw error;
    }
  }

  // Vérifier si un mot de passe fourni correspond au mot de passe haché stocké
  private async verifyPassword(storedHash: string, plainTextPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, storedHash);
  }

  // Hacher le mot de passe avant de créer un utilisateur
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // Nombre de tours de hachage (recommandé : 10)
    return await bcrypt.hash(password, saltRounds);
  }
    // Vérification du statut d'un utilisateur
    async checkUserStatus(email: string): Promise<void> {
    console.log(`Vérification du statut de l'utilisateur : ${email}`);
    const user = await this.findOneByEmail(email);

    if (user.Status === 'DISMISSED') {
        throw new Error('Votre compte a été bloqué. Veuillez contacter l\'administrateur ');
    }
    console.log(`Statut validé avec succès pour l'utilisateur' : ${email}`);
    }

  async incrementFailedAttempts(email: string): Promise<void> {
      const user = await this.findOneByEmail(email);

      const newAttempts = (user.tentatives_echec || 0) + 1;
      if (newAttempts >= 3) {
        // Bloquer le compte
        await this.update(user.ref, { Status: 'DISMISSED', tentatives_echec: newAttempts });
        throw new Error('Votre compte a été bloqué après 3 tentatives infructueuses.');
      }

      // Mettre à jour le nombre de tentatives
      await this.update(user.ref, { tentatives_echec: newAttempts });
  }

  async resetFailedAttempts(email: string): Promise<void> {
  try {
    const user = await this.findOneByEmail(email);

    // Réinitialiser les tentatives infructueuses à 0
    await this.update(user.ref, { tentatives_echec: 0 });
    
      // Vérifier que la mise à jour a réussi
      const updatedUser = await this.findOneByEmail(email);
    }
    catch (error) {
    throw error;
    }
  }

  async create(data: any, files?: Express.Multer.File[]): Promise<any> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.checkEmailUniqueness(data.email);
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    // Gestion des images locales
    if (files && files.length > 0) {
      // Uploader chaque fichier vers GCS
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          try {
            // Uploader l'image vers GCS
            const publicUrl = await this.gcsService.uploadImage(file.path);

            // Supprimer le fichier local après l'upload
            unlinkSync(file.path); // Nettoyage du fichier temporaire

            return publicUrl;
          } catch (error) {
            console.error('Erreur lors de l\'upload de l\'image :', error.message);
            throw new Error('Impossible d\'uploader l\'image.');
          }
        })
      );
      // Remplacer le champ Photo par les URLs des images uploadées
      data.Photo = uploadedImages.map(url => ({ url }));
    } else if (data.Photo) {
      // Si Photo est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.Photo === 'string') {
        data.Photo = [{ url: data.Photo }];
      }
      // Si Photo est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.Photo)) {
        data.Photo = data.Photo.map(url => ({ url }));
      }
    }

    // Si profileType est fourni, récupérez l'ID du profil correspondant
    if (data.profileType) {
      const profile = await this.roleService.findOneByType(data.profileType);
  
      if (!profile) {
        throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
      }
  
      // Formatez le champ "profile" comme un tableau d'IDs
      data.Role = [profile.id];
      delete data.profileType; // Supprimez profileType car il n'est pas stocké directement
    } 
    // Hacher le mot de passe
    if (data.password) {
      data.password = await this.hashPassword(data.password); // Hachez le mot de passe
    }
  
    try {
      // Envoyer les données à Airtable
      const response = await this.base('Users').create([{ fields: data }]);
      //return { id: createdRecords[0].id, ...createdRecords[0].fields };

        // Extraire l'ID généré par Airtable
      const createdRecord = response[0];
      const generatedId = createdRecord.id;
      //Supprimer les champs sensibles
      delete createdRecord.password;   

      return {
        id: generatedId,
        fields: createdRecord.fields,
      };
    } catch (error) {
      console.error('Erreur lors de la création de l’utilisateur :', error);
      throw error;
    }
  }

    async findAll(): Promise<any[]> {
    try {
        const records = await this.base('Users').select({
        fields: ['ID', 'ref', 'NI_Number', 'email', 'Name', 'Adress', 'Phone', 'Profile','Department', 'Entity', 'Photo', 'Birth', 'Title', 'Sex', 'PayStatus', 'ref', 'GrossSalary', 'MonthlySalary', 'HoursRate', 'Enter', 'Departure','TaxCode', 'SortCode', 'BankName', 'AccountNumber', 'AccountName', 'Allowance', 'MonthlyAllowance', 'Status'], // Ne récupérer que les champs pertinents
        maxRecords: 100, // Limite à 100 enregistrements
        pageSize: 100,   // Facultatif : page de 100
        }).all();

        return records.map((record) => {
        const fields = record.fields;
        delete fields.password;
        return { id: record.id, ...fields };
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements :', error.message);
        throw error;
    }
    }

  // Mettre à jour un utilisateur
  async update(id: string, data: any, files?: Express.Multer.File[]): Promise<any> {
    try {
      if (data.ifu && typeof data.ifu === 'string') {
        data.ifu = parseInt(data.ifu); // Conversion en nombre
      }
      if (data.compteOwo && typeof data.compteOwo === 'string') {
        data.compteOwo = parseInt(data.compteOwo); // Conversion en nombre
      }
      // Si profileType est fourni, récupérez l'ID du profil correspondant
      if (data.profileType) {
        const profile = await this.roleService.findOneByType(data.profileType);
  
        if (!profile) {
          throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
        }
  
        // Formatez le champ "profile" comme un tableau d'IDs
        data.profile = [profile.id];
        delete data.profileType; // Supprimez profileType car il n'est pas stocké directement
      }
    // Gestion des images locales
    if (files && files.length > 0) {
      // Uploader chaque fichier vers GCS
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          try {
            // Uploader l'image vers GCS
            const publicUrl = await this.gcsService.uploadImage(file.path);

            // Supprimer le fichier local après l'upload
            unlinkSync(file.path); // Nettoyage du fichier temporaire

            return publicUrl;
          } catch (error) {
            console.error('Erreur lors de l\'upload de l\'image :', error.message);
            throw new Error('Impossible d\'uploader l\'image.');
          }
        })
      );
      // Remplacer le champ Photo par les URLs des images uploadées
      data.Photo = uploadedImages.map(url => ({ url }));
    } else if (data.Photo) {
      // Si Photo est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.Photo === 'string') {
        data.Photo = [{ url: data.Photo }];
      }
      // Si Photo est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.Photo)) {
        data.Photo = data.Photo.map(url => ({ url }));
      }
    }
      
      // Mettez à jour l'utilisateur dans Airtable
        const response = await this.base('Users').update(id, data);
      
      console.error('Données de mise à jour de l’utilisateur :', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’utilisateur :', error);
      throw new Error('Impossible de mettre à jour l’utilisateur.');
    }
  }

    // Suppression d'un utilisateur
    async delete(id: string) {
    try {
        await this.base('Users').destroy(id);
        
        return { message: 'Utilisateur supprimé avec succès.' };
    } catch (error) {
        throw new Error(`Erreur lors de la suppression de l'utilisateur : ${error.message}`);
    }
    }

    // Débloquer un compte
    async unlockUser(email: string) {
    // Étape 1 : Rechercher l'utilisateur par email
    const user = await this.findOneByEmail(email);

    // Vérifier si l'utilisateur existe
    if (!user) {
        throw new Error('Aucun utilisateur trouvé avec cet email.');
    }

    // Étape 2 : Vérifier si le compte est déjà activé
    if (user.Status === 'ACTIVE') {
        throw new Error('Le compte de cet utilisateur est déjà activé.');
    }

    try {
        // Étape 3 : Activer le compte
        await this.update(user.ref, { Status: 'ACTIVE', tentatives_echec: 0 });

        // Retourner un message de succès
        return { message: 'Le compte a été activé avec succès.' };
    } catch (error) {
        // Gérer les erreurs potentielles lors de la mise à jour
        console.error('Erreur lors de l\'activation du compte :', error);
        throw error;
    }
    }

    // Bbloquer un compte
    async blockUser(email: string): Promise<void> {
    // Étape 1 : Rechercher l'utilisateur par email
    const user = await this.findOneByEmail(email);

    // Vérifier si l'utilisateur existe
    if (!user) {
        throw new Error('Aucun utilisateur trouvé avec cet email.');
    }

    // Étape 2 : Vérifier si le compte est déjà bloqué
    if (user.Status === 'DISMISSED') {
        throw new Error('Le compte de cet utilisateur est déjà bloqué.');
    }

    try {
        // Étape 3 : Bloquer le compte
        await this.update(user.ref, { Status: 'DISMISSED' });
    } catch (error) {
        // Gérer les erreurs potentielles lors de la mise à jour
        console.error('Erreur lors du blocage du compte :', error);
        throw error;
    }
    }

  // Changer le mot de passe d'un utilisateur
    async changePassword(userId: string, oldPassword: string, newPassword: string, token: string): Promise<any> {
      // Récupérer l'utilisateur actuel
      const user = await this.getUserById(userId);
  
      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable.');
      }
  
      // Vérifier que l'ancien mot de passe est correct
      const passwordHash = user.password; // Champ contenant le mot de passe haché
      const isPasswordValid = await this.verifyPassword(passwordHash, oldPassword);
  
      if (!isPasswordValid) {
        throw new UnauthorizedException('Ancien mot de passe incorrect.');
      }
  
      // Valider le nouveau mot de passe
      if (newPassword.length < 8) {
        throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      }
  
      // Hacher le nouveau mot de passe
      const hashedNewPassword = await this.hashPassword(newPassword);
  
      // Mettre à jour le mot de passe dans Airtable
      try {
        await this.base('Users').update(userId, { password: hashedNewPassword });
  
      // Appeler la fonction logout pour déconnecter l'utilisateur
      //await this.logout(token);

      return { message: 'Mot de passe mis à jour avec succès! Vous devez vous déconnecter.' };
      } catch (error) {
        console.error('Erreur lors de la mise à jour du mot de passe :', error);
        throw error;
      }
    }
  // Générer un mot de passe aléatoire de 9 caractères
  private generateRandomPassword(length: number = 9): string {
    const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }
    return password;
  }

  // Réinitialiser le mot de passe d'un utilisateur
  async resetPassword(email: string): Promise<any> {
    // Vérifier si l'utilisateur existe
    const user = await this.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('Aucun utilisateur trouvé avec cet email.');
    }

    // Générer un mot de passe temporaire
    const temporaryPassword = this.generateRandomPassword(9);

    // Hacher le mot de passe temporaire
    const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, 10);

    try {
      // Enregistrer le mot de passe temporaire dans le champ resetPassword
    await this.base('Users').update(user.ref, { resetPassword: hashedTemporaryPassword });

    // Envoyer le mot de passe temporaire par email
    await this.sendPasswordResetEmail(email, temporaryPassword);

    return { message: 'Un mot de passe temporaire a été envoyé à votre adresse email.' };

    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe :', error);
      throw new Error('Impossible de réinitialiser le mot de passe.');
    }
  }

  private async sendPasswordResetEmail(email: string, temporaryPassword: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: 'mail.sourx.com', // Remplacez par l'adresse SMTP de votre hébergeur
      port: 465, // Port SMTP (généralement 587 pour TLS ou 465 pour SSL)
      secure: true, // Utilisez `true` si le port est 465 (SSL)
      auth: {
        user: process.env.EMAIL_USER, // Votre adresse email
        pass: process.env.EMAIL_PASSWORD, // Votre mot de passe email
      },
      tls: {
        rejectUnauthorized: false, // Ignorer les certificats non valides (si nécessaire)
      },
    });
  
    const mailOptions = {
      from: process.env.EMAIL_USER, // Expéditeur
      to: email, // Destinataire
      subject: 'Réinitialisation de votre mot de passe',
      text: `Votre nouveau mot de passe temporaire est : ${temporaryPassword}. Veuillez le changer dès que possible.`,
    };
  
    await transporter.sendMail(mailOptions);
  }


  async validateResetPassword(email: string, temporaryPassword: string, newPassword: string): Promise<any> {
    // Récupérer l'utilisateur par email
    const user = await this.findOneByEmail(email);
  
    if (!user) {
      throw new NotFoundException('Aucun utilisateur trouvé avec cet email.');
    }
  
    // Vérifier si le mot de passe temporaire est valide
    const storedTemporaryPassword = user.resetPassword;
    if (!storedTemporaryPassword) {
      throw new UnauthorizedException('Aucun mot de passe temporaire enregistré.');
    }
  
    const isPasswordValid = await bcrypt.compare(temporaryPassword, storedTemporaryPassword);
  
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe temporaire incorrect.');
    }
  
    // Valider le nouveau mot de passe
    if (newPassword.length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    }
  
    // Hacher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
    try {
      // Mettre à jour le mot de passe permanent et effacer le champ resetPassword
      await this.base('Users').update(user.ref, { password: hashedNewPassword, resetPassword: ''});

      // Appeler la fonction logout pour déconnecter l'utilisateur
      //await this.logout(token);

      return { message: 'Mot de passe mis à jour avec succès! Vous avez été déconnecté.' };
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe :', error);
      throw error;
    }
  }
}
