import { Controller, Post, Param, Body } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller()
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @Post('public/v1/reservations')
  create(@Body() body: { siteId: string; unitId: string; unitTypeId: string; customerId: string; startDate: string; lockToken: string }) {
    return this.reservations.createReservation({ ...body, startDate: new Date(body.startDate) });
  }

  @Post('public/v1/reservations/:id/confirm')
  confirm(@Param('id') id: string, @Body() body: { customerId: string }) {
    return this.reservations.confirmReservation(id, body.customerId);
  }

  @Post('public/v1/reservations/:id/cancel')
  cancel(@Param('id') id: string, @Body() body: { actorId: string }) {
    return this.reservations.cancelReservation(id, body.actorId);
  }
}
