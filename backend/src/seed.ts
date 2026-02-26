import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * 数据库种子脚本
 * 
 * 初始化系统所需的基础数据，包括：
 * - 默认管理员账号
 * - 课后服务阶段配置
 * - 示例学科数据
 * - 示例班级数据
 * - 示例教师数据
 * 
 * 运行方式：npm run seed
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 开始初始化数据...\n');

  // 1. 创建默认管理员账号
  console.log('📌 创建管理员账号...');
  const userRepo = dataSource.getRepository('User');
  const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await userRepo.save({
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'admin',
    });
    console.log('   ✅ 管理员账号创建成功 (admin/admin123)');
  } else {
    console.log('   ⏭️  管理员账号已存在，跳过');
  }

  // 2. 创建课后服务阶段
  console.log('\n📌 创建课后服务阶段...');
  const stageRepo = dataSource.getRepository('Stage');
  const stages = [
    { stageNumber: 1, name: '第一阶段', description: '作业辅导', classCount: 6, isActive: true },
    { stageNumber: 2, name: '第二阶段', description: '兴趣活动', classCount: 6, isActive: true },
    { stageNumber: 3, name: '第三阶段', description: '延时托管', classCount: 3, isActive: true },
  ];
  for (const stage of stages) {
    const existing = await stageRepo.findOne({ where: { stageNumber: stage.stageNumber } });
    if (!existing) {
      await stageRepo.save(stage);
      console.log(`   ✅ ${stage.name} 创建成功`);
    } else {
      console.log(`   ⏭️  ${stage.name} 已存在，跳过`);
    }
  }

  // 3. 创建学科
  console.log('\n📌 创建学科...');
  const subjectRepo = dataSource.getRepository('Subject');
  const subjects = [
    { name: '语文', isMain: true, isActive: true },
    { name: '数学', isMain: true, isActive: true },
    { name: '英语', isMain: true, isActive: true },
    { name: '体育', isMain: false, isActive: true },
    { name: '音乐', isMain: false, isActive: true },
    { name: '美术', isMain: false, isActive: true },
    { name: '科学', isMain: false, isActive: true },
  ];
  const subjectMap: Record<string, number> = {};
  for (const subject of subjects) {
    let existing = await subjectRepo.findOne({ where: { name: subject.name } });
    if (!existing) {
      existing = await subjectRepo.save(subject);
      console.log(`   ✅ ${subject.name} 创建成功`);
    } else {
      console.log(`   ⏭️  ${subject.name} 已存在，跳过`);
    }
    subjectMap[subject.name] = existing.id;
  }

  // 4. 创建班级
  console.log('\n📌 创建班级...');
  const classRepo = dataSource.getRepository('Class');
  const grades = ['一年级', '二年级', '三年级'];
  const classesPerGrade = 2;
  const createdClasses: any[] = [];
  for (const grade of grades) {
    for (let i = 1; i <= classesPerGrade; i++) {
      const className = `${grade}(${i})班`;
      let existing = await classRepo.findOne({ where: { name: className } });
      if (!existing) {
        existing = await classRepo.save({ name: className, grade, classNumber: i, isActive: true });
        console.log(`   ✅ ${className} 创建成功`);
      } else {
        console.log(`   ⏭️  ${className} 已存在，跳过`);
      }
      createdClasses.push(existing);
    }
  }

  // 5. 创建教师
  console.log('\n📌 创建教师...');
  const teacherRepo = dataSource.getRepository('Teacher');
  const teacherData = [
    { name: '张老师', subjectName: '语文', canStage3: true, isHeadTeacher: true, classIndex: 0 },
    { name: '李老师', subjectName: '数学', canStage3: true, isHeadTeacher: true, classIndex: 1 },
    { name: '王老师', subjectName: '英语', canStage3: false, isHeadTeacher: true, classIndex: 2 },
    { name: '赵老师', subjectName: '语文', canStage3: true, isHeadTeacher: true, classIndex: 3 },
    { name: '刘老师', subjectName: '数学', canStage3: false, isHeadTeacher: true, classIndex: 4 },
    { name: '陈老师', subjectName: '英语', canStage3: true, isHeadTeacher: true, classIndex: 5 },
    { name: '杨老师', subjectName: '体育', canStage3: false, isHeadTeacher: false },
    { name: '黄老师', subjectName: '音乐', canStage3: false, isHeadTeacher: false },
    { name: '周老师', subjectName: '美术', canStage3: false, isHeadTeacher: false },
    { name: '吴老师', subjectName: '科学', canStage3: true, isHeadTeacher: false },
  ];

  for (const t of teacherData) {
    const existing = await teacherRepo.findOne({ where: { name: t.name } });
    if (!existing) {
      const teacher = await teacherRepo.save({
        name: t.name,
        subjectId: subjectMap[t.subjectName],
        canStage3: t.canStage3,
        isActive: true,
      });

      // 设置班主任关系
      if (t.isHeadTeacher && t.classIndex !== undefined && createdClasses[t.classIndex]) {
        await classRepo.update(createdClasses[t.classIndex].id, { headTeacherId: teacher.id });
      }

      // 设置任教班级（主科教师任教对应班级）
      if (['语文', '数学', '英语'].includes(t.subjectName) && t.classIndex !== undefined) {
        await dataSource.query(
          `INSERT INTO teacher_classes ("teacherId", "classId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [teacher.id, createdClasses[t.classIndex].id]
        );
      }

      console.log(`   ✅ ${t.name} 创建成功 (${t.subjectName}${t.canStage3 ? ', 可参与第三阶段' : ''})`);
    } else {
      console.log(`   ⏭️  ${t.name} 已存在，跳过`);
    }
  }

  // 6. 创建学科排除日期示例
  console.log('\n📌 创建学科排除日期...');
  const excludeRepo = dataSource.getRepository('SubjectExcludeDate');
  const excludes = [
    { subjectId: subjectMap['体育'], dayOfWeek: 3 }, // 体育周三不排班
  ];
  for (const ex of excludes) {
    const existing = await excludeRepo.findOne({ 
      where: { subjectId: ex.subjectId, dayOfWeek: ex.dayOfWeek } 
    });
    if (!existing) {
      await excludeRepo.save(ex);
      console.log(`   ✅ 体育-周三排除 创建成功`);
    } else {
      console.log(`   ⏭️  体育-周三排除 已存在，跳过`);
    }
  }

  console.log('\n✨ 数据初始化完成！\n');
  console.log('📋 初始化数据摘要：');
  console.log('   - 管理员账号：admin / admin123');
  console.log('   - 课后服务阶段：3个（第一阶段6班、第二阶段6班、第三阶段3班）');
  console.log('   - 学科：7个（语文、数学、英语为主科）');
  console.log('   - 班级：6个（一至三年级各2个班）');
  console.log('   - 教师：10名（5名可参与第三阶段）');
  console.log('   - 学科排除：体育周三不排班\n');

  await app.close();
}

seed().catch(err => {
  console.error('❌ 初始化失败:', err);
  process.exit(1);
});
