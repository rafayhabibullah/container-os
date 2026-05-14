import { Module } from '@nestjs/common';
import { MollieAdapter } from './mollie.adapter';

@Module({
  providers: [MollieAdapter],
  exports: [MollieAdapter],
})
export class MollieModule {}
