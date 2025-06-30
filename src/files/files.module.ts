import { Module, forwardRef } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UsersModule } from '../users/users.module';
import { GCSService } from '../google_cloud/gcs.service'; // Importez le service GCS

@Module({
  imports: [UsersModule],
  providers: [FilesService, GCSService],
  controllers: [FilesController]
})
export class FilesModule {}
