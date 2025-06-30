import { Controller, Post, Body,Put, Get, Delete, Param, Query, UsePipes, ValidationPipe, UseGuards,Request, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { FilesService } from './files.service';
//import { CreateUserDto } from './create-user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CreateFileDto } from './create-files.dto';
import { FileInterceptor } from '@nestjs/platform-express'; // Import correct
import { diskStorage } from 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  constructor(
   private readonly filesService: FilesService) {}

    @Get()
    async getAllUsers() {
      return this.filesService.findAll();
    }

    @Get('getAllByEmail/:email')
    async getAllByEmail(@Param('email') email: string): Promise<any>  {
      return this.filesService.findAllByEmail(email);
    }

    @Get('getFileByEmail/:email')
    async findOneByEmail(@Param('email') email: string): Promise<any> {
        return this.filesService.findOneByEmail(email);
    }

    @Get('getFileById/:id')
    async getUserById(@Param('id') id: string): Promise<any> {
        return this.filesService.findOne(id);
    }

    @Get('getAllPeriod/:period')
    async getAllPeriod(@Param('period') period: string): Promise<any>  {
      return this.filesService.findAllPeriod(period);
    }

    @Get('by-period-year')
    async getByPeriodAndYear(
    @Query('period') period: string,
    @Query('year') year: string,
    ) {
    return this.filesService.findByPeriodAndYear(period, year);
    }
    
    @Post('add/')
    @UseGuards(AuthGuard)
    @UsePipes(new ValidationPipe())
    @UseInterceptors(
        FilesInterceptor('File', 5, {
        storage: diskStorage({
            destination: './uploads', // Stocker les fichiers temporairement
            filename: (req, file, callback) => {
            callback(null, `${Date.now()}-${file.originalname}`);
            },
        }),
        })
    )
    async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto, files);  
    }

  @Put(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('File', 5, {
      storage: diskStorage({
        destination: './uploads', // Stocker les fichiers temporairement
        filename: (req, file, callback) => {
          callback(null, `${Date.now()}-${file.originalname}`);
        },
      }),
    })
  )
  async update(@Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[], 
  @Body() data: any) {
    return this.filesService.update(id, data, files);
  }

    @Delete(':id')
    //@UseGuards(AuthGuard)
    async delete(@Param('id') id: string) {
        return this.filesService.delete(id);
  }
}
