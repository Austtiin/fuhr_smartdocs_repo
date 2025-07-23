"use client";

import { useState, useRef, useEffect } from "react";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

// Azure Blob Storage configuration
const AZURE_STORAGE_ACCOUNT_NAME = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME || "";
const AZURE_STORAGE_SAS_TOKEN = process.env.NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN || "";
const CONTAINER_NAME = "rawinvoices"; // You can change this to your container name

type BlobInvoice = {
  name: string;
  lastModified: Date;
  size: number;
  url: string;
};

// Utility functions
function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} sec${diff !== 1 ? "s" : ""} ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? "s" : ""} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? "s" : ""} ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? "s" : ""} ago`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Custom hook for Azure Blob operations
const useAzureBlobInvoices = () => {
  const [blobs, setBlobs] = useState<BlobInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createBlobServiceClient = () => {
    if (AZURE_STORAGE_SAS_TOKEN && AZURE_STORAGE_ACCOUNT_NAME) {
      // Using SAS token (recommended for browser)
      const blobServiceClient = new BlobServiceClient(
        `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${AZURE_STORAGE_SAS_TOKEN}`
      );
      return blobServiceClient;
    }
    return null;
  };

  const fetchBlobs = async () => {
    if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
      setError("Azure Storage account name and SAS token not configured");
      setLoading(false);
      return;
    }

    const blobServiceClient = createBlobServiceClient();
    if (!blobServiceClient) {
      setError("Azure Storage credentials not configured. Please provide SAS token.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const containerClient: ContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      
      const blobItems: BlobInvoice[] = [];
      
      for await (const blob of containerClient.listBlobsFlat()) {
        const blobClient = containerClient.getBlobClient(blob.name);
        blobItems.push({
          name: blob.name,
          lastModified: blob.properties.lastModified || new Date(),
          size: blob.properties.contentLength || 0,
          url: blobClient.url,
        });
      }
      
      setBlobs(blobItems.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()));
    } catch (err) {
      console.error("Error fetching blobs:", err);
      setError("Failed to fetch invoices from Azure Storage. Check your credentials and container name.");
      setBlobs([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<boolean> => {
    if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
      setError("Azure Storage account name and SAS token not configured");
      return false;
    }

    const blobServiceClient = createBlobServiceClient();
    if (!blobServiceClient) {
      setError("Azure Storage credentials not configured. Please provide SAS token.");
      return false;
    }

    try {
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `${timestamp}-${file.name}`;
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      
      await blockBlobClient.uploadData(file, {
        blobHTTPHeaders: {
          blobContentType: file.type,
        },
      });
      
      // Refresh the blob list after upload
      await fetchBlobs();
      return true;
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(`Failed to upload ${file.name}. Check your Azure Storage permissions.`);
      return false;
    }
  };

  useEffect(() => {
    fetchBlobs();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchBlobs, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { blobs, loading, error, uploadFile, refetch: fetchBlobs };
};

export default function InvoiceProcessingApp() {
  const [activeTab, setActiveTab] = useState("processing");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Azure Blob Storage hook
  const { blobs, loading, error, uploadFile, refetch } = useAzureBlobInvoices();

  // Create dynamic invoice data based on Azure blobs
  const mockInvoices = {
    processing: blobs.map((blob, idx) => ({
      id: idx + 1,
      filename: blob.name,
      uploadedAt: timeAgo(blob.lastModified),
      size: formatSize(blob.size),
      url: blob.url,
    })),
    complete: [
      { id: 1001, filename: "INV-2024-002.pdf", processedAt: "1 hour ago", amount: "$1,245.99", vendor: "Acme Corp" },
      { id: 1002, filename: "Office-Supplies-Dec.pdf", processedAt: "2 hours ago", amount: "$89.50", vendor: "OfficeMax" },
      { id: 1003, filename: "Software-License-Q4.pdf", processedAt: "3 hours ago", amount: "$599.00", vendor: "Adobe Inc" },
      { id: 1004, filename: "Marketing-Services.pdf", processedAt: "1 day ago", amount: "$2,300.00", vendor: "Digital Agency" },
    ],
    failed: [
      { id: 2001, filename: "Corrupted-File.pdf", failedAt: "30 mins ago", error: "File corrupted" },
      { id: 2002, filename: "Low-Quality-Scan.pdf", failedAt: "1 hour ago", error: "Poor image quality" },
    ]
  };

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

  const handleFileUpload = async (files: File[]) => {
    setUploadProgress("Uploading files...");
    
    try {
      const uploadPromises = files.map(async (file) => {
        console.log(`Uploading file: ${file.name}, Size: ${file.size} bytes`);
        return await uploadFile(file);
      });
      
      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount === files.length) {
        setUploadProgress(`Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`);
      } else {
        setUploadProgress(`Uploaded ${successCount} of ${files.length} files`);
      }
      
      // Clear upload progress after 3 seconds
      setTimeout(() => setUploadProgress(null), 3000);
      
    } catch (err) {
      console.error("Error uploading files:", err);
      setUploadProgress("Failed to upload files");
      setTimeout(() => setUploadProgress(null), 3000);
    }
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {activeTab === "upload" ? "Upload Invoices" : 
                     activeTab === "processing" ? "Processing Invoices" :
                     activeTab === "complete" ? "Completed Invoices" : "Failed Invoices"}
                  </h1>
                  <p className="text-gray-600">
                    {activeTab === "upload" ? "Drag and drop or select files to upload to Azure Blob Storage" :
                     activeTab === "processing" ? "Invoices currently being processed from Azure Storage" :
                     activeTab === "complete" ? "Successfully processed invoices" : "Invoices that failed processing"}
                  </p>
                </div>
                {activeTab === "processing" && (
                  <button
                    onClick={refetch}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{loading ? "Refreshing..." : "Refresh"}</span>
                  </button>
                )}
              </div>
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
                {/* Error message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Upload progress */}
                {uploadProgress && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-600 text-sm">{uploadProgress}</p>
                  </div>
                )}

                {activeTab === "upload" && (
                  <>
                    {!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN ? (
                      <div className="border-2 border-dashed border-red-300 rounded-lg p-12 text-center bg-red-50">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-red-900 mb-2">
                          Azure Storage Not Configured
                        </h3>
                        <p className="text-red-700 mb-4">
                          Please configure your Azure Storage credentials in the .env.local file to enable file uploads.
                        </p>
                        <div className="bg-red-100 p-4 rounded-lg text-left text-sm text-red-800">
                          <p className="font-medium mb-2">Required configuration:</p>
                          <div className="space-y-2">
                            <div>
                              <p className="font-medium">SAS Token (Browser Compatible)</p>
                              <code className="block bg-red-200 p-2 rounded text-xs mt-1">
                                NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME=your_account_name<br/>
                                NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN=your_sas_token
                              </code>
                              <p className="text-xs mt-2 text-red-600">
                                Generate a SAS token with Container and Object permissions (Read, Write, List, Create)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
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
                          Files will be uploaded to Azure Blob Storage container: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{CONTAINER_NAME}</code>
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
                          disabled={uploadProgress !== null}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadProgress ? "Uploading..." : "Select Files"}
                        </button>
                        <p className="text-xs text-gray-400 mt-3">
                          Supports PDF, JPG, JPEG, PNG files up to 10MB each
                        </p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "processing" && (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                        <span className="ml-2 text-gray-500">Loading invoices...</span>
                      </div>
                    ) : mockInvoices.processing.length > 0 ? (
                      mockInvoices.processing.map((invoice) => (
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
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileIcon />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No invoices processing
                        </h3>
                        <p className="text-gray-500">
                          Upload invoices to see them appear here for processing.
                        </p>
                      </div>
                    )}
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
