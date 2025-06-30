import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RoleModule } from './role/role.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';


@Module({
  imports: [AuthModule, RoleModule, UsersModule, FilesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
