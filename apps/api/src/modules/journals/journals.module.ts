import { Module } from "@nestjs/common";
import { PeriodsModule } from "../periods/periods.module";
import { JournalsController } from "./journals.controller";
import { JournalsService } from "./journals.service";
import { NumberingService } from "./numbering.service";
import { PostingService } from "./posting.service";

@Module({
  imports: [PeriodsModule],
  controllers: [JournalsController],
  providers: [JournalsService, PostingService, NumberingService],
  exports: [JournalsService, PostingService, NumberingService],
})
export class JournalsModule {}
