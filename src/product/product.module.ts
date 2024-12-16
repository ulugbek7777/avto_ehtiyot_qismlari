// src/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductService } from './product.service'; // Adjust the path as needed
import { ProductController } from './product.controller'; // Adjust the path as needed
import { PrismaModule } from 'src/prisma/prisma.module'; // This should work now

@Module({
  imports: [PrismaModule], // Import PrismaModule
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
