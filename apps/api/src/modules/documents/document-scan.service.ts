import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentScanService {
  // Seam for future ClamAV integration
  async scan(buffer: Buffer): Promise<'clean' | 'infected'> {
    return 'clean';
  }
}
