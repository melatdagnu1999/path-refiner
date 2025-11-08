export type Category = 
  | 'class' 
  | 'work' 
  | 'career' 
  | 'fun' 
  | 'church' 
  | 'self-care' 
  | 'skill' 
  | 'relationship';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  subTasks: SubTask[];
  dueDate: Date;
  notes?: string;
}

export interface WeeklyPlan {
  weekStart: Date;
  weekEnd: Date;
  tasks: Task[];
}

export const CATEGORIES: Record<Category, { label: string; icon: string; color: string }> = {
  'class': { label: 'Class', icon: '📚', color: 'hsl(210 70% 60%)' },
  'work': { label: 'Work', icon: '💼', color: 'hsl(260 60% 55%)' },
  'career': { label: 'Career', icon: '🚀', color: 'hsl(280 50% 60%)' },
  'fun': { label: 'Fun', icon: '🎉', color: 'hsl(340 70% 65%)' },
  'church': { label: 'Church', icon: '⛪', color: 'hsl(200 50% 55%)' },
  'self-care': { label: 'Self-care', icon: '🌿', color: 'hsl(150 50% 55%)' },
  'skill': { label: 'Skill', icon: '🛠️', color: 'hsl(30 70% 60%)' },
  'relationship': { label: 'Relationship', icon: '💝', color: 'hsl(15 80% 70%)' }
};
