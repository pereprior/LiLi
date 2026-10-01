import { fileURLToPath } from 'node:url';

import SwaggerParser from '@apidevtools/swagger-parser';
import type { INestApplication } from '@nestjs/common';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export async function configureOpenApi(app: INestApplication): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  const source = fileURLToPath(
    new URL('../docs/openapi.yaml', import.meta.url),
  );
  const document = await SwaggerParser.bundle(source);
  await SwaggerParser.validate(document);
  SwaggerModule.setup('api', app, document as OpenAPIObject);
}
