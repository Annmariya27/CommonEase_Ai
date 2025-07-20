import React, { useState, useEffect } from "react";
import { Document } from "@/entities/Document";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Sparkles,
  Upload,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, documentsData] = await Promise.all([
        User.me().catch(() => null),
        Document.list('-created_date', 10)
      ]);
      setUser(userData);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
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

  const completedDocs = documents.filter(doc => doc.processing_status === 'completed').length;
  const processingDocs = documents.filter(doc => doc.processing_status === 'processing').length;

  return (
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent mb-2">
                Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-xl text-slate-600 font-light">
                Simplify complex documents with AI-powered analysis
              </p>
            </div>
            <Link to={createPageUrl("Upload")}>
              <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2 px-8 py-6 text-lg">
                <Plus className="w-5 h-5" />
                Upload Document
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/50 shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-full -mr-6 -mt-6"></div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-700 text-base font-semibold">Total Documents</CardTitle>
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{documents.length}</div>
                <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>All time</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/50 shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full -mr-6 -mt-6"></div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-700 text-base font-semibold">Completed</CardTitle>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{completedDocs}</div>
                <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                  <Sparkles className="w-4 h-4" />
                  <span>Ready to review</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/50 shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full -mr-6 -mt-6"></div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-700 text-base font-semibold">Processing</CardTitle>
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{processingDocs}</div>
                <div className="flex items-center gap-1 mt-2 text-sm text-amber-600">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>AI analyzing...</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/60 backdrop-blur-xl border border-slate-200/50 shadow-xl">
            <CardHeader className="border-b border-slate-200/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900">Recent Documents</CardTitle>
                <Link to={createPageUrl("Library")}>
                  <Button variant="outline" className="text-sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No documents yet</h3>
                  <p className="text-slate-500 mb-6">Upload your first document to get started with AI-powered simplification</p>
                  <Link to={createPageUrl("Upload")}>
                    <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {documents.slice(0, 5).map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="group flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50/80 transition-all duration-200 cursor-pointer"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(doc.category)} rounded-xl flex items-center justify-center shadow-sm`}>
                        <span className="text-lg">{getCategoryIcon(doc.category)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {doc.category}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {new Date(doc.created_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.processing_status)}
                        <span className={`text-sm font-medium capitalize ${
                          doc.processing_status === 'completed' ? 'text-emerald-600' :
                          doc.processing_status === 'processing' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {doc.processing_status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { category: "legal", name: "Legal", icon: "⚖️", color: "from-red-500 to-pink-500" },
              { category: "medical", name: "Medical", icon: "🏥", color: "from-emerald-500 to-teal-500" },
              { category: "government", name: "Government", icon: "🏛️", color: "from-blue-500 to-indigo-500" },
              { category: "financial", name: "Financial", icon: "💰", color: "from-yellow-500 to-orange-500" },
              { category: "employment", name: "Employment", icon: "💼", color: "from-purple-500 to-violet-500" },
              { category: "academic", name: "Academic", icon: "📚", color: "from-cyan-500 to-blue-500" },
            ].map((item, index) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
              >
                <Link to={createPageUrl(`Upload?category=${item.category}`)}>
                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-xl border border-slate-200/50 hover:border-slate-300/60">
                    <CardContent className="p-6 text-center">
                      <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                        <span className="text-xl">{item.icon}</span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                        {item.name}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}