import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { Env } from '../config/env';
import { buildDataSourceOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildDataSourceOptions(config.get('DATABASE_URL', { infer: true })),
        autoLoadEntities: true,
        // Pending migrations are applied on start, so a fresh database is ready
        // (schema and default quiz) as soon as the API is up.
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
