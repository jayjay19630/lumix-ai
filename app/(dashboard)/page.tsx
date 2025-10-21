import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, BookOpen, Calendar, TrendingUp } from "lucide-react";

// This will eventually come from the database
const stats = {
  total_students: 3,
  total_questions: 50,
  upcoming_sessions: 5,
  avg_student_performance: 78,
};

const recentActivity = [
  { id: 1, action: "Added new student: Alice Johnson", time: "2 hours ago" },
  { id: 2, action: "Generated lesson plan for Bob Smith", time: "5 hours ago" },
  {
    id: 3,
    action: "Uploaded 15 new questions from past paper",
    time: "1 day ago",
  },
  { id: 4, action: "Graded worksheet for Charlie Brown", time: "2 days ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of your teaching activities and student progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total_students}
            </div>
            <p className="text-xs text-gray-500 mt-1">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Question Bank
            </CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total_questions}
            </div>
            <p className="text-xs text-gray-500 mt-1">Questions available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Upcoming Sessions
            </CardTitle>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.upcoming_sessions}
            </div>
            <p className="text-xs text-gray-500 mt-1">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Performance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avg_student_performance}%
            </div>
            <p className="text-xs text-green-600 mt-1">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Add New Student</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Create a new student profile and set up their schedule
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Upload Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Process past papers and add questions to your bank
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Generate Lesson Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              AI-powered lesson planning tailored to student needs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
