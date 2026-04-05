import { Module} from '@nestjs/common';
import { LocationConsumer } from './location.consumer';
import { KafkaModule } from '@app/kafka';
import { RedisModule} from '@app/redis';
import { LocationTrackingService } from './location-tracking.service';

@Module({
    imports: [
        KafkaModule,
        RedisModule,
       
    ],
    providers:[
        LocationConsumer,
         LocationTrackingService,
    ],
    exports:[
        LocationTrackingService
    ]
})
export class LocationModule {}