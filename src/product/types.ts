export type TAddProductPendingProduct = {
    id: number;
    quantity: number;
    purchasePrice: number;
}
export type TAddProductPending = {
    products: TAddProductPendingProduct[],
    warehouseId: number
}