import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
//import * as winston from 'winston';
import * as path from 'path'; // Importe path pour gérer les chemins de fichiers
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
// Chargez les variables d'environnement
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //await app.listen(process.env.PORT ?? 3000);
  app.enableCors({
    origin: '*', // Autorise toutes les origines (à ajuster en production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Appliquez le filtre d'exception globalement
  app.useGlobalFilters(new AllExceptionsFilter());

    // Configuration de Swagger
    const config = new DocumentBuilder()
    .setTitle('omniManager API') // Titre de l'API
    .setDescription('Documentation de l\'API omniManager') // Description
    .setVersion('1.0') // Version de l'API
    .setContact('Support', '#', 'support@sourx.com')
    .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3002', 'Local Environment')
    .addServer('https://omnimanager-8d2d0655b586.herokuapp.com/', 'Production Environment')
    .addTag('auth', 'Endpoints liés à l\'authentification') // Tags pour organiser les endpoints
    .addTag('users', 'Endpoints liés aux utilisateurs')
    .addTag('role', 'Endpoints liés aux profiles')
    //.addTag('orders', 'Endpoints liés aux commandes')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT', // Nom du token JWT dans Swagger
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // URL pour accéder à Swagger

  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });  
}
bootstrap();
