import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module'; // Importez AuthModule
import { RoleModule } from '../role/role.module';
import { GCSService } from '../google_cloud/gcs.service'; // Importez le service GCS

@Module({
  imports: [RoleModule, forwardRef(() => AuthModule), ],
  providers: [UsersService, GCSService],
  exports: [UsersService],
  controllers: [UsersController]
})
export class UsersModule {}
