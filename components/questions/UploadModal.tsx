"use client";

import { useState, useRef } from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadMode = "questions" | "grading";

interface QuestionUploadResult {
  questionCount: number;
  questions?: unknown[];
}

interface GradingUploadResult {
  total_questions: number;
  correct_answers: number;
  score: string;
  weaknesses: string[];
  insights: string;
}

type UploadResult = QuestionUploadResult | GradingUploadResult | null;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: UploadMode;
  title?: string;
  description?: string;
  studentId?: string;
  studentName?: string;
  onUploadComplete?: (data: unknown) => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

export function UploadModal({
  isOpen,
  onClose,
  mode = "questions",
  title,
  description,
  studentId,
  studentName,
  onUploadComplete,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadResult>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setMessage("Please upload a PDF or image file (JPG, PNG)");
      setStatus("error");
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setMessage("File size must be less than 10MB");
      setStatus("error");
      return;
    }

    setFile(selectedFile);
    setStatus("idle");
    setMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFileChange(selectedFile || null);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleUploadQuestions = async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(10);
    setMessage("Uploading file to S3...");

    try {
      // Step 1: Upload file to S3
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/questions/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const uploadData = await uploadResponse.json();
      setProgress(30);
      setMessage("Processing document with OCR...");
      setStatus("processing");

      // Step 2: Process with Textract OCR
      const processResponse = await fetch("/api/questions/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: uploadData.data.fileUrl,
          fileName: file.name,
        }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to process document");
      }

      const processData = await processResponse.json();
      setProgress(100);
      setStatus("success");
      setResult(processData.data);
      setMessage(
        `Successfully processed ${processData.data.questionCount} questions!`
      );

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(processData.data);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to upload and process file"
      );
    }
  };

  const handleUploadGradedWorksheet = async () => {
    if (!file || !studentId) return;

    setStatus("uploading");
    setProgress(10);
    setMessage("Uploading worksheet...");

    try {
      const formData = new FormData();
      formData.append("worksheet", file);

      const response = await fetch(`/api/students/${studentId}/grade`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to grade worksheet");
      }

      setProgress(50);
      setMessage("Processing with OCR...");
      setStatus("processing");

      const data = await response.json();
      setProgress(100);
      setStatus("success");
      setResult(data.grading_result);
      setMessage(`Graded successfully: ${data.grading_result.score}`);

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(data);
      }

      // Auto-close after 3 seconds to show results
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to upload worksheet"
      );
    }
  };

  const handleUpload = async () => {
    if (mode === "grading") {
      await handleUploadGradedWorksheet();
    } else {
      await handleUploadQuestions();
    }
  };

  const handleClose = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setResult(null);
    setIsDragging(false);
    onClose();
  };

  const isProcessing = status === "uploading" || status === "processing";

  // Type guard for grading result
  const isGradingResult = (res: UploadResult): res is GradingUploadResult => {
    return res !== null && 'total_questions' in res;
  };

  const defaultTitle = mode === "grading"
    ? `Upload Graded Worksheet${studentName ? ` for ${studentName}` : ""}`
    : "Upload Question Paper";

  const defaultDescription = mode === "grading"
    ? "Upload a PDF or image of the graded worksheet to automatically analyze performance"
    : "Upload a PDF or image file to extract questions automatically";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : handleClose}
      title={title || defaultTitle}
      description={description || defaultDescription}
      size="md"
      showCloseButton={!isProcessing}
    >
      <div className="space-y-4">
        {/* File Upload Area with Drag & Drop */}
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
            file
              ? "border-indigo-500 bg-indigo-50"
              : isDragging
              ? "border-indigo-500 bg-indigo-50 scale-105"
              : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50",
            isProcessing && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleInputChange}
            className="hidden"
            disabled={isProcessing}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-indigo-600" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2"
                >
                  Remove
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">
                {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-gray-500">PDF, JPG, or PNG (max 10MB)</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">{message}</p>
          </div>
        )}

        {/* Success Message with Results */}
        {status === "success" && result && mode === "grading" && isGradingResult(result) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">{message}</p>
                <p className="text-xs text-green-700 mt-1">
                  {result.correct_answers} / {result.total_questions} correct
                </p>
              </div>
            </div>

            {result.weaknesses && result.weaknesses.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-yellow-900 mb-1">
                  Areas for Improvement:
                </p>
                <ul className="list-disc list-inside text-xs text-yellow-800">
                  {result.weaknesses.slice(0, 3).map((weakness: string, idx: number) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Success Message for Questions */}
        {status === "success" && mode === "questions" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{message}</p>
          </div>
        )}

        {/* Error Message */}
        {status === "error" && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{message}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!file || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {mode === "grading" ? "Upload & Grade" : "Upload & Process"}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
