import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateItemDto, CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TAddProductPending } from './types';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('product')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return await this.productService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('warehouseId') warehouseId: string,
    @Query('perPage') perPage?: string,
    @Query('page') page?: string,
    @Query('itemId') itemId?: string,
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
  ) {
    const pageNumber = page ? parseInt(page) : undefined;
    const itemsPerPage = perPage ? parseInt(perPage) : undefined;

    const filters = {
      itemId: itemId ? parseInt(itemId) : undefined,
      brandId: brandId ? parseInt(brandId) : undefined,
      modelId: modelId ? parseInt(modelId) : undefined,
    };

    return this.productService.getProducts(
      parseInt(warehouseId),
      itemsPerPage,
      pageNumber,
      filters,
    );
  }

  @Get('entries')
  findAllProductEntries(
    @Query('warehouseId') warehouseId: string,
    @Query('perPage') perPage?: string,
    @Query('page') page?: string,
    @Query('itemId') itemId?: string,
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('status') status?: 'done' | 'pending',
  ) {
    const pageNumber = page ? parseInt(page) : undefined;
    const itemsPerPage = perPage ? parseInt(perPage) : undefined;

    const filters = {
      itemId: itemId ? parseInt(itemId) : undefined,
      brandId: brandId ? parseInt(brandId) : undefined,
      modelId: modelId ? parseInt(modelId) : undefined,
      status,
    };
    return this.productService.getProductEntries(
      parseInt(warehouseId),
      itemsPerPage,
      pageNumber,
      filters,
    );
  }

  @Get('sales')
  async getProductSales(
    @Query('warehouseId') warehouseId: string,
    @Query('perPage') perPage?: number,
    @Query('page') page?: number,
    @Query('itemId') itemId?: number,
    @Query('brandId') brandId?: number,
    @Query('modelId') modelId?: number,
  ) {
    const filters = {
      itemId: itemId ? Number(itemId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      modelId: modelId ? Number(modelId) : undefined,
    };

    return this.productService.getProductSales(
      Number(warehouseId),
      perPage ? Number(perPage) : undefined,
      page ? Number(page) : undefined,
      filters,
    );
  }
  @Post('add-item')
  async addItem(@Body() createProductDto: CreateItemDto) {
    return await this.productService.addItem(createProductDto);
  }

  @Post('add-pending')
  async addProductPending(@Body() data: TAddProductPending) {
    try {
      await this.productService.addProductPending(data);
      return { message: 'Products added successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to add products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('accept-productEntry')
  async acceptProductEntry(
    @Body() { id, userId }: { id: number; userId: number },
  ) {
    try {
      return await this.productService.acceptProductEntry(id, userId);
    } catch (error) {
      throw new HttpException(
        'Failed to accept product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('get-item')
  findItem(@Query('search') search: string) {
    return this.productService.searchItems(search);
  }

  @Post('add-brand')
  async addBrand(@Body() createProductDto: CreateItemDto) {
    return await this.productService.addBrand(createProductDto);
  }

  @Get('get-brand')
  findBrand(@Query('search') search: string) {
    return this.productService.searchBrands(search);
  }

  @Post('add-model')
  async addModel(@Body() createProductDto: CreateItemDto) {
    return await this.productService.addModel(createProductDto);
  }

  @Get('get-model')
  findModel(@Query('search') search: string) {
    return this.productService.searchModel(search);
  }

  @Get('total-sales')
  async getSalesTotals() {
    console.log('wedwede');

    try {
      const salesData = await this.productService.calculateSales();
      return salesData;
    } catch (error) {
      // Handle errors gracefully
      throw new HttpException(
        {
          success: false,
          message: 'Error retrieving sales totals',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
