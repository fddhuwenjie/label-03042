import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// 实体
import { User } from './entities/user.entity';
import { Class } from './entities/class.entity';
import { Teacher } from './entities/teacher.entity';
import { Subject } from './entities/subject.entity';
import { SubjectExcludeDate } from './entities/subject-exclude-date.entity';
import { Stage } from './entities/stage.entity';
import { Schedule } from './entities/schedule.entity';
import { ScheduleWeek } from './entities/schedule-week.entity';

// 控制器
import { AuthController } from './controllers/auth.controller';
import { ClassController } from './controllers/class.controller';
import { TeacherController } from './controllers/teacher.controller';
import { SubjectController } from './controllers/subject.controller';
import { StageController } from './controllers/stage.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { StatisticsController } from './controllers/statistics.controller';

// 服务
import { AuthService } from './services/auth.service';
import { ClassService } from './services/class.service';
import { TeacherService } from './services/teacher.service';
import { SubjectService } from './services/subject.service';
import { StageService } from './services/stage.service';
import { ScheduleService } from './services/schedule.service';
import { StatisticsService } from './services/statistics.service';
import { SchedulingEngine } from './services/scheduling-engine.service';
import { LoggerService } from './services/logger.service';

// JWT 策略
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // 数据库配置
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'admin123',
      database: process.env.DB_DATABASE || 'scheduling',
      entities: [User, Class, Teacher, Subject, SubjectExcludeDate, Stage, Schedule, ScheduleWeek],
      synchronize: process.env.NODE_ENV !== 'production', // 仅开发环境自动同步，生产环境应使用 migrations
      logging: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([User, Class, Teacher, Subject, SubjectExcludeDate, Stage, Schedule, ScheduleWeek]),
    // JWT 配置
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'scheduling-jwt-secret-key-2024',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AuthController,
    ClassController,
    TeacherController,
    SubjectController,
    StageController,
    ScheduleController,
    StatisticsController,
  ],
  providers: [
    AuthService,
    ClassService,
    TeacherService,
    SubjectService,
    StageService,
    ScheduleService,
    StatisticsService,
    SchedulingEngine,
    LoggerService,
    JwtStrategy,
  ],
})
export class AppModule {}
