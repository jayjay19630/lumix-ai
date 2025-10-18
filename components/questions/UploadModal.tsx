"use client";

import { useState, useRef } from "react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (questionCount: number) => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

export function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
    }
  };

  const handleUpload = async () => {
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
      setQuestionCount(processData.data.questionCount || 0);
      setMessage(
        `Successfully processed ${processData.data.questionCount} questions!`
      );

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(processData.data.questionCount || 0);
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

  const handleClose = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setQuestionCount(0);
    onClose();
  };

  const isProcessing = status === "uploading" || status === "processing";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : handleClose}
      title="Upload Question Paper"
      description="Upload a PDF or image file to extract questions automatically"
      size="md"
      showCloseButton={!isProcessing}
    >
      <div className="space-y-4">
        {/* File Upload Area */}
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            file
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50",
            isProcessing && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
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
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">
                Click to upload or drag and drop
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

        {/* Status Messages */}
        {status === "success" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{message}</p>
          </div>
        )}

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
              Upload & Process
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
