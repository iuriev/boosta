import type { ApiErrorBody, ApiErrorCode } from '@boosta/contracts';
import { HttpException, HttpStatus } from '@nestjs/common';

const STATUS_NAMES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
};

/**
 * An error the client can branch on. Produces Nest's standard error body with
 * an added stable `code`.
 */
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ApiErrorCode, message: string | string[]) {
    const body: ApiErrorBody = {
      statusCode: status,
      error: STATUS_NAMES[status] ?? 'Error',
      message,
      code,
    };
    super(body, status);
  }
}
