import React, { useState, useEffect } from "react";
import { Document } from "@/entities/Document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  FileText, 
  ExternalLink, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DocumentPreview from "../Components/library/DocumentPreview.js";

export default function Library() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, selectedCategory, selectedStatus]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await Document.list('-created_date');
      setDocuments(data);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
    setIsLoading(false);
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.simplified_summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(doc => doc.processing_status === selectedStatus);
    }

    setFilteredDocuments(filtered);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      legal: "⚖️",
      medical: "🏥", 
      government: "🏛️",
      financial: "💰",
      employment: "💼",
      academic: "📚",
    };
    return icons[category] || "📄";
  };

  const getCategoryColor = (category) => {
    const colors = {
      legal: "from-red-500 to-pink-500",
      medical: "from-emerald-500 to-teal-500",
      government: "from-blue-500 to-indigo-500",
      financial: "from-yellow-500 to-orange-500",
      employment: "from-purple-500 to-violet-500",
      academic: "from-cyan-500 to-blue-500",
    };
    return colors[category] || "from-slate-500 to-gray-500";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    setShowPreview(true);
  };

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "legal", label: "Legal" },
    { value: "medical", label: "Medical" },
    { value: "government", label: "Government" },
    { value: "financial", label: "Financial" },
    { value: "employment", label: "Employment" },
    { value: "academic", label: "Academic" },
  ];

  const statuses = [
    { value: "all", label: "All Status" },
    { value: "completed", label: "Completed" },
    { value: "processing", label: "Processing" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent mb-2">
                  Document Library
                </h1>
                <p className="text-slate-600">
                  Manage and review your processed documents
                </p>
              </div>
              <Link to={createPageUrl("Upload")}>
                <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700">
                  Upload New Document
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-white/60 backdrop-blur-xl border border-slate-200/50 shadow-xl">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Documents Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="bg-white/60 backdrop-blur-xl border border-slate-200/50">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4"></div>
                        <div className="h-4 bg-slate-200 rounded mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3 mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-slate-200 rounded"></div>
                          <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No documents found</h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery || selectedCategory !== "all" || selectedStatus !== "all" 
                    ? "Try adjusting your filters" 
                    : "Upload your first document to get started"
                  }
                </p>
                <Link to={createPageUrl("Upload")}>
                  <Button className="bg-gradient-to-r from-indigo-600 to-blue-600">
                    Upload Document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="group cursor-pointer"
                      onClick={() => handleDocumentClick(doc)}
                    >
                      <Card className="bg-white/60 backdrop-blur-xl border border-slate-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(doc.category)} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                              <span className="text-xl">{getCategoryIcon(doc.category)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 truncate mb-1 group-hover:text-indigo-700 transition-colors">
                                {doc.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {doc.category}
                                </Badge>
                                {getStatusIcon(doc.processing_status)}
                              </div>
                            </div>
                          </div>
                          
                          {doc.simplified_summary && (
                            <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                              {doc.simplified_summary}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(doc.created_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.file_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(doc.file_url, '_blank');
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                              <Link to={createPageUrl(`Chat?document=${doc.id}`)} onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="p-1">
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        document={selectedDocument}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
}