import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

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

  //await app.listen(process.env.PORT ?? 3000);
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });  
}
bootstrap();
