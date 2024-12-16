import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getHello(): Promise<string> {
    // Fetching users from Prisma
    const users = await this.prisma.user.findMany();
    console.log(users);
    
    // Assuming you want to return a string message. 
    // Customize this as needed based on your requirements.
    return `Found ${users.length} users`;
  }
}
