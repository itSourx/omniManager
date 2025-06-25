import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as Airtable from 'airtable';
import { Config } from '../config';

dotenv.config();

@Injectable()
export class RoleService {
    private base;
    constructor() {
        const airtable = new Airtable({ apiKey: Config.AIRTABLE_API_KEY });
        if (!Config.AIRTABLE_BASE_ID) {
        throw new Error('AIRTABLE_BASE_ID is not defined in the environment variables');
        }
        this.base = airtable.base(Config.AIRTABLE_BASE_ID);
    }

  async findAll() {
    const records = await this.base('Role').select().all();
    return records.map((record) => ({ id: record.id, ...record.fields }));
  }

  // Récupérer un role par son ID
  async findOne(id: string) {
    const records = await this.base('Role')
      .select({ filterByFormula: `{id} = '${id}'` })
      .firstPage();

    if (records.length === 0) {
      throw new Error('Role non trouvé.');
    }

    return { id: records[0].id, ...records[0].fields };
  }

  async create(roleData: any) {
    try {
      const createdRecords = await this.base('Role').create([{ fields: roleData }]);
      return { id: createdRecords[0].id, ...createdRecords[0].fields };
    } catch (error) {
      throw new Error(`Erreur lors de la création du role : ${error.message}`);
    }
  }

  async update(id: string, updatedData: any) {
    try {
      await this.base('Role').update(id, updatedData);
      return { message: 'Role mis à jour avec succès.' };
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du role : ${error.message}`);
    }
  }

  async delete(id: string) {
    try {
      await this.base('Role').destroy(id);
      return { message: 'Role supprimé avec succès.' };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du role : ${error.message}`);
    }
  }
    async findOneByType(type: string): Promise<any | null> {
      try {
        const response = await this.base('Role')
        .select({ filterByFormula: `{Role} = '${type}'` })
        .firstPage();
    
        if (response.length > 0) {
          const role = response[0];
    
      // Normalisez le champ "type" pour s'assurer qu'il est une chaîne de texte
      if (Array.isArray(role.fields.Role)) {
          role.fields.Role = role.fields.Role[0]; // Prenez le premier élément du tableau
        }
    
          return role.fields;
        }
    
        return null;
      } catch (error) {
        console.error('Erreur lors de la recherche du profil :', error);
        return null;
      }
    }
}
