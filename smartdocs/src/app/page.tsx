"use client";

import { useState, useRef } from "react";

// Mock invoice data
const mockInvoices = {
  processing: [
    { id: 1, filename: "INV-2024-001.pdf", uploadedAt: "2 mins ago", size: "245 KB" },
    { id: 2, filename: "Receipt-Amazon-Dec.pdf", uploadedAt: "5 mins ago", size: "182 KB" },
    { id: 3, filename: "Utility-Bill-Jan2024.pdf", uploadedAt: "8 mins ago", size: "321 KB" },
  ],
  complete: [
    { id: 4, filename: "INV-2024-002.pdf", processedAt: "1 hour ago", amount: "$1,245.99", vendor: "Acme Corp" },
    { id: 5, filename: "Office-Supplies-Dec.pdf", processedAt: "2 hours ago", amount: "$89.50", vendor: "OfficeMax" },
    { id: 6, filename: "Software-License-Q4.pdf", processedAt: "3 hours ago", amount: "$599.00", vendor: "Adobe Inc" },
    { id: 7, filename: "Marketing-Services.pdf", processedAt: "1 day ago", amount: "$2,300.00", vendor: "Digital Agency" },
  ],
  failed: [
    { id: 8, filename: "Corrupted-File.pdf", failedAt: "30 mins ago", error: "File corrupted" },
    { id: 9, filename: "Low-Quality-Scan.pdf", failedAt: "1 hour ago", error: "Poor image quality" },
  ]
};

export default function InvoiceProcessingApp() {
  const [activeTab, setActiveTab] = useState("processing");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ProcessingIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

  const CompleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  

  const FailedIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const UploadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  const FileIcon = () => (
    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileUpload = (files: File[]) => {
    // Here you would typically upload the files to your server
    console.log("Uploading files:", files);
    // For demo purposes, just log the files
    files.forEach(file => {
      console.log(`File: ${file.name}, Size: ${file.size} bytes`);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Invoice Processing</h2>
            <nav className="space-y-2">
              {[
                { key: "upload", label: "Upload", icon: UploadIcon },
                { key: "processing", label: "Processing", icon: ProcessingIcon, count: mockInvoices.processing.length },
                { key: "complete", label: "Complete", icon: CompleteIcon, count: mockInvoices.complete.length },
                { key: "failed", label: "Failed", icon: FailedIcon, count: mockInvoices.failed.length },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    {tab.count !== undefined && (
                      <span className="bg-gray-200 text-gray-600 py-1 px-2 rounded-full text-xs font-medium">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {activeTab === "upload" ? "Upload Invoices" : 
                 activeTab === "processing" ? "Processing Invoices" :
                 activeTab === "complete" ? "Completed Invoices" : "Failed Invoices"}
              </h1>
              <p className="text-gray-600">
                {activeTab === "upload" ? "Drag and drop or select files to upload" :
                 activeTab === "processing" ? "Invoices currently being processed" :
                 activeTab === "complete" ? "Successfully processed invoices" : "Invoices that failed processing"}
              </p>
            </div>

            {/* Stats Cards - Only show when not on upload tab */}
            {activeTab !== "upload" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Processing</p>
                      <p className="text-2xl font-bold text-orange-600">{mockInvoices.processing.length}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <ProcessingIcon />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Complete</p>
                      <p className="text-2xl font-bold text-green-600">{mockInvoices.complete.length}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CompleteIcon />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{mockInvoices.failed.length}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <FailedIcon />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                {activeTab === "upload" && (
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      isDragOver
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <UploadIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Drag and drop your invoices here
                    </h3>
                    <p className="text-gray-500 mb-4">
                      or click to select files from your computer
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Select Files
                    </button>
                    <p className="text-xs text-gray-400 mt-3">
                      Supports PDF, JPG, JPEG, PNG files up to 10MB each
                    </p>
                  </div>
                )}

                {activeTab === "processing" && (
                  <div className="space-y-4">
                    {mockInvoices.processing.map((invoice) => (
                      <div key={invoice.id} className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <FileIcon />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{invoice.filename}</h3>
                          <p className="text-sm text-gray-500">
                            Uploaded {invoice.uploadedAt} • {invoice.size}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner />
                          <span className="text-sm text-orange-600 font-medium">Processing...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "complete" && (
                  <div className="space-y-4">
                    {mockInvoices.complete.map((invoice) => (
                      <div key={invoice.id} className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <FileIcon />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{invoice.filename}</h3>
                          <p className="text-sm text-gray-500">
                            Processed {invoice.processedAt} • {invoice.vendor}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{invoice.amount}</p>
                          <p className="text-sm text-green-600">Complete</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "failed" && (
                  <div className="space-y-4">
                    {mockInvoices.failed.map((invoice) => (
                      <div key={invoice.id} className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg border border-red-200">
                        <FileIcon />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{invoice.filename}</h3>
                          <p className="text-sm text-gray-500">
                            Failed {invoice.failedAt}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">{invoice.error}</p>
                          <button className="text-sm text-red-600 hover:underline">
                            Retry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab !== "upload" && mockInvoices[activeTab as keyof typeof mockInvoices].length === 0 && (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No invoices {activeTab}
                    </h3>
                    <p className="text-gray-500">
                      Invoices will appear here as they are {activeTab === "processing" ? "uploaded" : activeTab}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
