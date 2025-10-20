"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserPlus, TrendingUp, TrendingDown, Loader2, Users as UsersIcon } from "lucide-react";
import type { Student } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

function calculateAverageAccuracy(accuracy: Record<string, number>): number {
  const values = Object.values(accuracy);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/students");
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && students.length === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-indigo-50 p-6 mb-4">
              <UsersIcon className="h-12 w-12 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No students yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Get started by adding your first student. You&apos;ll be able to track
              their progress, grade worksheets, and generate personalized lesson
              plans.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Student
            </Button>
          </div>
        </Card>
      )}

      {/* Students Grid */}
      {!isLoading && students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => {
            const avgAccuracy = calculateAverageAccuracy(student.accuracy);
            const isImproving = avgAccuracy >= 75;
            const hasPerformanceData = Object.keys(student.accuracy).length > 0;

            return (
              <Link
                key={student.student_id}
                href={`/students/${student.student_id}`}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{student.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {student.grade}
                        </p>
                      </div>
                      {hasPerformanceData && (
                        <>
                          {isImproving ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-yellow-600" />
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {hasPerformanceData ? (
                        <>
                          {/* Average Performance */}
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">
                                Overall Performance
                              </span>
                              <span className="font-semibold text-gray-900">
                                {avgAccuracy}%
                              </span>
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
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              Topic Performance
                            </p>
                            <div className="space-y-1">
                              {Object.entries(student.accuracy)
                                .slice(0, 3)
                                .map(([topic, score]) => (
                                  <div
                                    key={topic}
                                    className="flex justify-between text-xs"
                                  >
                                    <span className="text-gray-500 truncate">
                                      {topic}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {score}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-sm text-gray-500">
                            No performance data yet
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Upload a graded worksheet to start tracking
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Student Modal - TODO: Create separate component */}
      {showAddModal && (
        <AddStudentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}

// Temporary inline modal component - should be moved to separate file
function AddStudentModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert("Failed to create student");
      }
    } catch (error) {
      console.error("Error creating student:", error);
      alert("Failed to create student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Student">
      <div className="bg-white rounded-lg w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Alice Johnson"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade *
            </label>
            <input
              type="text"
              required
              value={formData.grade}
              onChange={(e) =>
                setFormData({ ...formData, grade: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Grade 10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="student@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="(123) 456-7890"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Student"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
