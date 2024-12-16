import {
  BadRequestException,
  Body,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateItemDto,
  CreateProductDto,
  SearchItemDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TAddProductPending } from './types';
import {
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {} // Inject only PrismaService

  async create(@Body() createProductDto: CreateProductDto) {
    const {
      itemId,
      brandId,
      modelId,
      price,
      wholesalePrice,
      purchasePrice,
      quantity,
      warehouseId,
    } = createProductDto;

    // Check if the Warehouse exists
    const warehouseExists = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouseExists) {
      throw new Error(`Warehouse with ID ${warehouseId} does not exist.`);
    }

    // Check if the ItemModelBrandRelation exists
    let itemModelBrandRelation =
      await this.prisma.itemModelBrandRelation.findFirst({
        where: {
          itemId: itemId,
          brandId: brandId,
          modelId: modelId,
        },
      });

    // If it does not exist, create it
    if (!itemModelBrandRelation) {
      itemModelBrandRelation = await this.prisma.itemModelBrandRelation.create({
        data: {
          item: { connect: { id: itemId } },
          brand: { connect: { id: brandId } },
          model: { connect: { id: modelId } },
          price,
          wholesalePrice,
          // purchasePrice,
        },
      });
    }

    // Check if the product already exists in the warehouse
    let existingProduct = await this.prisma.product.findFirst({
      where: {
        itemModelBrandRelationId: itemModelBrandRelation.id,
        warehouseId: warehouseId,
      },
    });

    let product;
    if (existingProduct) {
      // If product exists, update the quantity
      product = await this.prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          quantity: {
            increment: quantity, // Add to the existing quantity
          },
        },
      });
    } else {
      // If the product does not exist, create a new product
      product = await this.prisma.product.create({
        data: {
          itemModelBrandRelation: {
            connect: { id: itemModelBrandRelation.id },
          },
          warehouse: { connect: { id: warehouseId } },
          quantity,
        },
      });
    }

    // Create or update a product entry for statistics
    const productEntry = await this.prisma.productEntry.create({
      data: {
        product: { connect: { id: product.id } },
        warehouse: { connect: { id: warehouseId } },
        quantity,
        purchasePrice,
        status: 'done',
      },
    });

    // Send response
    return { product, productEntry };
  }

  async getProducts(
    warehouseId: number,
    perPage?: number,
    page?: number,
    filters?: { itemId?: number; brandId?: number; modelId?: number },
  ) {
    // Check if the warehouse exists
    const warehouseExists = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouseExists) {
      throw new NotFoundException(
        `Warehouse with ID ${warehouseId} does not exist.`,
      );
    }

    // Build filter conditions
    const filterConditions: any = {
      warehouseId,
    };

    // Apply filters if provided
    if (filters?.itemId) {
      filterConditions.itemModelBrandRelation = { itemId: filters.itemId };
    }
    if (filters?.brandId) {
      filterConditions.itemModelBrandRelation = {
        ...filterConditions.itemModelBrandRelation,
        brandId: filters.brandId,
      };
    }
    if (filters?.modelId) {
      filterConditions.itemModelBrandRelation = {
        ...filterConditions.itemModelBrandRelation,
        modelId: filters.modelId,
      };
    }

    // Pagination logic
    const skip = page && perPage ? (page - 1) * perPage : undefined;
    const take = perPage || undefined;

    // Fetch filtered and optionally paginated products
    const [products, totalCount] = await Promise.all([
      this.prisma.product.findMany({
        where: filterConditions,
        skip,
        take,
        include: {
          itemModelBrandRelation: {
            include: {
              item: true,
              brand: true,
              model: true,
            },
          },
        },
      }),
      this.prisma.product.count({
        where: filterConditions,
      }),
    ]);

    // Map the products to the desired structure
    const mappedProducts = products.map((product) => ({
      id: product.id,
      itemModelBrandRelationId: product.itemModelBrandRelationId,
      quantity: product.quantity,
      warehouseId: product.warehouseId,
      createdAt: product.createdAt,
      price: product.itemModelBrandRelation.price,
      wholesalePrice: product.itemModelBrandRelation.wholesalePrice,
      itemName: product.itemModelBrandRelation.item.name,
      modelName: product.itemModelBrandRelation.model.name,
      brandName: product.itemModelBrandRelation.brand.name,
    }));

    // Determine if more pages are available
    const hasMore = totalCount > (page || 0) * (perPage || totalCount);

    return {
      products: mappedProducts,
      totalCount,
      hasMore,
      page,
    };
  }

  async addProductPending(data: TAddProductPending) {
    if (data.products.length) {
      for (const el of data.products) {
        const product = await this.prisma.product.findFirst({
          where: { id: el.id },
        });

        if (product) {
          await this.prisma.productEntry.create({
            data: {
              product: { connect: { id: el.id } },
              warehouse: { connect: { id: data.warehouseId } },
              quantity: el.quantity,
              purchasePrice: el.purchasePrice,
              status: 'pending',
            },
          });
        }
      }
    }
  }

  async acceptProductEntry(id: number, userId: number) {
    console.log(`Product entry ID: ${id}, Accepted by user ID: ${userId}`);

    if (!id || !userId) {
      throw new Error('Invalid entry ID or user ID');
    }

    const entryProduct = await this.prisma.productEntry.findUnique({
      where: { id },
      include: { product: true },
    });

    if (entryProduct && entryProduct.product) {
      const quantityToAdd = entryProduct.quantity ?? 0;

      // Update product quantity
      await this.prisma.product.update({
        where: { id: entryProduct.product.id },
        data: {
          quantity: {
            increment: quantityToAdd,
          },
        },
      });

      // Update product entry status, accepted by user, and accepted date
      await this.prisma.productEntry.update({
        where: { id },
        data: {
          status: 'done',
          acceptedById: userId,
          acceptedDate: new Date(),
        },
      });

      return {
        message: 'Product quantity updated and entry accepted successfully',
      };
    } else {
      throw new Error('Product entry not found or invalid');
    }
  }

  async getProductEntries(
    warehouseId: number,
    perPage?: number,
    page?: number,
    filters?: {
      itemId?: number;
      brandId?: number;
      modelId?: number;
      status?: 'pending' | 'done';
    },
  ) {
    // Check if the warehouse exists
    const warehouseExists = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouseExists) {
      throw new NotFoundException(
        `Warehouse with ID ${warehouseId} does not exist.`,
      );
    }

    // Build filter conditions
    const filterConditions: any = {
      warehouseId,
      status: filters?.status || 'done', // Default to 'done' if status is not provided
    };

    // Apply filters if provided
    if (filters?.itemId) {
      filterConditions.product = {
        itemModelBrandRelation: { itemId: filters.itemId },
      };
    }
    if (filters?.brandId) {
      filterConditions.product = {
        ...filterConditions.product,
        itemModelBrandRelation: {
          ...filterConditions.product?.itemModelBrandRelation,
          brandId: filters.brandId,
        },
      };
    }
    if (filters?.modelId) {
      filterConditions.product = {
        ...filterConditions.product,
        itemModelBrandRelation: {
          ...filterConditions.product?.itemModelBrandRelation,
          modelId: filters.modelId,
        },
      };
    }

    // Pagination logic
    const skip = page && perPage ? (page - 1) * perPage : undefined;
    const take = perPage || undefined;

    // Fetch the total count of filtered product entries
    const totalCount = await this.prisma.productEntry.count({
      where: filterConditions,
    });

    // Fetch filtered and optionally paginated product entries
    const productEntries = await this.prisma.productEntry.findMany({
      where: filterConditions,
      skip,
      take,
      include: {
        product: {
          include: {
            itemModelBrandRelation: {
              include: {
                item: true, // Include item details
                brand: true, // Include brand details
                model: true, // Include model details
              },
            },
          },
        },
      },
    });

    // Map the results to the desired format
    const mappedEntries = productEntries.map((entry) => ({
      id: entry.id,
      itemModelBrandRelationId: entry.product.itemModelBrandRelationId,
      quantity: entry.quantity,
      warehouseId: entry.warehouseId,
      createdAt: entry.entryDate, // Accessing entryDate for the creation time
      price: entry.product.itemModelBrandRelation.price, // Retail price
      wholesalePrice: entry.product.itemModelBrandRelation.wholesalePrice, // Wholesale price
      purchasePrice: entry.purchasePrice, // Purchase price from ProductEntry
      itemName: entry.product.itemModelBrandRelation.item.name, // Access the item's name
      modelName: entry.product.itemModelBrandRelation.model.name, // Access the model's name
      brandName: entry.product.itemModelBrandRelation.brand.name, // Access the brand's name
    }));

    // Determine if there are more entries
    const hasMore = totalCount > (page ? page * perPage : 0);

    // Return both the entries, total count, and hasMore
    return {
      totalCount,
      productEntries: mappedEntries,
      hasMore,
    };
  }

  async getProductSales(
    warehouseId: number,
    perPage?: number,
    page?: number,
    filters?: { itemId?: number; brandId?: number; modelId?: number },
  ) {
    // Check if the warehouse exists
    const warehouseExists = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouseExists) {
      throw new Error(`Склад с идентификатором ${warehouseId} не найден.`);
    }

    // Build the `where` condition with nested filters
    const whereCondition: any = {
      warehouseId,
      product: {
        itemModelBrandRelation: {},
      },
    };

    // Apply filters if provided
    if (filters?.itemId) {
      whereCondition.product.itemModelBrandRelation.itemId = filters.itemId;
    }
    if (filters?.brandId) {
      whereCondition.product.itemModelBrandRelation.brandId = filters.brandId;
    }
    if (filters?.modelId) {
      whereCondition.product.itemModelBrandRelation.modelId = filters.modelId;
    }

    // Pagination logic
    const skip = page && perPage ? (page - 1) * perPage : undefined;
    const take = perPage || undefined;

    // Fetch filtered and optionally paginated product sales
    const [productSales, totalCount] = await Promise.all([
      this.prisma.productSale.findMany({
        where: whereCondition,
        skip,
        take,
        include: {
          product: {
            include: {
              itemModelBrandRelation: {
                include: {
                  item: true,
                  brand: true,
                  model: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.productSale.count({
        where: whereCondition,
      }),
    ]);

    // Map the product sales to the desired structure
    const mappedProductSales = productSales.map((productSale) => ({
      id: productSale.id,
      productId: productSale.productId,
      saleDate: productSale.saleDate,
      quantity: productSale.quantity,
      totalAmount: productSale.totalAmount,
      itemName: productSale.product.itemModelBrandRelation.item.name,
      modelName: productSale.product.itemModelBrandRelation.model.name,
      brandName: productSale.product.itemModelBrandRelation.brand.name,
      price:
        productSale.type === 'wholesale'
          ? productSale.product.itemModelBrandRelation.wholesalePrice
          : productSale.product.itemModelBrandRelation.price,
      type: productSale.type,
    }));

    // Determine if more pages are available
    const hasMore = totalCount > (page || 0) * (perPage || totalCount);

    return {
      productSales: mappedProductSales,
      totalCount,
      hasMore,
      page,
    };
  }

  async calculateSales() {
    // Define date ranges
    const today = new Date();
    const yesterday = subDays(today, 1);

    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(thisWeekStart, 1);
    const lastWeekEnd = subWeeks(thisWeekEnd, 1);

    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = subMonths(thisMonthStart, 1);
    const lastMonthEnd = subMonths(thisMonthEnd, 1);

    // Query sales data
    const [
      todaySales,
      yesterdaySales,
      thisWeekSales,
      lastWeekSales,
      thisMonthSales,
      lastMonthSales,
    ] = await Promise.all([
      this.getTotalSales(startOfDay(today), endOfDay(today)),
      this.getTotalSales(startOfDay(yesterday), endOfDay(yesterday)),
      this.getTotalSales(thisWeekStart, thisWeekEnd),
      this.getTotalSales(lastWeekStart, lastWeekEnd),
      this.getTotalSales(thisMonthStart, thisMonthEnd),
      this.getTotalSales(lastMonthStart, lastMonthEnd),
    ]);

    // Calculate percentage changes
    const dailyChangePercentage = this.calculatePercentageChange(
      yesterdaySales,
      todaySales,
    );
    const weeklyChangePercentage = this.calculatePercentageChange(
      lastWeekSales,
      thisWeekSales,
    );
    const monthlyChangePercentage = this.calculatePercentageChange(
      lastMonthSales,
      thisMonthSales,
    );

    return {
      todaySales,
      dailyChangePercentage,
      dailyChange: todaySales - yesterdaySales,
      thisWeekSales,
      weeklyChangePercentage,
      weeklyChange: thisWeekSales - lastWeekSales,
      thisMonthSales,
      monthlyChangePercentage,
      monthlyChange: thisMonthSales - lastMonthSales,
    };
  }

  private async getTotalSales(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.productSale.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return result._sum.totalAmount || 0;
  }

  private calculatePercentageChange(previous: number, current: number): string {
    if (previous === 0 && current === 0) return '0%';
    if (previous === 0) return '100%'; // Infinite growth if there were no sales before
    const change = ((current - previous) / previous) * 100;
    return `${change.toFixed(2)}%`;
  }

  findAll() {
    return `This action returns all products`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }

  async searchItems(search: string) {
    console.log(search);
    if (!search.trim()) {
      return [];
    }
    const items = await this.prisma.item.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      // include: {
      //   itemModelBrandRelations: true,
      // },
    });

    return items;
  }

  async addItem(createItemDto: CreateItemDto) {
    const { name } = createItemDto;
    const existingItem = await this.prisma.item.findUnique({
      where: { name },
    });

    if (existingItem) {
      throw new BadRequestException(
        `Товар с названием ${name} уже существует.`,
      );
    }

    const newItem = await this.prisma.item.create({
      data: { name },
    });

    return newItem;
  }

  async searchBrands(search: string) {
    console.log(search);
    if (!search.trim()) {
      return [];
    }
    const items = await this.prisma.brand.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      // include: {
      //   itemModelBrandRelations: true,
      // },
    });

    return items;
  }

  async addBrand(createItemDto: CreateItemDto) {
    const { name } = createItemDto;
    const existingItem = await this.prisma.brand.findUnique({
      where: { name },
    });

    if (existingItem) {
      throw new BadRequestException(
        `Товар с названием ${name} уже существует.`,
      );
    }

    const newItem = await this.prisma.brand.create({
      data: { name },
    });

    return newItem;
  }

  async searchModel(search: string) {
    console.log(search);
    if (!search.trim()) {
      return [];
    }
    const items = await this.prisma.model.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      // include: {
      //   itemModelBrandRelations: true,
      // },
    });

    return items;
  }

  async addModel(createItemDto: CreateItemDto) {
    const { name } = createItemDto;
    const existingItem = await this.prisma.model.findUnique({
      where: { name },
    });

    if (existingItem) {
      throw new BadRequestException(
        `Товар с названием ${name} уже существует.`,
      );
    }

    const newItem = await this.prisma.model.create({
      data: { name },
    });

    return newItem;
  }
}
