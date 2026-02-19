import { Task } from "@/types/task";
import { startOfWeek, addDays } from "date-fns";

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

export const mockTasks: Task[] = [
  // === YEARLY GOALS ===
  {
    id: 'y1', title: 'Graduate with honors', category: 'class', priority: 'high',
    completed: false, scope: 'year', dueDate: new Date(new Date().getFullYear(), 11, 31), subTasks: []
  },
  {
    id: 'y2', title: 'Get a tech internship', category: 'career', priority: 'high',
    completed: false, scope: 'year', dueDate: new Date(new Date().getFullYear(), 11, 31), subTasks: []
  },
  {
    id: 'y3', title: 'Read 24 books', category: 'skill', priority: 'medium',
    completed: false, scope: 'year', dueDate: new Date(new Date().getFullYear(), 11, 31), subTasks: []
  },
  {
    id: 'y4', title: 'Consistent church attendance', category: 'church', priority: 'high',
    completed: false, scope: 'year', dueDate: new Date(new Date().getFullYear(), 11, 31), subTasks: []
  },
  {
    id: 'y5', title: 'Build 3 side projects', category: 'skill', priority: 'medium',
    completed: false, scope: 'year', dueDate: new Date(new Date().getFullYear(), 11, 31), subTasks: []
  },

  // === MONTHLY TASKS ===
  {
    id: 'm1', title: 'Complete Data Structures module', category: 'class', priority: 'high',
    completed: false, scope: 'month', dueDate: new Date(), subTasks: []
  },
  {
    id: 'm2', title: 'Apply to 5 internships', category: 'career', priority: 'high',
    completed: false, scope: 'month', dueDate: new Date(), subTasks: []
  },
  {
    id: 'm3', title: 'Read 2 books', category: 'skill', priority: 'medium',
    completed: false, scope: 'month', dueDate: new Date(), subTasks: []
  },
  {
    id: 'm4', title: 'Monthly self-care retreat', category: 'self-care', priority: 'medium',
    completed: false, scope: 'month', dueDate: new Date(), subTasks: []
  },

  // === WEEKLY TASKS ===
  {
    id: '1', title: 'Complete assignment for Data Structures', category: 'class', priority: 'high',
    completed: false, scope: 'week', dueDate: weekStart,
    subTasks: [
      { id: 's1', title: 'Review lecture notes', completed: true },
      { id: 's2', title: 'Code solution', completed: false },
      { id: 's3', title: 'Write documentation', completed: false }
    ]
  },
  {
    id: '2', title: 'Morning prayer and meditation', category: 'church', priority: 'high',
    completed: true, scope: 'week', dueDate: weekStart, subTasks: []
  },
  {
    id: '3', title: 'Team meeting at 2pm', category: 'work', priority: 'medium',
    completed: true, scope: 'week', dueDate: weekStart,
    subTasks: [
      { id: 's4', title: 'Prepare presentation', completed: true },
      { id: 's5', title: 'Send follow-up email', completed: true }
    ]
  },
  {
    id: '4', title: 'Yoga session', category: 'self-care', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 1), subTasks: []
  },
  {
    id: '5', title: 'Update resume and LinkedIn', category: 'career', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 1),
    subTasks: [
      { id: 's6', title: 'Add recent projects', completed: false },
      { id: 's7', title: 'Update skills section', completed: false },
      { id: 's8', title: 'Request recommendations', completed: false }
    ]
  },
  {
    id: '6', title: 'Call Mom', category: 'relationship', priority: 'high',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 1), subTasks: []
  },
  {
    id: '7', title: 'Practice React hooks', category: 'skill', priority: 'high',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 2),
    subTasks: [
      { id: 's9', title: 'Build useState example', completed: false },
      { id: 's10', title: 'Build useEffect example', completed: false },
      { id: 's11', title: 'Build custom hook', completed: false }
    ]
  },
  {
    id: '8', title: 'Bible study group', category: 'church', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 2), subTasks: []
  },
  {
    id: '9', title: 'Client presentation', category: 'work', priority: 'high',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 2),
    subTasks: [
      { id: 's12', title: 'Finalize slides', completed: false },
      { id: 's13', title: 'Practice delivery', completed: false }
    ]
  },
  {
    id: '10', title: 'Game night with friends', category: 'fun', priority: 'low',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 3), subTasks: []
  },
  {
    id: '11', title: 'Submit project proposal', category: 'class', priority: 'high',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 3),
    subTasks: [
      { id: 's14', title: 'Research background', completed: true },
      { id: 's15', title: 'Write methodology', completed: false },
      { id: 's16', title: 'Create timeline', completed: false }
    ]
  },
  {
    id: '12', title: 'Evening walk in nature', category: 'self-care', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 4), subTasks: []
  },
  {
    id: '13', title: 'Job application deadline', category: 'career', priority: 'high',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 4),
    subTasks: [
      { id: 's17', title: 'Tailor cover letter', completed: false },
      { id: 's18', title: 'Review application', completed: false },
      { id: 's19', title: 'Submit application', completed: false }
    ]
  },
  {
    id: '14', title: 'Church volunteer work', category: 'church', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 5), subTasks: []
  },
  {
    id: '15', title: 'Movie night', category: 'fun', priority: 'low',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 5), subTasks: []
  },
  {
    id: '16', title: 'Date night planning', category: 'relationship', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 5), subTasks: []
  },
  {
    id: '17', title: 'Sunday service', category: 'church', priority: 'high',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 6), subTasks: []
  },
  {
    id: '18', title: 'Learn Python basics', category: 'skill', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 6),
    subTasks: [
      { id: 's20', title: 'Complete tutorial chapter 1', completed: false },
      { id: 's21', title: 'Build simple program', completed: false }
    ]
  },
  {
    id: '19', title: 'Journaling and reflection', category: 'self-care', priority: 'medium',
    completed: false, scope: 'week', dueDate: addDays(weekStart, 6), subTasks: []
  },

  // === DAILY TASKS (today) ===
  {
    id: 'd1', title: 'Morning devotional', category: 'church', priority: 'high',
    completed: false, scope: 'day', dueDate: new Date(),
    subTasks: [
      { id: 'ds1', title: 'Read Psalm 23', completed: false },
      { id: 'ds2', title: 'Journal reflection', completed: false }
    ]
  },
  {
    id: 'd2', title: 'Study for midterm', category: 'class', priority: 'high',
    completed: false, scope: 'day', dueDate: new Date(),
    subTasks: [
      { id: 'ds3', title: 'Review chapters 1-3', completed: false },
      { id: 'ds4', title: 'Practice problems', completed: false }
    ]
  },
  {
    id: 'd3', title: 'Gym workout', category: 'self-care', priority: 'medium',
    completed: false, scope: 'day', dueDate: new Date(), subTasks: []
  },
  {
    id: 'd4', title: 'Reply to recruiter email', category: 'career', priority: 'high',
    completed: false, scope: 'day', dueDate: new Date(), subTasks: []
  },
];
