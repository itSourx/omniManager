import { Injectable, ConflictException, HttpException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as Airtable from 'airtable'; // Importez Airtable correctement
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service'; 
import { Config } from '../config';
import { Express } from 'express';
import { randomBytes } from 'crypto'; 
import * as nodemailer from 'nodemailer';
import { GCSService } from '../google_cloud/gcs.service';
import { unlinkSync } from 'fs';
import { Storage } from '@google-cloud/storage';

dotenv.config();

@Injectable()
export class FilesService {
    private base;
    constructor(
        private readonly gcsService: GCSService,
        private readonly usersService: UsersService) {

        // Configurez Airtable directement ici
        const airtable = new Airtable({ apiKey: Config.AIRTABLE_API_KEY });
        if (!Config.AIRTABLE_BASE_ID) {
        throw new Error('AIRTABLE_BASE_ID is not defined in the environment variables');
        }
        this.base = airtable.base(Config.AIRTABLE_BASE_ID);
    }
    async findAll(): Promise<any[]> {
    try {
        const records = await this.base('Files').select({
        //fields: ['Employee', 'ref', 'E', 'Name', 'Adress', 'Phone', 'Profile', 'Entity', 'File', 'Birth', 'Title', 'Sex'], // Ne récupérer que les champs pertinents
        maxRecords: 100, // Limite à 100 enregistrements
        pageSize: 100,   // Facultatif : page de 100
        }).all();

        return records.map((record) => {
        const fields = record.fields;
        //delete fields.password;
        return { id: record.id, ...fields };
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements :', error.message);
        throw error;
    }
    }

  // Récupérer un par ID
  async findOne(id: string): Promise<any> {
    try {
        // Récupérer les enregistrements depuis Airtable
        const records = await this.base('Files')
        .select({ filterByFormula: `{ref} = '${id}'` });

        if (records.length === 0) {
        throw new Error('Enregistrement non trouvé.');
        }

        // Extraire les champs de l'utilisateur
        const userFields = records[0].fields;

        console.log('Enregistrement récupéré avec succès.');
        return userFields;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'enregistrement :', error.message);
        throw error;
    }
  }
  // Rechercher un utilisateur par email
  async findOneByEmail(email: string): Promise<any | null> {
    try {
     const response = await this.base('Files')
      .select({ filterByFormula: `{Employee} = '${email}'` })
      .firstPage();

      console.log('Réponse brute d’Airtable :', response);
      if (response.length > 0) {
        const file = response[0];
    
       // Normalisez le champ "email" pour s'assurer qu'il est une chaîne de texte
      if (Array.isArray(file.email)) {
        file.email = file.Employee[0]; // Prenez le premier élément du tableau
        }
      
        return file.fields;
        } 

      return null; // Aucun utilisateur trouvé avec cet email
    } catch (error) {
      console.error('Erreur lors de la recherche d’utilisateur par email :', error);
      throw error;
    }
  }
    async findAllByEmail(email: string): Promise<any[]> {
    try {
        const records = await this.base('Files').select({
        filterByFormula: `{Employee} = '${email}'`,
        maxRecords: 100,
        pageSize: 100,
        }).all();

        return records.map((record) => {
        const fields = record.fields;
        // delete fields.password; // Si besoin
        return { id: record.id, ...fields };
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements :', error.message);
        throw error;
    }
    }

    async findAllPeriod(period: string): Promise<any[]> {
    try {
        const records = await this.base('Files').select({
        filterByFormula: `LOWER({Period}) = '${period.toLowerCase()}'`,
        maxRecords: 100,
        pageSize: 100,
        }).all();

        return records.map((record) => {
        const fields = record.fields;
        // delete fields.password; // Si besoin
        return { id: record.id, ...fields };
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements :', error.message);
        throw error;
    }
    }

    async findByPeriodAndYear(period: string, year: string): Promise<any[]> {
    try {
        const formula = `AND(LOWER({Period}) = '${period.toLowerCase()}', {Year} = '${year.toLowerCase()}')`;

        const records = await this.base('Files').select({
        filterByFormula: formula,
        maxRecords: 100,
        pageSize: 100,
        }).all();

        return records.map((record) => {
        return {
            id: record.id,
            ...record.fields,
        };
        });

    } catch (error) {
        console.error('Erreur lors du filtrage par période et année :', error.message);
        throw error;
    }
    }

  async create(data: any, files?: Express.Multer.File[]): Promise<any> {

    // Si email de l'employé est fourni, récupérez l'ID du profil correspondant
    if (data.Employee) {
      const user = await this.usersService.findOneByEmail(data.Employee);

      if (!user) {
        throw new Error(`L'utilisateur avec ce mail "${data.Employee}" n'existe pas.`);
      }
  
      // Formatez le champ "profile" comme un tableau d'IDs
      data.Employee = [user.ref];
      //delete data.Employee; // Supprimez profileType car il n'est pas stocké directement
    } 

    // Si email de l'utilisateur est fourni, récupérez l'ID du role correspondant
    if (data.CreatedBy) {
      const user = await this.usersService.findOneByEmail(data.CreatedBy);

      if (!user) {
        throw new Error(`L'utilisateur avec ce mail "${data.CreatedBy}" n'existe pas.`);
      }
  
      // Formatez le champ "profile" comme un tableau d'IDs
      data.CreatedBy = [user.ref];
      //delete data.Employee; // Supprimez profileType car il n'est pas stocké directement
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
      // Remplacer le champ File par les URLs des images uploadées
      data.File = uploadedImages.map(url => ({ url }));
    } else if (data.File) {
      // Si File est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.File === 'string') {
        data.File = [{ url: data.File }];
      }
      // Si File est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.File)) {
        data.File = data.File.map(url => ({ url }));
      }
    }
  
    try {
      // Envoyer les données à Airtable
      const response = await this.base('Files').create([{ fields: data }]);
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
      console.error('Erreur lors de la création de payroll :', error);
      throw error;
    }
  }
    // Suppression d'un utilisateur
    async delete(id: string) {
    try {
        await this.base('Files').destroy(id);
        
        return { message: 'Enregistrement supprimé avec succès.' };
    } catch (error) {
        throw new Error(`Erreur lors de la suppression de l'enregistrement : ${error.message}`);
    }
    }

  // Mettre à jour un utilisateur
  async update(id: string, data: any, files?: Express.Multer.File[]): Promise<any> {
    try {
      if (data.PAYRISE && typeof data.PAYRISE === 'string') {
        data.PAYRISE = parseFloat(data.PAYRISE); 
      }

      if (data.ADD && typeof data.ADD === 'string') {
        data.ADD = parseFloat(data.ADD); 
      }

      if (data.RETRIEVE && typeof data.RETRIEVE === 'string') {
        data.RETRIEVE = parseFloat(data.RETRIEVE); 
      }
        if (data.Employee) {
        const user = await this.usersService.findOneByEmail(data.Employee);

        if (!user) {
            throw new Error(`L'utilisateur avec ce mail "${data.Employee}" n'existe pas.`);
        }
    
        // Formatez le champ "profile" comme un tableau d'IDs
        data.Employee = [user.ref];
        //delete data.Employee;
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
      // Remplacer le champ File par les URLs des images uploadées
      data.File = uploadedImages.map(url => ({ url }));
    } else if (data.File) {
      // Si File est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.File === 'string') {
        data.File = [{ url: data.File }];
      }
      // Si File est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.File)) {
        data.File = data.File.map(url => ({ url }));
      }
    }
      
      // Mettez à jour l'utilisateur dans Airtable
        const response = await this.base('Files').update(id, data);
      
      console.error('Données de mise à jour de l’utilisateur :', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’enregistrement :', error);
      throw error;
    }
  }
}
