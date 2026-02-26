// API Mock 数据
export const mockClasses = [
  { id: 1, name: '一年级1班', grade: '一年级', classNumber: 1, headTeacherId: 1 },
  { id: 2, name: '一年级2班', grade: '一年级', classNumber: 2, headTeacherId: 2 },
];

export const mockTeachers = [
  { id: 1, name: '张老师', canStage3: true, subject: { id: 1, name: '语文', isMain: true }, teachingClasses: [{ id: 1, name: '一年级1班' }] },
  { id: 2, name: '李老师', canStage3: false, subject: { id: 2, name: '数学', isMain: true }, teachingClasses: [{ id: 2, name: '一年级2班' }] },
];

export const mockSubjects = [
  { id: 1, name: '语文', isMain: true },
  { id: 2, name: '数学', isMain: true },
  { id: 3, name: '体育', isMain: false },
];

export const mockWeeks = [
  { id: 1, year: 2024, weekNumber: 1, startDate: '2024-01-01', endDate: '2024-01-05', status: 'confirmed' },
  { id: 2, year: 2024, weekNumber: 2, startDate: '2024-01-08', endDate: '2024-01-12', status: 'draft' },
];

export const mockBalance = {
  statistics: [
    { teacherName: '张老师', stage2Count: 5 },
    { teacherName: '李老师', stage2Count: 4 },
  ],
  balance: { avgCount: 4.5, maxCount: 5, minCount: 4, variance: 0.5 },
  suggestions: ['排班均衡性良好'],
};

// Mock API 函数
export const authApi = {
  login: jest.fn().mockResolvedValue({ access_token: 'mock-token' }),
  getProfile: jest.fn().mockResolvedValue({ username: 'admin' }),
};

export const classApi = {
  getAll: jest.fn().mockResolvedValue(mockClasses),
  getOne: jest.fn().mockResolvedValue(mockClasses[0]),
  create: jest.fn().mockResolvedValue({ id: 3 }),
  batchCreate: jest.fn().mockResolvedValue({ count: 6 }),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  setHeadTeacher: jest.fn().mockResolvedValue({}),
};

export const teacherApi = {
  getAll: jest.fn().mockResolvedValue(mockTeachers),
  getOne: jest.fn().mockResolvedValue(mockTeachers[0]),
  create: jest.fn().mockResolvedValue({ id: 3 }),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  getStage3Teachers: jest.fn().mockResolvedValue(mockTeachers.filter(t => t.canStage3)),
  setStage3Teachers: jest.fn().mockResolvedValue({}),
};

export const subjectApi = {
  getAll: jest.fn().mockResolvedValue(mockSubjects),
  getOne: jest.fn().mockResolvedValue(mockSubjects[0]),
  create: jest.fn().mockResolvedValue({ id: 4 }),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  getExcludeDates: jest.fn().mockResolvedValue([]),
  setExcludeDate: jest.fn().mockResolvedValue({}),
  removeExcludeDate: jest.fn().mockResolvedValue({}),
  batchSetExcludeDates: jest.fn().mockResolvedValue({}),
};

export const stageApi = {
  getAll: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  updateClassCounts: jest.fn().mockResolvedValue({}),
};

export const scheduleApi = {
  getAllWeeks: jest.fn().mockResolvedValue(mockWeeks),
  getCurrentWeekInfo: jest.fn().mockResolvedValue({}),
  getByWeek: jest.fn().mockResolvedValue([]),
  createWeek: jest.fn().mockResolvedValue({ id: 3 }),
  generateSchedule: jest.fn().mockResolvedValue({}),
  updateSchedule: jest.fn().mockResolvedValue({}),
  confirmWeek: jest.fn().mockResolvedValue({}),
  deleteWeek: jest.fn().mockResolvedValue({}),
};

export const statisticsApi = {
  getWeeklyStatistics: jest.fn().mockResolvedValue({}),
  getStage2Balance: jest.fn().mockResolvedValue(mockBalance),
  getHistory: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  exportExcel: jest.fn().mockResolvedValue(new Blob()),
  exportData: jest.fn().mockResolvedValue(new Blob()),
  getMultiDimensionStats: jest.fn().mockResolvedValue({
    bySubject: [],
    byDayOfWeek: [],
    byStage: [],
    workloadDistribution: [],
    byScheduleType: [],
  }),
  getWorkloadTrend: jest.fn().mockResolvedValue({
    teacher: { id: 1, name: '张老师', subjectName: '语文' },
    summary: { avgCount: '4.5', maxCount: 5, minCount: 4, trend: 'stable', trendLabel: '稳定' },
    data: [],
  }),
};

export default {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};
