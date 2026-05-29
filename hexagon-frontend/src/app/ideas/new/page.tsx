"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";

const CATEGORIES = [
  "Infrastructure",
  "Health",
  "Education",
  "Technology",
  "Economy",
  "Social",
  "Environment",
];

export default function NewIdeaPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    problem_statement: "",
    description: "",
    category: "Infrastructure",
    target_region: "",
    target_community: "",
    expected_impact: "",
    cost_benefit_summary: "",
    video_url: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    if (step === 1 && (!formData.title.trim() || !formData.category)) {
      setError("Title and category are required");
      return false;
    }
    if (
      step === 2 &&
      (!formData.problem_statement.trim() || !formData.description.trim())
    ) {
      setError("Problem statement and solution are required");
      return false;
    }
    setError("");
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(step + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await api.ideas.create(formData);
      const ideaSlug = (response.data as Record<string, unknown>).slug as string;
      if (!ideaSlug) {
        throw new Error("Idea creation returned no slug");
      }

      // Upload files (non-blocking — failures are logged but don't block submission)
      if (files.length > 0) {
        for (const file of files) {
          try {
            await api.ideas.uploadFile(ideaSlug, file);
          } catch (fileErr) {
            console.error("File upload failed for", file.name, fileErr);
            // Don't block the whole submission for a file upload failure
          }
        }
      }

      showToast("Idea submitted successfully!", "success");
      router.push(`/ideas/${ideaSlug}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const serverMsg = axiosErr?.response?.data?.detail;
      const clientMsg = axiosErr?.message;
      setError(
        serverMsg || clientMsg || "Failed to submit idea. Please try again."
      );
      setSubmitting(false);
    }
  };

  const stepLabels = [
    "Basic Info",
    "Problem & Solution",
    "Impact & Benefits",
    "Review & Submit",
  ];

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-hexagon-border bg-hexagon-card/30">
        <div className="container-custom py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            Submit New Idea
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Share your innovative development proposal in 4 easy steps
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      s === step
                        ? "bg-primary-600 text-white ring-4 ring-primary-600/20"
                        : s < step
                        ? "bg-green-600 text-white"
                        : "bg-hexagon-card border border-hexagon-border text-gray-500"
                    }`}
                  >
                    {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                        s < step ? "bg-green-600" : "bg-hexagon-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 px-1">
              {stepLabels.map((label) => (
                <span key={label} className="flex-1 text-center truncate">
                  {label}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-100 mb-6">
                  Basic Information
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Idea Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="input"
                    placeholder="E.g., Solar-Powered Water Purification for Rural Communities"
                    required
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.title.length}/500 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Target Region
                  </label>
                  <input
                    type="text"
                    name="target_region"
                    value={formData.target_region}
                    onChange={handleChange}
                    className="input"
                    placeholder="E.g., Sub-Saharan Africa, Southeast Asia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Target Community
                  </label>
                  <textarea
                    name="target_community"
                    value={formData.target_community}
                    onChange={handleChange}
                    className="input min-h-[100px] resize-none"
                    placeholder="Describe the specific communities or groups this idea aims to help"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Problem & Solution */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-100 mb-6">
                  Problem & Solution
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Problem Statement <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="problem_statement"
                    value={formData.problem_statement}
                    onChange={handleChange}
                    className="input min-h-[150px] resize-none"
                    placeholder="Clearly describe the problem this idea addresses..."
                    required
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    What challenge or issue does this idea solve?
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Proposed Solution <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="input min-h-[200px] resize-none"
                    placeholder="Describe your proposed solution in detail..."
                    required
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How does your idea solve the problem? Be as detailed as
                    possible.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Impact & Benefits */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-100 mb-6">
                  Impact & Benefits
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Expected Impact
                  </label>
                  <textarea
                    name="expected_impact"
                    value={formData.expected_impact}
                    onChange={handleChange}
                    className="input min-h-[150px] resize-none"
                    placeholder="What positive changes do you expect this idea to create?"
                    rows={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Cost-Benefit Summary
                  </label>
                  <textarea
                    name="cost_benefit_summary"
                    value={formData.cost_benefit_summary}
                    onChange={handleChange}
                    className="input min-h-[150px] resize-none"
                    placeholder="Estimated costs, resources needed, and expected benefits..."
                    rows={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Video URL{" "}
                    <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    name="video_url"
                    value={formData.video_url}
                    onChange={handleChange}
                    className="input"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link to a video presentation of your idea
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Files & Review */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-100 mb-6">
                  Review & Submit
                </h2>

                {/* Summary */}
                <div className="bg-hexagon-darker rounded-lg p-4 border border-hexagon-border space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300">
                    Idea Summary
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Title:</span>{" "}
                      <span className="text-gray-200">{formData.title}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>{" "}
                      <span className="text-gray-200">{formData.category}</span>
                    </div>
                    {formData.target_region && (
                      <div>
                        <span className="text-gray-500">Region:</span>{" "}
                        <span className="text-gray-200">
                          {formData.target_region}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Problem:</span>
                    <p className="text-sm text-gray-300 mt-1 line-clamp-3">
                      {formData.problem_statement}
                    </p>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Attach Files{" "}
                    <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <div className="border-2 border-dashed border-hexagon-border rounded-lg p-8 text-center hover:border-primary-500/50 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                      <p className="text-gray-400 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOCX, XLSX, PPTX (max 50MB each)
                      </p>
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-hexagon-border rounded-lg bg-hexagon-darker"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-200">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-hexagon-border">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn btn-ghost"
                  disabled={submitting}
                >
                  ← Previous
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/ideas")}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>

                {step < 4 ? (
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="spinner h-4 w-4 mr-2" />
                    ) : null}
                    {submitting ? "Submitting..." : "Submit Idea"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
