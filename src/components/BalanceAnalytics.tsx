import { Task, CATEGORIES, Category } from "@/types/task";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BalanceAnalyticsProps {
  tasks: Task[];
}

export function BalanceAnalytics({ tasks }: BalanceAnalyticsProps) {
  const categories = Object.keys(CATEGORIES) as Category[];
  
  const categoryStats = categories.map(category => {
    const categoryTasks = tasks.filter(t => t.category === category);
    const completed = categoryTasks.filter(t => t.completed).length;
    const total = categoryTasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      category,
      completed,
      total,
      percentage,
      info: CATEGORIES[category]
    };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getBalanceScore = () => {
    const variance = categoryStats.reduce((acc, stat) => {
      const avgPercentage = overallProgress;
      return acc + Math.pow(stat.percentage - avgPercentage, 2);
    }, 0) / categoryStats.length;
    
    const balanceScore = Math.max(0, 100 - Math.sqrt(variance));
    return Math.round(balanceScore);
  };

  const balanceScore = getBalanceScore();

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Overall Progress</CardTitle>
          <CardDescription>Your journey this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Tasks Completed</span>
              <span className="text-sm font-semibold">{completedTasks}/{totalTasks}</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Life Balance Score</span>
              <span className="text-sm font-semibold">{balanceScore}%</span>
            </div>
            <Progress value={balanceScore} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Progress across different areas of your life</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryStats.map(stat => (
            <div key={stat.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{stat.info.icon}</span>
                  <span className="font-medium text-sm">{stat.info.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stat.completed}/{stat.total}
                </span>
              </div>
              <Progress 
                value={stat.percentage} 
                className="h-2"
                style={{ 
                  // @ts-ignore
                  '--progress-background': stat.info.color 
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-accent/10 to-secondary/10 border-accent/20">
        <CardHeader>
          <CardTitle>Nurturing Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {balanceScore > 70 && (
            <p className="text-foreground">
              🌟 Beautiful balance! You're nurturing all areas of your life with intention and grace.
            </p>
          )}
          {balanceScore <= 70 && balanceScore > 40 && (
            <p className="text-foreground">
              🌱 You're making progress. Consider giving more attention to the quieter areas of your life.
            </p>
          )}
          {balanceScore <= 40 && (
            <p className="text-foreground">
              💝 It's okay to be unbalanced sometimes. Focus on what matters most right now, and be gentle with yourself.
            </p>
          )}
          
          {overallProgress > 70 && (
            <p className="text-foreground">
              ✨ Your dedication is showing! Remember to celebrate these victories.
            </p>
          )}
          
          {categoryStats.filter(s => s.percentage === 0 && s.total > 0).length > 0 && (
            <p className="text-foreground">
              🤍 Some areas haven't received attention yet. That's okay—growth happens in seasons.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
