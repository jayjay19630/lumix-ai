"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UploadModal } from "@/components/questions/UploadModal";
import { GradingResultModal } from "@/components/students/GradingResultModal";
import {
  ArrowLeft,
  Upload,
  FileCheck,
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import type { Student, Session } from "@/lib/types";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/students/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data.student);
        setSessions(data.sessions || []);
      } else if (response.status === 404) {
        router.push("/students");
      }
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAverageAccuracy = (accuracy: Record<string, number>) => {
    const values = Object.values(accuracy);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const handleUploadComplete = () => {
    // Refresh student data after successful upload
    fetchStudentData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  const avgAccuracy = calculateAverageAccuracy(student.accuracy);
  const hasPerformanceData = Object.keys(student.accuracy).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-500 mt-1">{student.grade}</p>
          </div>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Graded Worksheet
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPerformanceData ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {avgAccuracy}%
                  </span>
                  {avgAccuracy >= 75 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${avgAccuracy}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Total Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {sessions.length}
              </span>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* Last Session */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Last Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.last_session ? (
              <p className="text-lg font-semibold text-gray-900">
                {new Date(student.last_session).toLocaleDateString()}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No sessions yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topic Performance */}
      {hasPerformanceData && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(student.accuracy)
                .sort(([, a], [, b]) => b - a)
                .map(([topic, score]) => (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {topic}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          score >= 80
                            ? "bg-green-600"
                            : score >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No sessions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload a graded worksheet to create the first session
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((session) => (
                  <div
                    key={session.session_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-gray-900">
                            {new Date(session.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          {session.score && (
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded">
                              {session.score}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {session.topics_covered.map((topic) => (
                            <span
                              key={topic}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                        {session.agent_insights && (
                          <p className="text-sm text-gray-600 mt-2">
                            {session.agent_insights}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {session.grading_result && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSession(session)}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            View Results
                          </Button>
                        )}
                        {session.graded_worksheet_url && (
                          <a
                            href={session.graded_worksheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium px-3 py-1.5"
                          >
                            Worksheet
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        mode="grading"
        studentId={resolvedParams.id}
        studentName={student.name}
        onUploadComplete={handleUploadComplete}
      />

      {/* Grading Result Modal */}
      {selectedSession?.grading_result && (
        <GradingResultModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          gradingResult={selectedSession.grading_result}
          studentName={student.name}
          date={selectedSession.date}
        />
      )}
    </div>
  );
}
