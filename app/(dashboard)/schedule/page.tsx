import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar as CalendarIcon, Clock, User, Plus } from "lucide-react";
import { formatTime } from "@/lib/utils";

// Mock data - will be replaced with real data from DynamoDB
const mockSessions = [
  {
    session_id: "1",
    student_name: "Alice Johnson",
    date: "2025-10-20",
    time: "14:00",
    duration: 60,
    topics: ["Quadratic Equations", "Word Problems"],
    status: "upcoming",
  },
  {
    session_id: "2",
    student_name: "Bob Smith",
    date: "2025-10-20",
    time: "16:00",
    duration: 60,
    topics: ["Trigonometry", "Geometry"],
    status: "upcoming",
  },
  {
    session_id: "3",
    student_name: "Charlie Brown",
    date: "2025-10-21",
    time: "15:00",
    duration: 60,
    topics: ["Linear Equations", "Graphing"],
    status: "upcoming",
  },
  {
    session_id: "4",
    student_name: "Alice Johnson",
    date: "2025-10-22",
    time: "14:00",
    duration: 60,
    topics: ["Functions", "Domain and Range"],
    status: "upcoming",
  },
  {
    session_id: "5",
    student_name: "Bob Smith",
    date: "2025-10-23",
    time: "16:00",
    duration: 60,
    topics: ["Calculus Basics", "Derivatives"],
    status: "upcoming",
  },
];

// Group sessions by date
const sessionsByDate = mockSessions.reduce((acc, session) => {
  if (!acc[session.date]) {
    acc[session.date] = [];
  }
  acc[session.date].push(session);
  return acc;
}, {} as Record<string, typeof mockSessions>);

const sortedDates = Object.keys(sessionsByDate).sort();

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">
            View and manage your teaching sessions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Session
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">2</div>
            <p className="text-xs text-gray-500 mt-1">sessions scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockSessions.length}</div>
            <p className="text-xs text-gray-500 mt-1">sessions total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Teaching Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {mockSessions.reduce((sum, s) => sum + s.duration, 0) / 60}h
            </div>
            <p className="text-xs text-gray-500 mt-1">scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions by Date */}
      <div className="space-y-6">
        {sortedDates.map((date) => {
          const sessions = sessionsByDate[date];
          const dateObj = new Date(date);

          return (
            <div key={date}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                {dateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>

              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card
                    key={session.session_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                              <Clock className="h-4 w-4 text-indigo-600" />
                              {formatTime(session.time)}
                            </div>
                            <span className="text-xs text-gray-400">•</span>
                            <div className="text-sm text-gray-600">{session.duration} minutes</div>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {session.student_name}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {session.topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
