import { z } from 'zod';
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type Pagination = z.infer<typeof PaginationSchema>;
export interface PagedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
//# sourceMappingURL=pagination.schema.d.ts.map