import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponse } from '../shared/types/error.types';
import { PaginationParams } from '../shared/types/api.types';

interface ApiPaginatedResponseOptions<T extends Type<any>> {
  type: T;
  description?: string;
}

export const ApiPaginatedResponse = <T extends Type<any>>(
  options: ApiPaginatedResponseOptions<T>,
) => {
  return applyDecorators(
    ApiResponse({
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(options.type) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 10 },
                  total: { type: 'number', example: 100 },
                  totalPages: { type: 'number', example: 10 },
                  hasNextPage: { type: 'boolean', example: true },
                  hasPreviousPage: { type: 'boolean', example: false },
                },
              },
            },
          },
        ],
      },
      description: options.description || 'Successful paginated response',
    }),
  );
};

export const ApiErrorResponses = () => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 409,
      description: 'Conflict',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 422,
      description: 'Unprocessable Entity',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      type: ErrorResponse,
    }),
  );
};

export const ApiPaginationQueries = () => {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (1-based)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of items per page',
      example: 10,
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      description: 'Field to sort by',
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      type: String,
      enum: ['ASC', 'DESC'],
      description: 'Sort order',
    }),
  );
};

export const ApiAuthHeaders = () => {
  return applyDecorators(
    ApiResponse({
      headers: {
        Authorization: {
          description: 'Bearer token',
          schema: {
            type: 'string',
            example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
    }),
  );
};

export const ApiFile = (fieldName: string = 'file') => {
  return applyDecorators(
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
};
