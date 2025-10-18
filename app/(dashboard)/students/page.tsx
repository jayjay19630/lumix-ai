import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserPlus, TrendingUp, TrendingDown } from "lucide-react";

// Mock data - will be replaced with real data from DynamoDB
const mockStudents = [
  {
    student_id: "1",
    name: "Alice Johnson",
    grade: "Grade 10",
    accuracy: {
      "Quadratic Equations": 85,
      "Trigonometry": 72,
      "Linear Equations": 90,
    },
    next_session: "2025-10-20T14:00:00",
  },
  {
    student_id: "2",
    name: "Bob Smith",
    grade: "Grade 11",
    accuracy: {
      "Geometry": 78,
      "Functions": 82,
      "Trigonometry": 68,
    },
    next_session: "2025-10-21T16:00:00",
  },
  {
    student_id: "3",
    name: "Charlie Brown",
    grade: "Grade 9",
    accuracy: {
      "Linear Equations": 88,
      "Geometry": 75,
      "Quadratic Equations": 70,
    },
    next_session: "2025-10-22T15:00:00",
  },
];

function calculateAverageAccuracy(accuracy: Record<string, number>): number {
  const values = Object.values(accuracy);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">
            Manage your students and track their progress
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStudents.map((student) => {
          const avgAccuracy = calculateAverageAccuracy(student.accuracy);
          const isImproving = avgAccuracy >= 75;

          return (
            <Card key={student.student_id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{student.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{student.grade}</p>
                  </div>
                  {isImproving ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Average Performance */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Overall Performance</span>
                      <span className="font-semibold text-gray-900">{avgAccuracy}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${avgAccuracy}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Topics */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Topic Performance</p>
                    <div className="space-y-1">
                      {Object.entries(student.accuracy).slice(0, 3).map(([topic, score]) => (
                        <div key={topic} className="flex justify-between text-xs">
                          <span className="text-gray-500 truncate">{topic}</span>
                          <span className="font-medium text-gray-900">{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Session */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Next session:{" "}
                      <span className="text-gray-900 font-medium">
                        {new Date(student.next_session).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
